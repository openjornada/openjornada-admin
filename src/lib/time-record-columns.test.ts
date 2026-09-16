import { describe, it, expect } from "vitest";
import es from "../../messages/es.json";
import type { TimeRecord } from "./api-client";
import {
  buildTimeRecordColumns,
  defaultVisibleColumnKeys,
  resolveVisibleColumnKeys,
  serializeVisibleColumnKeys,
  visibleColumnsStorageKey,
  type ColumnHelpers,
  type TimeRecordColumnKey,
} from "./time-record-columns";

const ES_TIME_RECORDS = es.timeRecords as unknown as Record<string, string>;
const ES_COMMON = es.common as unknown as Record<string, string | Record<string, string>>;

const helpers: ColumnHelpers = {
  t: (key) => ES_TIME_RECORDS[key],
  tc: (key) => ES_COMMON[key] as string,
  getRecordTypeLabel: (type) => type.toUpperCase(),
  formatDuration: (minutes) =>
    !minutes ? "-" : `${Math.floor(minutes / 60)}h ${Math.floor(minutes % 60)}m`,
};

const COLUMN_ORDER: TimeRecordColumnKey[] = [
  "dni",
  "worker",
  "company",
  "center",
  "type",
  "detail",
  "dateTime",
  "duration",
  "dailyTotal",
  "weeklyTotal",
  "monthlyTotal",
];

const EXPECTED_LABELS = [
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

function makeRecord(overrides: Partial<TimeRecord> = {}): TimeRecord {
  return {
    id: "rec-1",
    worker_id: "worker-1",
    worker_name: "Ana López",
    worker_id_number: "12345678A",
    record_type: "exit",
    timestamp: "2026-09-16T08:00:00.000Z",
    duration_minutes: 60,
    work_center_id: null,
    work_center_name: null,
    ...overrides,
  };
}

describe("buildTimeRecordColumns", () => {
  it("produces all 11 columns in the exact required order", () => {
    const columns = buildTimeRecordColumns(helpers);
    expect(columns).toHaveLength(11);
    expect(columns.map((column) => column.key)).toEqual(COLUMN_ORDER);
  });

  it("derives table and Excel headers from the same translated labels", () => {
    const columns = buildTimeRecordColumns(helpers);
    expect(columns.map((column) => column.label)).toEqual(EXPECTED_LABELS);
  });

  it("marks only the 7 original columns as visible by default", () => {
    const columns = buildTimeRecordColumns(helpers);
    expect(columns.filter((column) => column.defaultVisible).map((column) => column.key)).toEqual([
      "worker",
      "company",
      "center",
      "type",
      "detail",
      "dateTime",
      "duration",
    ]);
    // DNI ships hidden (the table never showed it) but is selectable.
    expect(columns.find((column) => column.key === "dni")?.defaultVisible).toBe(false);
  });

  it("exports the DNI as the raw worker id number", () => {
    const columns = buildTimeRecordColumns(helpers);
    const dni = columns.find((column) => column.key === "dni");
    expect(dni?.exportValue(makeRecord())).toBe("12345678A");
    // Realtime-inserted rows have no id number: export stays byte-compatible
    // with the pre-refactor export (empty string, not a placeholder).
    expect(dni?.exportValue(makeRecord({ worker_id_number: "" }))).toBe("");
  });

  it("exports the totals, rendering missing values as '-'", () => {
    const columns = buildTimeRecordColumns(helpers);
    const byKey = new Map(columns.map((column) => [column.key, column]));
    const withTotals = makeRecord({
      daily_total_minutes: 125,
      weekly_total_minutes: 600,
      monthly_total_minutes: 2400,
    });

    expect(byKey.get("dailyTotal")?.exportValue(withTotals)).toBe("2h 5m");
    expect(byKey.get("weeklyTotal")?.exportValue(withTotals)).toBe("10h 0m");
    expect(byKey.get("monthlyTotal")?.exportValue(withTotals)).toBe("40h 0m");
    // e.g. realtime-inserted rows have no totals yet
    expect(byKey.get("dailyTotal")?.exportValue(makeRecord())).toBe("-");
  });
});

describe("defaultVisibleColumnKeys", () => {
  it("returns exactly the 7 original columns", () => {
    const visible = defaultVisibleColumnKeys();
    expect([...visible]).toEqual([
      "worker",
      "company",
      "center",
      "type",
      "detail",
      "dateTime",
      "duration",
    ]);
  });
});

describe("resolveVisibleColumnKeys", () => {
  it("falls back to the defaults when there is nothing stored", () => {
    expect([...resolveVisibleColumnKeys(null)]).toEqual([...defaultVisibleColumnKeys()]);
  });

  it("falls back to the defaults for invalid payloads", () => {
    expect([...resolveVisibleColumnKeys("not-json")]).toEqual([...defaultVisibleColumnKeys()]);
    expect([...resolveVisibleColumnKeys("[]")]).toEqual([...defaultVisibleColumnKeys()]);
  });

  it("restores a stored selection, including explicitly hidden columns", () => {
    const stored = serializeVisibleColumnKeys(new Set<TimeRecordColumnKey>(["worker", "center"]));
    expect([...resolveVisibleColumnKeys(stored)]).toEqual(["worker", "center"]);
  });

  it("ignores unknown keys", () => {
    const stored = JSON.stringify({ dailyTotal: true, doesNotExist: true });
    const visible = resolveVisibleColumnKeys(stored);
    expect(visible.has("dailyTotal")).toBe(true);
    expect(visible.has("doesNotExist" as TimeRecordColumnKey)).toBe(false);
    // columns absent from the payload keep their default visibility
    expect(visible.has("worker")).toBe(true);
    expect(visible.has("monthlyTotal")).toBe(false);
  });

  it("keeps default visibility for columns missing from an older stored config", () => {
    // `weeklyTotal` did not exist when this payload was written: it must not
    // become hidden just because it is missing.
    const stored = JSON.stringify({ worker: false });
    const visible = resolveVisibleColumnKeys(stored);
    expect(visible.has("worker")).toBe(false);
    expect(visible.has("weeklyTotal")).toBe(false); // defaultVisible: false
    expect(visible.has("company")).toBe(true); // defaultVisible: true
  });
});

describe("visibleColumnsStorageKey", () => {
  it("is scoped to the admin id, falling back to the email", () => {
    expect(visibleColumnsStorageKey({ id: "admin-1", email: "a@b.c" })).toBe(
      "time-records-visible-columns:admin-1"
    );
    expect(visibleColumnsStorageKey({ email: "a@b.c" })).toBe(
      "time-records-visible-columns:a@b.c"
    );
  });

  it("returns null when there is no identity to scope the config to", () => {
    expect(visibleColumnsStorageKey(null)).toBeNull();
    expect(visibleColumnsStorageKey({})).toBeNull();
  });
});
