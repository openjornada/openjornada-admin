import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, renderHook, act, cleanup } from "@testing-library/react";
import { fetchEventSource } from "@microsoft/fetch-event-source";
import { apiClient, type NotificationItem, type RealtimeEvent } from "@/lib/api-client";
import { RealtimeProvider, useRealtime, useRealtimeConnection, useNotifications } from "./RealtimeProvider";

// Mutable auth state consumed by the AuthContext mock below.
const authState = { isAuthenticated: true };

vi.mock("@microsoft/fetch-event-source", () => ({
  // The promise never resolves: the provider's connect loop stays suspended at
  // the await, so tests drive onopen/onmessage/onerror manually like a real stream.
  fetchEventSource: vi.fn(() => new Promise<void>(() => {})),
}));

vi.mock("@/lib/api-client", () => ({
  apiClient: {
    getToken: vi.fn(() => "test-token"),
    getNotifications: vi.fn(),
    markNotificationsRead: vi.fn(),
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => authState,
}));

interface CapturedOptions {
  headers?: Record<string, string>;
  onopen: (response: { ok: boolean; status: number }) => Promise<void>;
  onmessage: (ev: { data: string }) => void;
  onerror: (err: unknown) => number | undefined;
}

function lastOptions(): CapturedOptions {
  const calls = vi.mocked(fetchEventSource).mock.calls;
  expect(calls.length).toBeGreaterThan(0);
  return calls[calls.length - 1][1] as unknown as CapturedOptions;
}

function makeNotification(id: string): NotificationItem {
  return {
    id,
    type: "fichaje.created",
    company_id: "company-1",
    payload: {
      time_record_id: `record-${id}`,
      worker_name: "Ana López",
      record_type: "entry",
      timestamp: "2026-09-03T08:00:00.000Z",
      company_name: "ACME",
    },
    target_role: null,
    read: false,
    created_at: "2026-09-03T08:00:00.000Z",
  };
}

function wrapper({ children }: { children: React.ReactNode }) {
  return <RealtimeProvider>{children}</RealtimeProvider>;
}

beforeEach(() => {
  authState.isAuthenticated = true;
  vi.mocked(fetchEventSource).mockClear();
  vi.mocked(apiClient.getToken).mockClear();
  vi.mocked(apiClient.getNotifications).mockClear();
  vi.mocked(apiClient.markNotificationsRead).mockClear();
  vi.mocked(apiClient.getToken).mockReturnValue("test-token");
  vi.mocked(apiClient.getNotifications).mockResolvedValue({ items: [], unread_count: 0 });
  vi.mocked(apiClient.markNotificationsRead).mockResolvedValue({ updated: 0 });
});

afterEach(() => {
  cleanup();
});

describe("RealtimeProvider connection lifecycle", () => {
  it("opens exactly one authenticated stream shared by all subscribers", () => {
    renderHook(
      () => {
        useRealtime("fichaje.created", vi.fn());
        useRealtime("*", vi.fn());
        return useNotifications();
      },
      { wrapper }
    );

    expect(fetchEventSource).toHaveBeenCalledTimes(1);
    const [url, options] = vi.mocked(fetchEventSource).mock.calls[0];
    expect(String(url)).toContain("/api/events/stream");
    expect((options.headers as Record<string, string>).Authorization).toBe("Bearer test-token");
  });

  it("does not open a stream while unauthenticated", () => {
    authState.isAuthenticated = false;
    renderHook(() => useNotifications(), { wrapper });
    expect(fetchEventSource).not.toHaveBeenCalled();
  });

  it("resyncs the unread counter and notification list on (re)connect", async () => {
    vi.mocked(apiClient.getNotifications).mockResolvedValue({
      items: [makeNotification("n1")],
      unread_count: 1,
    });

    const { result } = renderHook(() => useNotifications(), { wrapper });

    await act(async () => {
      await lastOptions().onopen({ ok: true, status: 200 });
    });

    expect(apiClient.getNotifications).toHaveBeenCalledWith({ unread: true });
    expect(result.current.unreadCount).toBe(1);
    expect(result.current.notifications).toHaveLength(1);
  });

  it("stops the stream on 401/403 and on missing token, retries otherwise", async () => {
    renderHook(() => useNotifications(), { wrapper });
    const options = lastOptions();

    await expect(options.onopen({ ok: false, status: 401 })).rejects.toThrow();
    // 403 (role without stream access, e.g. tracker/inspector) is fatal too:
    // no retry is scheduled, same as 401.
    await expect(options.onopen({ ok: false, status: 403 })).rejects.toThrow();

    // Transient error with a token present → fetch-event-source retries after the
    // interval returned by onerror.
    expect(options.onerror(new Error("network down"))).toBe(5000);

    // Token gone (logout) → onerror rethrows, which stops the retry loop.
    vi.mocked(apiClient.getToken).mockReturnValue(null);
    expect(() => options.onerror(new Error("network down"))).toThrow("network down");
  });
});

describe("useRealtime dispatch", () => {
  it("routes events by type and wildcard without touching badge or list for non-notification frames", async () => {
    vi.mocked(apiClient.getNotifications).mockResolvedValue({ items: [], unread_count: 3 });
    const fichajeHandler = vi.fn();
    const wildcardHandler = vi.fn();
    const otherHandler = vi.fn();

    const { result } = renderHook(
      () => {
        useRealtime("fichaje.created", fichajeHandler);
        useRealtime("*", wildcardHandler);
        useRealtime("otra.cos", otherHandler);
        return useNotifications();
      },
      { wrapper }
    );

    await act(async () => {
      await lastOptions().onopen({ ok: true, status: 200 });
    });
    expect(result.current.unreadCount).toBe(3); // resynced from API

    const event: RealtimeEvent = { type: "fichaje.created", payload: { time_record_id: "r1" } };
    act(() => {
      lastOptions().onmessage({ data: JSON.stringify(event) });
    });

    expect(fichajeHandler).toHaveBeenCalledWith(event);
    expect(wildcardHandler).toHaveBeenCalledWith(event);
    expect(otherHandler).not.toHaveBeenCalled();
    // Broadcast frames without a notification_id must NOT inflate the badge:
    // only genuinely new notifications bump it.
    expect(result.current.unreadCount).toBe(3);

    // Malformed frames are ignored and must not crash the tab.
    act(() => {
      lastOptions().onmessage({ data: "not-json" });
    });
    expect(result.current.unreadCount).toBe(3);
    // Non-notification frames never touch the list.
    expect(result.current.notifications).toHaveLength(0);
  });

  it("prepends an enriched notification live, deduped, without a refetch", async () => {
    const { result } = renderHook(() => useNotifications(), { wrapper });

    await act(async () => {
      await lastOptions().onopen({ ok: true, status: 200 });
    });
    expect(apiClient.getNotifications).toHaveBeenCalledTimes(1);

    // Enriched SSE contract: notification_id/company_id/created_at are top-level.
    const event: RealtimeEvent = {
      type: "fichaje.created",
      payload: { time_record_id: "r1" },
      notification_id: "n-live",
      company_id: "company-1",
      created_at: "2026-09-03T08:00:00.000Z",
    };
    act(() => {
      lastOptions().onmessage({ data: JSON.stringify(event) });
    });

    // Badge bumps AND the dropdown gains the item with no extra fetch.
    expect(result.current.unreadCount).toBe(1);
    expect(result.current.notifications).toHaveLength(1);
    const item = result.current.notifications[0];
    expect(item).toMatchObject({
      id: "n-live",
      type: "fichaje.created",
      company_id: "company-1",
      payload: { time_record_id: "r1" },
      target_role: null,
      read: false,
      created_at: "2026-09-03T08:00:00.000Z",
    });
    expect(apiClient.getNotifications).toHaveBeenCalledTimes(1);

    // A duplicate frame for the same notification_id neither duplicates the row
    // nor double-bumps the badge (the increment is tied to the dedupe).
    act(() => {
      lastOptions().onmessage({ data: JSON.stringify(event) });
    });
    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.unreadCount).toBe(1);
  });

  it("unsubscribes on unmount without tearing down the provider", async () => {
    const handler = vi.fn();

    function Child() {
      useRealtime("fichaje.created", handler);
      return null;
    }
    function App({ showChild }: { showChild: boolean }) {
      return (
        <RealtimeProvider>{showChild ? <Child /> : <p data-testid="empty">sin hijo</p>}</RealtimeProvider>
      );
    }

    const { rerender, getByTestId } = render(<App showChild />);
    await act(async () => {
      await lastOptions().onopen({ ok: true, status: 200 });
    });

    rerender(<App showChild={false} />);
    act(() => {
      lastOptions().onmessage({
        data: JSON.stringify({ type: "fichaje.created", payload: {} }),
      });
    });

    expect(handler).not.toHaveBeenCalled();
    expect(getByTestId("empty")).toBeInTheDocument();
  });
});

