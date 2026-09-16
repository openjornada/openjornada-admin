import type { ReactNode } from "react";
import type { TimeRecord } from "./api-client";
import { formatToLocalTime } from "@/utils/dateFormatters";

export type TimeRecordColumnKey =
  | "dni"
  | "worker"
  | "company"
  | "center"
  | "type"
  | "detail"
  | "dateTime"
  | "duration"
  | "dailyTotal"
  | "weeklyTotal"
  | "monthlyTotal";

/** Translation helpers the column renderers depend on. */
export interface ColumnHelpers {
  /** "timeRecords" namespace. */
  t: (key: string) => string;
  /** "common" namespace. */
  tc: (key: string) => string;
  getRecordTypeLabel: (type: string) => string;
  formatDuration: (minutes?: number) => string;
}

export interface TimeRecordColumn {
  key: TimeRecordColumnKey;
  label: string;
  render: (record: TimeRecord) => ReactNode;
  exportValue: (record: TimeRecord) => string;
  cellClassName: string;
  defaultVisible: boolean;
}

interface ColumnSpec {
  key: TimeRecordColumnKey;
  defaultVisible: boolean;
  cellClassName: string;
  label: (helpers: ColumnHelpers) => string;
  render: (record: TimeRecord, helpers: ColumnHelpers) => ReactNode;
  exportValue: (record: TimeRecord, helpers: ColumnHelpers) => string;
}

const CELL = "px-6 py-4 whitespace-nowrap text-sm";
const CELL_MUTED = `${CELL} text-muted-foreground`;
const CELL_FOREGROUND = `${CELL} text-foreground`;

