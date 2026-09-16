import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within, cleanup, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import * as XLSX from "xlsx";
import es from "../../../messages/es.json";
import { apiClient, type APIUser, type TimeRecord, type RealtimeEvent } from "@/lib/api-client";
import { formatToLocalTime, getBrowserTimezone } from "@/utils/dateFormatters";
import TimeRecordsPage from "./page";

// ---------------------------------------------------------------------------
// Minimal seams. The DATA layer (api-client), the app chrome context hooks and
// the file-writing xlsx module are mocked; the column logic and the page under
// test are the real ones. Real messages/es.json is used so any key/typo in the
// new `timeRecords.columns*` entries surfaces here.
// ---------------------------------------------------------------------------

// Mutable auth state consumed by the AuthContext mock. `user` drives the
// per-admin localStorage scoping under test.
const authState: { user: APIUser | null; loading: boolean } = {
  user: null,
  loading: false,
};

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: authState.user,
    loading: authState.loading,
    isAuthenticated: !!authState.user,
    login: vi.fn(),
    logout: vi.fn(),
    updateLanguage: vi.fn(),
  }),
}));

// The page only needs the realtime hooks as subscriptions; TopNav (inside
// AppWrapper) needs useNotifications. `useRealtime` mirrors the real hook's
// ref + effect lifecycle and registers the handler in the map below, so tests
// can dispatch frames through the page's real subscriber path.
const realtimeHandlers = new Map<string, Set<(event: RealtimeEvent) => void>>();

vi.mock("@/contexts/RealtimeProvider", async () => {
  const { useEffect, useRef } = await import("react");
  return {
    useRealtime: (type: string, handler: (event: RealtimeEvent) => void) => {
      const handlerRef = useRef(handler);
      useEffect(() => {
        handlerRef.current = handler;
      }, [handler]);
      useEffect(() => {
        const wrapped = (event: RealtimeEvent) => handlerRef.current(event);
        const subscribers =
          realtimeHandlers.get(type) ?? new Set<(event: RealtimeEvent) => void>();
        realtimeHandlers.set(type, subscribers);
        subscribers.add(wrapped);
        return () => {
          subscribers.delete(wrapped);
        };
      }, [type]);
    },
    // Inert: the connection resync would trigger extra refetches in these tests.
    useRealtimeConnection: () => {},
    useNotifications: () => ({
      unreadCount: 0,
      notifications: [],
      markRead: vi.fn(),
      refreshNotifications: vi.fn(),
    }),
  };
});

/** Delivers a frame to every live subscriber of its type, like the provider does. */
function dispatchRealtime(event: RealtimeEvent) {
  act(() => {
    realtimeHandlers.get(event.type)?.forEach((handler) => handler(event));
  });
}

const routerMock = {
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  prefetch: vi.fn(),
};

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
  usePathname: () => "/time-records",
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/api-client", () => ({
  apiClient: {
    getToken: vi.fn(() => "test-token"),
    getTimeRecords: vi.fn(),
    getCompanies: vi.fn(),
    getWorkCenters: vi.fn(),
    getSubscriptionStatus: vi.fn(),
    getNotifications: vi.fn(),
    markNotificationsRead: vi.fn(),
  },
}));

