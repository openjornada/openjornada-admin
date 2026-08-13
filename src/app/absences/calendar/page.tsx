"use client";

import { useState, useEffect } from "react";
import AppWrapper from "@/components/AppWrapper";
import Link from "next/link";
import EnabledCompanySelect from "@/components/absences/EnabledCompanySelect";
import { apiClient, AbsenceCalendarEntry } from "@/lib/api-client";
import toast from "react-hot-toast";
import { AiOutlineArrowLeft, AiOutlineCalendar, AiOutlineLeft, AiOutlineRight } from "react-icons/ai";
import { getMonthName } from "@/utils/dateFormatters";

const WEEKDAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const TYPE_COLORS = [
  "bg-blue-100 text-blue-800 border-blue-200",
  "bg-purple-100 text-purple-800 border-purple-200",
  "bg-green-100 text-green-800 border-green-200",
  "bg-amber-100 text-amber-800 border-amber-200",
  "bg-red-100 text-red-800 border-red-200",
  "bg-teal-100 text-teal-800 border-teal-200",
];

function colorForType(code: string): string {
  let hash = 0;
  for (let i = 0; i < code.length; i++) hash = (hash * 31 + code.charCodeAt(i)) % TYPE_COLORS.length;
  return TYPE_COLORS[Math.abs(hash)];
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Builds the 6x7 grid of dates (Monday-first) covering the given month. */
function buildMonthGrid(year: number, month: number): Date[] {
  const firstOfMonth = new Date(year, month - 1, 1);
  const firstWeekday = (firstOfMonth.getDay() + 6) % 7; // 0 = Monday
  const gridStart = new Date(year, month - 1, 1 - firstWeekday);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });
}

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function AbsenceCalendarPage() {
  const now = new Date();
  const [companyId, setCompanyId] = useState("");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [entries, setEntries] = useState<AbsenceCalendarEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    // eslint-disable-next-line react-hooks/immutability
    loadCalendar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, year, month]);

  const loadCalendar = async () => {
    setLoading(true);
    const grid = buildMonthGrid(year, month);
    try {
      const data = await apiClient.getAbsenceCalendar({
        company_id: companyId,
        start_date: toDateKey(grid[0]),
        end_date: toDateKey(grid[grid.length - 1]),
      });
      setEntries(data);
    } catch (error) {
      console.error("Error loading absence calendar:", error);
      toast.error("Error al cargar el calendario de ausencias");
    } finally {
      setLoading(false);
    }
  };

  const handlePrevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const grid = buildMonthGrid(year, month);

  const entriesForDay = (day: Date) => {
    const key = toDateKey(day);
    return entries.filter((e) => e.start_date <= key && e.end_date >= key);
  };

  return (
    <AppWrapper>
      <div>
        {/* Header */}
        <div className="mb-6">
          <Link href="/absences" className="inline-flex items-center gap-2 text-accent hover:underline mb-4">
            <AiOutlineArrowLeft />
            <span>Volver a ausencias</span>
          </Link>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <AiOutlineCalendar />
            Calendario de Equipo
          </h1>
          <p className="text-muted-foreground">Quién está o estará ausente, con tipo y trabajador</p>
        </div>

        {/* Filters */}
        <div className="bg-card border border-border rounded-lg p-4 mb-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="max-w-sm flex-1 min-w-[220px]">
              <EnabledCompanySelect value={companyId} onChange={setCompanyId} />
            </div>

            {companyId && (
              <div className="flex items-center gap-3">
                <button
                  onClick={handlePrevMonth}
                  className="p-2 rounded-lg border border-border hover:bg-muted transition-colors"
                  aria-label="Mes anterior"
                >
                  <AiOutlineLeft />
                </button>
                <span className="font-medium text-foreground min-w-[140px] text-center">
                  {getMonthName(month)} {year}
                </span>
                <button
                  onClick={handleNextMonth}
                  className="p-2 rounded-lg border border-border hover:bg-muted transition-colors"
                  aria-label="Mes siguiente"
                >
                  <AiOutlineRight />
                </button>
              </div>
            )}
          </div>
        </div>

        {companyId && (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto mb-4"></div>
                <p className="text-muted-foreground">Cargando calendario...</p>
              </div>
            ) : (
              <div className="grid grid-cols-7">
                {WEEKDAY_LABELS.map((label) => (
                  <div
                    key={label}
                    className="px-2 py-2 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border bg-muted"
                  >
                    {label}
                  </div>
                ))}

                {grid.map((day) => {
                  const inCurrentMonth = day.getMonth() === month - 1;
                  const dayEntries = entriesForDay(day);
                  return (
                    <div
                      key={toDateKey(day)}
                      className={`min-h-[110px] border-b border-r border-border p-2 ${
                        inCurrentMonth ? "bg-card" : "bg-muted/20"
                      }`}
                    >
                      <div className={`text-xs mb-1 ${inCurrentMonth ? "text-foreground" : "text-muted-foreground/50"}`}>
                        {day.getDate()}
                      </div>
                      <div className="space-y-1">
                        {dayEntries.map((entry) => (
                          <div
                            key={`${entry.absence_id}-${toDateKey(day)}`}
                            title={`${entry.worker_name} — ${entry.absence_type_name}`}
                            className={`text-[11px] leading-tight px-1.5 py-0.5 rounded border truncate ${colorForType(entry.absence_type_code)}`}
                          >
                            {entry.worker_name}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {companyId && !loading && entries.length === 0 && (
          <p className="text-sm text-muted-foreground mt-4">No hay ausencias aprobadas este mes.</p>
        )}
      </div>
    </AppWrapper>
  );
}
