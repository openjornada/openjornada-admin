"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from "react";
import { fetchEventSource } from "@microsoft/fetch-event-source";
import { apiClient, type RealtimeEvent, type NotificationItem } from "@/lib/api-client";
import { appConfig } from "@/lib/config";
import { useAuth } from "./AuthContext";

// Interval (ms) before reconnecting after a network error or a server-side close.
const RECONNECT_INTERVAL_MS = 5000;
// Wildcard event type: subscribers receive every event dispatched through the stream.
const WILDCARD = "*";
// Minimum interval between connect-triggered resync fan-outs (refreshNotifications
// + subscriber callbacks). fetch-event-source re-enters onopen on every retry, so
// a flapping connection would otherwise storm the API every few seconds. The very
// first open after mount always resyncs, so a reconnect after a real outage heals.
const RESYNC_MIN_GAP_MS = 30000;

type EventHandler = (event: RealtimeEvent) => void;

// Thrown from onopen on unrecoverable responses (401/403): rethrown by onerror so
// fetch-event-source stops retrying and the connect loop below exits.
class FatalSSEError extends Error {}

interface RealtimeContextType {
  subscribe: (type: string, handler: EventHandler) => () => void;
  subscribeConnection: (cb: () => void) => () => void;
  unreadCount: number;
  notifications: NotificationItem[];
  markRead: (ids: string[]) => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const subscribersRef = useRef<Map<string, Set<EventHandler>>>(new Map());
  const connectionSubsRef = useRef<Set<() => void>>(new Set());

  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  // Authoritative mirror of `notifications`, mutated synchronously on every write
  // (dispatch / refreshNotifications / markRead). React state updates are async,
  // so the dedupe check in dispatch must read this ref to stay correct even when
  // two frames arrive before the next render.
  const notificationsRef = useRef<NotificationItem[]>([]);

  const subscribe = useCallback((type: string, handler: EventHandler) => {
    const subs = subscribersRef.current;
    if (!subs.has(type)) subs.set(type, new Set());
    subs.get(type)!.add(handler);
    return () => {
      subs.get(type)?.delete(handler);
    };
  }, []);

  // Registers a callback fired on a successful stream (re)open (throttled, see
  // RESYNC_MIN_GAP_MS), so views can resync their own lists (events can be
  // dropped under bus backpressure).
  const subscribeConnection = useCallback((cb: () => void) => {
    const subs = connectionSubsRef.current;
    subs.add(cb);
    return () => {
      subs.delete(cb);
    };
  }, []);

  // Fan-out to type subscribers + wildcard and — for notification frames — prepend
  // a provisional item so the dropdown grows live without a refetch (the API data
  // returned by refreshNotifications on (re)connect stays the source of truth).
  // The unread badge is bumped ONLY for a genuinely new notification: non-notification
  // broadcasts (future change_request.*, etc. arriving via the wildcard) and
  // duplicate frames that the dedupe drops must never inflate it.
  const dispatch = useCallback((event: RealtimeEvent) => {
    const subs = subscribersRef.current;
    subs.get(event.type)?.forEach((handler) => handler(event));
    subs.get(WILDCARD)?.forEach((handler) => handler(event));

    if (event.notification_id) {
      const item: NotificationItem = {
        id: event.notification_id,
        type: event.type,
        company_id: event.company_id ?? "",
        payload: event.payload,
        target_role: null,
        read: false,
        created_at: event.created_at ?? new Date().toISOString(),
      };
      // Dedupe by id against the ref; cap matches the backend
      // NOTIFICATIONS_LIST_LIMIT (50).
      if (!notificationsRef.current.some((n) => n.id === item.id)) {
        const next = [item, ...notificationsRef.current].slice(0, 50);
        notificationsRef.current = next;
        setNotifications(next);
        setUnreadCount((count) => count + 1);
      }
    }
  }, []);

  // Re-synchronize unread counter + recent unread notifications from the API.
  const refreshNotifications = useCallback(async () => {
    try {
      const data = await apiClient.getNotifications({ unread: true });
      notificationsRef.current = data.items;
      setNotifications(data.items);
      setUnreadCount(data.unread_count);
    } catch (error) {
      console.error("Failed to resync notifications:", error);
    }
  }, []);