describe("useNotifications markRead", () => {
  it("calls the API, drops the read items and lowers the badge", async () => {
    vi.mocked(apiClient.getNotifications).mockResolvedValue({
      items: [makeNotification("n1"), makeNotification("n2")],
      unread_count: 2,
    });
    vi.mocked(apiClient.markNotificationsRead).mockResolvedValue({ updated: 2 });

    const { result } = renderHook(() => useNotifications(), { wrapper });

    await act(async () => {
      await lastOptions().onopen({ ok: true, status: 200 });
    });
    expect(result.current.notifications).toHaveLength(2);

    await act(async () => {
      await result.current.markRead(["n1", "n2"]);
    });

    expect(apiClient.markNotificationsRead).toHaveBeenCalledWith(["n1", "n2"]);
    expect(result.current.notifications).toHaveLength(0);
    expect(result.current.unreadCount).toBe(0);
  });

  it("is a no-op for an empty id list", async () => {
    const { result } = renderHook(() => useNotifications(), { wrapper });
    await act(async () => {
      await result.current.markRead([]);
    });
    expect(apiClient.markNotificationsRead).not.toHaveBeenCalled();
  });
});

describe("useRealtimeConnection", () => {
  it("fires the resync fan-out on the first open and throttles rapid reconnects", async () => {
    const onOpen = vi.fn();
    renderHook(() => useRealtimeConnection(onOpen), { wrapper });

    // First open after mount always resyncs (heals state after a real outage).
    const t0 = Date.now();
    await act(async () => {
      await lastOptions().onopen({ ok: true, status: 200 });
    });
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(apiClient.getNotifications).toHaveBeenCalledTimes(1);

    // Flapping connection: fetch-event-source retries re-enter onopen almost
    // immediately; within RESYNC_MIN_GAP_MS the fan-out must NOT run again.
    await act(async () => {
      await lastOptions().onopen({ ok: true, status: 200 });
    });
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(apiClient.getNotifications).toHaveBeenCalledTimes(1);

    // Once the minimum gap has elapsed, the next open resyncs again.
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(t0 + 31_000);
    try {
      await act(async () => {
        await lastOptions().onopen({ ok: true, status: 200 });
      });
    } finally {
      nowSpy.mockRestore();
    }
    expect(onOpen).toHaveBeenCalledTimes(2);
    expect(apiClient.getNotifications).toHaveBeenCalledTimes(2);
  });

  it("does not fire on failed opens and unsubscribes on unmount", async () => {
    const onOpen = vi.fn();
    const { unmount } = renderHook(() => useRealtimeConnection(onOpen), { wrapper });

    await expect(lastOptions().onopen({ ok: false, status: 500 })).rejects.toThrow();
    await expect(lastOptions().onopen({ ok: false, status: 403 })).rejects.toThrow();
    expect(onOpen).not.toHaveBeenCalled();

    unmount();
    await act(async () => {
      await lastOptions().onopen({ ok: true, status: 200 });
    });
    expect(onOpen).not.toHaveBeenCalled();
  });
});
