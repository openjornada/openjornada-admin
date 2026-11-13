"use client";

import { useTranslations } from "next-intl";
import { AiOutlineWarning } from "react-icons/ai";
import type { Roster } from "@/lib/api-client";
import { toDateKey, cellText, formatPlannedHours, isOvernight } from "@/utils/shiftGrid";

interface ShiftGridProps {
  roster: Roster;
  dates: string[];
  /** Keys "workerId|date" of days with an approved absence. */
  absences: Set<string>;
  /** Omit for the read-only (month) view. */
  onCellClick?: (workerId: string, date: string) => void;
}

/** Hand-made workers x days grid (week editable, month read-only). */
export default function ShiftGrid({ roster, dates, absences, onCellClick }: ShiftGridProps) {
  const t = useTranslations("shifts");
  const weekdays: string[] = useTranslations("calendar").raw("weekdays");

  const today = toDateKey(new Date()); // local date, not UTC
  const warningsByCell = new Map<string, string[]>();
  for (const w of roster.warnings) {
    const key = `${w.worker_id}|${w.date}`;
    const text = t.has(`warning.${w.code}`) ? t(`warning.${w.code}`) : w.message;
    warningsByCell.set(key, [...(warningsByCell.get(key) ?? []), text]);
  }

  return (
    <div className="bg-card border border-border rounded-lg overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-muted">
            <th className="sticky left-0 bg-muted px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
              {t("worker")}
            </th>
            {dates.map((date) => {
              const d = new Date(`${date}T00:00:00`);
              return (
                <th
                  key={date}
                  aria-current={date === today ? "date" : undefined}
                  className={`px-2 py-2 text-center text-xs ${
                    date === today ? "font-bold text-green-700 bg-green-100" : "font-medium text-muted-foreground"
                  }`}
                >
                  {weekdays[(d.getDay() + 6) % 7]} {d.getDate()}
                </th>
              );
            })}
            <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground uppercase">{t("total")}</th>
          </tr>
        </thead>
        <tbody>
          {roster.workers.map((worker) => (
            <tr key={worker.id} className="border-t border-border">
              <td className="sticky left-0 bg-card px-3 py-2 whitespace-nowrap text-foreground">
                {worker.first_name} {worker.last_name}
              </td>
              {dates.map((date) => {
                const shifts = worker.cells[date] ?? [];
                const key = `${worker.id}|${date}`;
                const warnings = warningsByCell.get(key);
                return (
                  <td
                    key={date}
                    data-testid={`cell-${worker.id}-${date}`}
                    onClick={onCellClick ? () => onCellClick(worker.id, date) : undefined}
                    title={cellText(shifts)}
                    className={`relative min-w-[64px] h-12 border-l border-border p-1 text-center align-middle ${
                      date === today ? "bg-green-50" : ""
                    } ${
                      onCellClick ? "cursor-pointer hover:bg-muted" : ""
                    }`}
                  >
                    <div className="flex flex-col gap-0.5">
                      {shifts.map((s, i) => (
                        <span
                          key={i}
                          className="text-[11px] leading-tight rounded px-1 py-0.5 text-white font-medium"
                          style={{ backgroundColor: s.color ?? "#6b7280" }}
                        >
                          {cellText([s])}
                          {isOvernight(s) && <span className="sr-only"> {t("overnight")}</span>}
                        </span>
                      ))}
                      {absences.has(key) && (
                        <span className="text-[10px] rounded border border-border bg-muted text-muted-foreground px-1">
                          {t("absent")}
                        </span>
                      )}
                    </div>
                    {worker.pending_dates?.includes(date) && (
                      <span title={t("pendingChange")} aria-label={t("pendingChange")} className="absolute top-0 left-0.5 text-[10px] text-blue-600">
                        ●
                      </span>
                    )}
                    {warnings && (
                      <span title={warnings.join("\n")} aria-label={t("hasWarnings")} className="absolute top-0 right-0 text-amber-500">
                        <AiOutlineWarning />
                      </span>
                    )}
                  </td>
                );
              })}
              <td className="px-3 py-2 text-right whitespace-nowrap font-medium text-foreground">
                {formatPlannedHours(worker.planned_minutes)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