// Never touch the filesystem: capture the array-of-rows handed to the sheet
// builder (the page uses XLSX.utils.json_to_sheet, one object per record keyed
// by the translated column labels).
vi.mock("xlsx", () => ({
  utils: {
    json_to_sheet: vi.fn(() => ({ __sheet: true })),
    book_new: vi.fn(() => ({ __workbook: true })),
    book_append_sheet: vi.fn(),
  },
  writeFile: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ADMIN_A: APIUser = {
  id: "admin-A",
  username: "admin-a",
  email: "a@example.com",
  role: "admin",
  is_active: true,
};
const ADMIN_B: APIUser = {
  id: "admin-B",
  username: "admin-b",
  email: "b@example.com",
  role: "admin",
  is_active: true,
};

const KEY_A = "time-records-visible-columns:admin-A";
const KEY_B = "time-records-visible-columns:admin-B";

// Every column in `TIME_RECORD_COLUMNS` order (DNI first, totals last).
const ALL_LABELS = [
  "DNI",
  "Trabajador",
  "Empresa",
  "Centro",
  "Tipo",
  "Detalle",
  "Fecha y Hora",
  "Duración",
  "Total diario",
  "Total semanal",
  "Total mensual",
];

// The 7 columns that existed before the change: DNI and the totals start hidden.
const DEFAULT_LABELS = ALL_LABELS.slice(1, 8);
const TOTAL_LABELS = ALL_LABELS.slice(8);

function makeRecord(overrides: Partial<TimeRecord> = {}): TimeRecord {
  return {
    id: "rec-1",
    worker_id: "worker-1",
    worker_name: "Ana López",
    worker_id_number: "12345678A",
    record_type: "exit",
    timestamp: "2026-09-16T08:00:00.000Z",
    duration_minutes: 60,
    company_id: "company-1",
    company_name: "ACME",
    work_center_id: "wc-1",
    work_center_name: "Centro Norte",
    ...overrides,
  };
}

const RECORD_WITH_TOTALS = makeRecord({
  id: "rec-1",
  daily_total_minutes: 125,
  weekly_total_minutes: 600,
  monthly_total_minutes: 2400,
});

const RECORD_WITHOUT_TOTALS = makeRecord({
  id: "rec-2",
  worker_name: "Luis Pérez",
  record_type: "entry",
  timestamp: "2026-09-16T09:15:00.000Z",
  duration_minutes: 30,
  company_name: "Beta SL",
  work_center_id: "wc-2",
  work_center_name: "Centro Sur",
});

function mountPage(user: APIUser) {
  authState.user = user;
  return render(
    <NextIntlClientProvider locale="es" messages={es}>
      <TimeRecordsPage />
    </NextIntlClientProvider>
  );
}

/** Mount and wait until the records table has rendered. */
async function renderPage(user: APIUser) {
  const view = mountPage(user);
  await screen.findByRole("table");
  return view;
}

/** Header labels in DOM order (scoped to the table, not the modal/filters). */
function headerLabels(): string[] {
  const table = screen.getByRole("table");
  return within(table)
    .getAllByRole("columnheader")
    .map((th) => th.textContent ?? "");
}

/** Text of every cell in the n-th body row, in DOM order. */
function bodyRowCells(rowIndex: number): string[] {
  const table = screen.getByRole("table");
  const rows = Array.from(table.querySelectorAll("tbody tr"));
  return Array.from(rows[rowIndex].querySelectorAll("td")).map((td) => td.textContent ?? "");
}

async function openColumnsModal(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Columnas" }));
  return screen.getByRole("dialog");
}

/** Opens the columns modal and makes the three totals columns visible. */
async function showTotalsColumns(user: ReturnType<typeof userEvent.setup>) {
  const dialog = await openColumnsModal(user);
  await user.click(within(dialog).getByRole("checkbox", { name: "Total diario" }));
  await user.click(within(dialog).getByRole("checkbox", { name: "Total semanal" }));
  await user.click(within(dialog).getByRole("checkbox", { name: "Total mensual" }));
  await user.click(within(dialog).getByRole("button", { name: "Cerrar" }));
  expect(headerLabels()).toEqual([...DEFAULT_LABELS, ...TOTAL_LABELS]);
}

/**
 * Payload timestamp whose LOCAL date lands inside the default filter (month
 * start → today), so the live row is not dropped by the date comparison.
 */
const LIVE_TIMESTAMP = new Date().toISOString();

/** A "fichaje.created" frame for an exit of the given worker. */
function liveExitPayload(overrides: Record<string, unknown> = {}) {
  return {
    time_record_id: "live-1",
    worker_id: "worker-9",
    worker_name: "Nuevo Trabajador",
    record_type: "exit",
    timestamp: LIVE_TIMESTAMP,
    duration_minutes: 30,
    company_id: "company-1",
    company_name: "ACME",
    work_center_id: "wc-1",
    work_center_name: "Centro Norte",
    ...overrides,
  };
}

beforeEach(() => {
  localStorage.clear();
  realtimeHandlers.clear();
  vi.clearAllMocks();
  authState.user = null;
  authState.loading = false;

  vi.mocked(apiClient.getTimeRecords).mockResolvedValue([
    RECORD_WITH_TOTALS,
    RECORD_WITHOUT_TOTALS,
  ]);
  vi.mocked(apiClient.getCompanies).mockResolvedValue([
    {
      id: "company-1",
      name: "ACME",
      created_at: "2026-01-01T00:00:00.000Z",
      absence_management_enabled: false,
    },
  ]);
  vi.mocked(apiClient.getWorkCenters).mockResolvedValue([
    {
      id: "wc-1",
      name: "Centro Norte",
      code: null,
      address: null,
      company_id: "company-1",
      company_name: "ACME",
      created_at: "2026-01-01T00:00:00.000Z",
    },
  ]);
  vi.mocked(apiClient.getSubscriptionStatus).mockResolvedValue({ enabled: false });
  vi.mocked(apiClient.getNotifications).mockResolvedValue({ items: [], unread_count: 0 });
  vi.mocked(apiClient.markNotificationsRead).mockResolvedValue({ updated: 0 });
  vi.mocked(apiClient.getToken).mockReturnValue("test-token");
});

afterEach(() => {
  cleanup();
});

// ---------------------------------------------------------------------------
// 1. Hide/show interaction
// ---------------------------------------------------------------------------

describe("column visibility toggling", () => {
  it("starts with the 7 default columns and toggling a checkbox adds/removes header and cells live", async () => {
    const user = userEvent.setup();
    await renderPage(ADMIN_A);

    expect(headerLabels()).toEqual(DEFAULT_LABELS);
    // Totals columns are hidden by default: their values must not be in the table.
    expect(within(screen.getByRole("table")).queryByText("2h 5m")).toBeNull();

    const dialog = await openColumnsModal(user);

    // Enable "Total diario": the table updates immediately, modal stays open.
    await user.click(within(dialog).getByRole("checkbox", { name: "Total diario" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(headerLabels()).toEqual([...DEFAULT_LABELS, "Total diario"]);
    expect(within(screen.getByRole("table")).getByText("2h 5m")).toBeInTheDocument();

    // Disable "Trabajador": header and cell disappear.
    await user.click(within(dialog).getByRole("checkbox", { name: "Trabajador" }));
    expect(headerLabels()).not.toContain("Trabajador");
    expect(within(screen.getByRole("table")).queryByText("Ana López")).toBeNull();

    // Re-enable it: it comes back.
    await user.click(within(dialog).getByRole("checkbox", { name: "Trabajador" }));
    expect(headerLabels()).toContain("Trabajador");
    expect(within(screen.getByRole("table")).getByText("Ana López")).toBeInTheDocument();
  });

  it("keeps DNI hidden by default but lets the admin show it as the first column", async () => {
    const user = userEvent.setup();
    await renderPage(ADMIN_A);

    expect(headerLabels()).toEqual(DEFAULT_LABELS);
    expect(screen.queryByText("12345678A")).toBeNull();

    const dialog = await openColumnsModal(user);
    const dni = within(dialog).getByRole("checkbox", { name: "DNI" });
    expect(dni).not.toBeChecked();

    await user.click(dni);
    expect(headerLabels()).toEqual(["DNI", ...DEFAULT_LABELS]);
    expect(within(screen.getByRole("table")).getAllByText("12345678A")).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// 2. Reload persistence + per-admin isolation
// ---------------------------------------------------------------------------

describe("persistence", () => {
  it("persists the toggled set for the user and restores it on a fresh mount", async () => {
    const user = userEvent.setup();
    const first = await renderPage(ADMIN_A);

    const dialog = await openColumnsModal(user);
    await user.click(within(dialog).getByRole("checkbox", { name: "Total diario" }));

    expect(JSON.parse(localStorage.getItem(KEY_A) as string)).toMatchObject({
      worker: true,
      dailyTotal: true,
    });

    first.unmount();

    // Fresh mount == reload.
    await renderPage(ADMIN_A);
    expect(headerLabels()).toEqual([...DEFAULT_LABELS, "Total diario"]);
  });

  it("keeps two admins' selections independent in the same browser", async () => {
    const user = userEvent.setup();

    // Admin A enables the daily total.
    const a1 = await renderPage(ADMIN_A);
    await user.click(
      within(await openColumnsModal(user)).getByRole("checkbox", { name: "Total diario" })
    );
    a1.unmount();

    // Admin B starts clean (no daily total) and enables the monthly total.
    await renderPage(ADMIN_B);
    expect(headerLabels()).toEqual(DEFAULT_LABELS);
    await user.click(
      within(await openColumnsModal(user)).getByRole("checkbox", { name: "Total mensual" })
    );
    expect(headerLabels()).toEqual([...DEFAULT_LABELS, "Total mensual"]);
    expect(JSON.parse(localStorage.getItem(KEY_A) as string)).toMatchObject({ dailyTotal: true });
    expect(JSON.parse(localStorage.getItem(KEY_B) as string)).toMatchObject({ monthlyTotal: true });

    cleanup();

    // Back to A: A sees its own selection, untouched by B.
    await renderPage(ADMIN_A);
    expect(headerLabels()).toEqual([...DEFAULT_LABELS, "Total diario"]);
    expect(headerLabels()).not.toContain("Total mensual");
  });
});

// ---------------------------------------------------------------------------
// 3. Excel export ignores visibility
// ---------------------------------------------------------------------------

describe("Excel export", () => {
  it("exports all 11 columns in order even with DNI and the totals hidden", async () => {
    const user = userEvent.setup();
    await renderPage(ADMIN_A);

    // Precondition: DNI and the totals are hidden on screen.
    expect(headerLabels()).toEqual(DEFAULT_LABELS);

    await user.click(screen.getByRole("button", { name: /Exportar a Excel/ }));

    await waitFor(() => expect(vi.mocked(XLSX.writeFile)).toHaveBeenCalledTimes(1));

    const rows = vi.mocked(XLSX.utils.json_to_sheet).mock.calls[0][0] as Record<string, string>[];
    expect(rows).toHaveLength(2);

    // Header row = key order of the exported objects, DNI first.
    expect(Object.keys(rows[0])).toEqual(ALL_LABELS);

    // Data row A: every column present, hidden DNI and totals included.
    expect(rows[0]).toEqual({
      DNI: "12345678A",
      Trabajador: "Ana López",
      Empresa: "ACME",
      Centro: "Centro Norte",
      Tipo: "Salida",
      Detalle: "-",
      "Fecha y Hora": formatToLocalTime(RECORD_WITH_TOTALS.timestamp),
      Duración: "1h 0m",
      "Total diario": "2h 5m",
      "Total semanal": "10h 0m",
      "Total mensual": "40h 0m",
    });

    // Data row B: absent totals export as "-".
    expect(rows[1]).toMatchObject({
      DNI: "12345678A",
      Trabajador: "Luis Pérez",
      "Total diario": "-",
      "Total semanal": "-",
      "Total mensual": "-",
    });
  });
});

// ---------------------------------------------------------------------------
// 4. Modal behavior
// ---------------------------------------------------------------------------

describe("columns modal", () => {
  it("opens, focuses, renders one checkbox per column and closes via Escape, backdrop and button", async () => {
    const user = userEvent.setup();
    await renderPage(ADMIN_A);

    expect(screen.queryByRole("dialog")).toBeNull();

    let dialog = await openColumnsModal(user);
    expect(within(dialog).getByText("Columnas visibles")).toBeInTheDocument();

    // Focus lands inside the modal (ref effect).
    expect(dialog).toHaveFocus();

    // One checkbox per column, defaults reflected.
    const boxes = within(dialog).getAllByRole("checkbox");
    expect(boxes).toHaveLength(11);
    expect(within(dialog).getByRole("checkbox", { name: "Trabajador" })).toBeChecked();
    expect(within(dialog).getByRole("checkbox", { name: "DNI" })).not.toBeChecked();
    expect(within(dialog).getByRole("checkbox", { name: "Total diario" })).not.toBeChecked();
    expect(within(dialog).getByRole("checkbox", { name: "Total mensual" })).not.toBeChecked();

    // Escape closes.
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();

    // Backdrop (overlay, parent of the dialog) closes.
    dialog = await openColumnsModal(user);
    await user.click(dialog.parentElement as HTMLElement);
    expect(screen.queryByRole("dialog")).toBeNull();

    // Close button (common.close) closes.
    dialog = await openColumnsModal(user);
    await user.click(within(dialog).getByRole("button", { name: "Cerrar" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 5. Totals rendering via formatDuration
// ---------------------------------------------------------------------------

describe("totals cells", () => {
  it("renders daily/weekly/monthly totals through formatDuration and '-' when absent", async () => {
    const user = userEvent.setup();
    await renderPage(ADMIN_A);

    const dialog = await openColumnsModal(user);
    await user.click(within(dialog).getByRole("checkbox", { name: "Total diario" }));
    await user.click(within(dialog).getByRole("checkbox", { name: "Total semanal" }));
    await user.click(within(dialog).getByRole("checkbox", { name: "Total mensual" }));

    await user.click(within(dialog).getByRole("button", { name: "Cerrar" }));

    // DNI stays hidden; the 7 defaults plus the 3 totals are shown.
    expect(headerLabels()).toEqual([...DEFAULT_LABELS, ...TOTAL_LABELS]);

    // 125 -> "2h 5m", 600 -> "10h 0m", 2400 -> "40h 0m".
    expect(bodyRowCells(0)).toEqual([
      "Ana López",
      "ACME",
      "Centro Norte",
      "Salida",
      "-",
      formatToLocalTime(RECORD_WITH_TOTALS.timestamp),
      "1h 0m",
      "2h 5m",
      "10h 0m",
      "40h 0m",
    ]);

    // Record without totals: the three totals cells render "-".
    expect(bodyRowCells(1).slice(7)).toEqual(["-", "-", "-"]);
  });
});

// ---------------------------------------------------------------------------
// 6. Timezone sent to the listing API
// ---------------------------------------------------------------------------

describe("listing timezone", () => {
  it("sends the browser timezone on the initial load", async () => {
    await renderPage(ADMIN_A);

    expect(apiClient.getTimeRecords).toHaveBeenCalledWith(
      expect.objectContaining({ timezone: getBrowserTimezone() })
    );
  });

  it("sends the browser timezone when filtering and when clearing the filters", async () => {
    const user = userEvent.setup();
    await renderPage(ADMIN_A);

    await user.click(screen.getByRole("button", { name: "Filtrar" }));
    await waitFor(() =>
      expect(apiClient.getTimeRecords).toHaveBeenCalledWith(
        expect.objectContaining({ timezone: getBrowserTimezone() })
      )
    );

    await user.click(screen.getByRole("button", { name: "Limpiar" }));
    await waitFor(() => expect(apiClient.getTimeRecords).toHaveBeenCalledTimes(3));

    for (const [params] of vi.mocked(apiClient.getTimeRecords).mock.calls) {
      expect(params).toMatchObject({ timezone: getBrowserTimezone() });
    }
  });
});

// ---------------------------------------------------------------------------
// 7. Live insert on "fichaje.created" (no refetch)
// ---------------------------------------------------------------------------

describe("live insert on fichaje.created", () => {
  it("inserts the exit row on top showing the totals carried by the payload", async () => {
    const user = userEvent.setup();
    await renderPage(ADMIN_A);
    await showTotalsColumns(user);

    dispatchRealtime({
      type: "fichaje.created",
      payload: liveExitPayload({
        daily_total_minutes: 125,
        weekly_total_minutes: 600,
        monthly_total_minutes: 2400,
      }),
    });

    // Prepended, still without a refetch.
    expect(screen.getByRole("table").querySelectorAll("tbody tr")).toHaveLength(3);
    expect(apiClient.getTimeRecords).toHaveBeenCalledTimes(1);

    // worker, company, center, type, detail, dateTime, duration + the 3 totals.
    expect(bodyRowCells(0)).toEqual([
      "Nuevo Trabajador",
      "ACME",
      "Centro Norte",
      "Salida",
      "-",
      formatToLocalTime(LIVE_TIMESTAMP),
      "0h 30m",
      "2h 5m",
      "10h 0m",
      "40h 0m",
    ]);
  });

  it("keeps '-' in the three totals for a legacy frame without them (no crash)", async () => {
    const user = userEvent.setup();
    await renderPage(ADMIN_A);
    await showTotalsColumns(user);

    // Older frames carry no totals: they must stay undefined, not default to 0.
    dispatchRealtime({ type: "fichaje.created", payload: liveExitPayload() });

    expect(screen.getByRole("table").querySelectorAll("tbody tr")).toHaveLength(3);
    const cells = bodyRowCells(0);
    expect(cells[0]).toBe("Nuevo Trabajador");
    expect(cells.slice(-3)).toEqual(["-", "-", "-"]);
  });
});