  const markRead = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;
    try {
      const { updated } = await apiClient.markNotificationsRead(ids);
      const next = notificationsRef.current.filter((n) => !ids.includes(n.id));
      notificationsRef.current = next;
      setNotifications(next);
      setUnreadCount((count) => Math.max(0, count - updated));
    } catch (error) {
      console.error("Failed to mark notifications as read:", error);
    }
  }, []);

  // Exactly ONE SSE connection for the whole app lifetime, gated on auth.
  // fetch-event-source retries transient errors via onerror; a clean server-side
  // close resolves the promise and we reconnect manually; a 401/403 or a missing
  // token (logout) stops the loop and the cleanup below tears the stream down.
  useEffect(() => {
    if (!isAuthenticated) return;

    let stopped = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    const controller = new AbortController();
    // Resync-throttle state, scoped to this effect run (reset per mount/re-auth).
    // Plain closure objects (not useRef) so they never leak across effect runs.
    const hasResyncedRef = { current: false };
    const lastResyncRef = { current: 0 };

    const connect = async () => {
      while (!stopped) {
        const token = apiClient.getToken();
        if (!token) return; // no credentials: never open (or keep) a stream
        try {
          await fetchEventSource(`${appConfig.apiUrl}/api/events/stream`, {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
            openWhenHidden: true, // keep the stream alive in background tabs
            onopen: async (response) => {
              if (response.status === 401 || response.status === 403) {
                // 403: role without stream access (tracker/inspector) — retrying
                // would loop forever, so treat it as fatal like 401.
                throw new FatalSSEError(`Realtime stream unauthorized (${response.status})`);
              }
              if (!response.ok) {
                throw new Error(`Realtime stream bad status ${response.status}`);
              }
              // (Re)connected: resync the unread counter so no drift survives a
              // cut — but throttled: the FIRST open after mount always resyncs,
              // later opens only if RESYNC_MIN_GAP_MS elapsed, so a flapping
              // connection can't storm the API with refetches.
              const now = Date.now();
              const isFirstOpen = !hasResyncedRef.current;
              if (isFirstOpen || now - lastResyncRef.current >= RESYNC_MIN_GAP_MS) {
                hasResyncedRef.current = true;
                lastResyncRef.current = now;
                void refreshNotifications();
                // Then let views refetch their own (filtered) lists.
                connectionSubsRef.current.forEach((cb) => cb());
              }
            },
            onmessage: (ev) => {
              if (!ev.data) return; // heartbeats are SSE comments, never messages
              try {
                dispatch(JSON.parse(ev.data) as RealtimeEvent);
              } catch {
                // ignore malformed frames
              }
            },
            onerror: (err) => {
              if (err instanceof FatalSSEError || !apiClient.getToken()) {
                throw err; // rethrowing stops fetch-event-source from retrying
              }
              return RECONNECT_INTERVAL_MS;
            },
          });
          // Promise resolved ⇒ server closed the stream: reconnect after a pause.
          if (stopped) return;
          await new Promise<void>((resolve) => {
            reconnectTimer = setTimeout(resolve, RECONNECT_INTERVAL_MS);
          });
        } catch (err) {
          if (!stopped) console.error("Realtime stream stopped:", err);
          return; // fatal error or unmount abort: stop for good
        }
      }
    };

    void connect();

    return () => {
      stopped = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      controller.abort();
    };
  }, [isAuthenticated, dispatch, refreshNotifications]);

  return (
    <RealtimeContext.Provider
      value={{ subscribe, subscribeConnection, unreadCount, notifications, markRead, refreshNotifications }}
    >
      {children}
    </RealtimeContext.Provider>
  );
}

function useRealtimeContext() {
  const context = useContext(RealtimeContext);
  if (context === undefined) {
    throw new Error("useRealtime must be used within a RealtimeProvider");
  }
  return context;
}

/**
 * Subscribe to realtime events of a given `type` (use "*" for every event).
 * The handler lives in a ref, so passing an inline callback never resubscribes;
 * the subscription is removed automatically on unmount.
 */
export function useRealtime(type: string, handler: EventHandler) {
  const { subscribe } = useRealtimeContext();
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    return subscribe(type, (event) => handlerRef.current(event));
  }, [type, subscribe]);
}

/**
 * Notification state backed by the same context: unread badge counter, most
 * recent unread notifications, and actions to refresh them or mark as read.
 */
export function useNotifications() {
  const { unreadCount, notifications, markRead, refreshNotifications } = useRealtimeContext();
  return { unreadCount, notifications, markRead, refreshNotifications };
}

/**
 * Run `cb` on a successful stream (re)open (list resync signal; throttled to at
 * most once per RESYNC_MIN_GAP_MS, always firing on the first open). The callback
 * lives in a ref, so passing an inline closure over fresh state never resubscribes;
 * the subscription is removed automatically on unmount.
 */
export function useRealtimeConnection(cb: () => void) {
  const { subscribeConnection } = useRealtimeContext();
  const ref = useRef(cb);

  useEffect(() => {
    ref.current = cb;
  }, [cb]);

  useEffect(() => subscribeConnection(() => ref.current()), [subscribeConnection]);
}