// Single source of truth: drives the table header, the table cells and the
// Excel export. DNI and the 3 totals start hidden (defaultVisible: false).
const TIME_RECORD_COLUMNS: ColumnSpec[] = [
  {
    key: "dni",
    defaultVisible: false,
    cellClassName: CELL_MUTED,
    label: (h) => h.t("dni"),
    // Export keeps the raw id number (as the pre-refactor export did); the table
    // render falls back to "-" for the realtime-inserted rows without it.
    render: (record) => record.worker_id_number || "-",
    exportValue: (record) => record.worker_id_number,
  },
  {
    key: "worker",
    defaultVisible: true,
    cellClassName: CELL_FOREGROUND,
    label: (h) => h.tc("worker"),
    render: (record) => record.worker_name,
    exportValue: (record) => record.worker_name,
  },
  {
    key: "company",
    defaultVisible: true,
    cellClassName: CELL_MUTED,
    label: (h) => h.tc("company"),
    render: (record, h) => record.company_name || h.tc("notAvailable"),
    exportValue: (record, h) => record.company_name || h.tc("notAvailable"),
  },
  {
    key: "center",
    defaultVisible: true,
    cellClassName: CELL_MUTED,
    label: (h) => h.t("centerColumn"),
    render: (record, h) => record.work_center_name || h.tc("notAvailable"),
    exportValue: (record, h) => record.work_center_name || h.tc("notAvailable"),
  },
  {
    key: "type",
    defaultVisible: true,
    cellClassName: CELL,
    label: (h) => h.t("type"),
    render: (record, h) => (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          record.record_type === "entry"
            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
            : record.record_type === "exit"
            ? "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
            : record.record_type === "pause_start"
            ? "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
            : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
        }`}
      >
        {h.getRecordTypeLabel(record.record_type)}
      </span>
    ),
    exportValue: (record, h) => h.getRecordTypeLabel(record.record_type),
  },
  {
    key: "detail",
    defaultVisible: true,
    cellClassName: "px-6 py-4 text-sm text-muted-foreground",
    label: (h) => h.t("detail"),
    render: (record, h) =>
      record.pause_type_name ? (
        <div>
          <div className="font-medium text-foreground">{record.pause_type_name}</div>
          <div className="text-xs">
            {record.pause_counts_as_work ? (
              <span className="text-green-600 dark:text-green-400">{h.t("pauseCountsAsWork")}</span>
            ) : (
              <span className="text-orange-600 dark:text-orange-400">{h.t("pauseOutsideShift")}</span>
            )}
          </div>
        </div>
      ) : (
        "-"
      ),
    exportValue: (record, h) =>
      record.pause_type_name
        ? `${record.pause_type_name} - ${
            record.pause_counts_as_work ? h.t("pauseCountsAsWork") : h.t("pauseOutsideShift")
          }`
        : "-",
  },
  {
    key: "dateTime",
    defaultVisible: true,
    cellClassName: CELL_FOREGROUND,
    label: (h) => h.t("dateTime"),
    render: (record) => formatToLocalTime(record.timestamp),
    exportValue: (record) => formatToLocalTime(record.timestamp),
  },
  {
    key: "duration",
    defaultVisible: true,
    cellClassName: CELL_MUTED,
    label: (h) => h.t("duration"),
    render: (record, h) => h.formatDuration(record.duration_minutes),
    exportValue: (record, h) => h.formatDuration(record.duration_minutes),
  },
  {
    key: "dailyTotal",
    defaultVisible: false,
    cellClassName: CELL_MUTED,
    label: (h) => h.t("dailyTotal"),
    render: (record, h) => h.formatDuration(record.daily_total_minutes),
    exportValue: (record, h) => h.formatDuration(record.daily_total_minutes),
  },
  {
    key: "weeklyTotal",
    defaultVisible: false,
    cellClassName: CELL_MUTED,
    label: (h) => h.t("weeklyTotal"),
    render: (record, h) => h.formatDuration(record.weekly_total_minutes),
    exportValue: (record, h) => h.formatDuration(record.weekly_total_minutes),
  },
  {
    key: "monthlyTotal",
    defaultVisible: false,
    cellClassName: CELL_MUTED,
    label: (h) => h.t("monthlyTotal"),
    render: (record, h) => h.formatDuration(record.monthly_total_minutes),
    exportValue: (record, h) => h.formatDuration(record.monthly_total_minutes),
  },
];

export function buildTimeRecordColumns(helpers: ColumnHelpers): TimeRecordColumn[] {
  return TIME_RECORD_COLUMNS.map((spec) => ({
    key: spec.key,
    label: spec.label(helpers),
    render: (record) => spec.render(record, helpers),
    exportValue: (record) => spec.exportValue(record, helpers),
    cellClassName: spec.cellClassName,
    defaultVisible: spec.defaultVisible,
  }));
}

const STORAGE_KEY_PREFIX = "time-records-visible-columns";

/**
 * localStorage key scoped to the authenticated admin. Returns null when no
 * stable identity is available (the selection is then not persisted).
 */
export function visibleColumnsStorageKey(
  user: { id?: string; email?: string } | null
): string | null {
  if (!user) return null;
  const identity = user.id || user.email;
  return identity ? `${STORAGE_KEY_PREFIX}:${identity}` : null;
}

export function defaultVisibleColumnKeys(): Set<TimeRecordColumnKey> {
  return new Set(
    TIME_RECORD_COLUMNS.filter((column) => column.defaultVisible).map((column) => column.key)
  );
}

/**
 * Resolves the visible columns from the persisted JSON. Unknown keys are
 * ignored, invalid payloads fall back to the defaults, and a column missing
 * from the payload keeps its `defaultVisible` (so a newly added column is
 * never hidden by an older stored config).
 */
export function resolveVisibleColumnKeys(stored: string | null): Set<TimeRecordColumnKey> {
  const visible = defaultVisibleColumnKeys();
  if (!stored) return visible;

  let parsed: unknown;
  try {
    parsed = JSON.parse(stored);
  } catch {
    return visible;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return visible;

  const saved = parsed as Record<string, unknown>;
  for (const column of TIME_RECORD_COLUMNS) {
    const value = saved[column.key];
    if (typeof value === "boolean") {
      if (value) visible.add(column.key);
      else visible.delete(column.key);
    }
  }
  return visible;
}

export function serializeVisibleColumnKeys(visible: Set<TimeRecordColumnKey>): string {
  const state: Record<string, boolean> = {};
  for (const column of TIME_RECORD_COLUMNS) {
    state[column.key] = visible.has(column.key);
  }
  return JSON.stringify(state);
}
