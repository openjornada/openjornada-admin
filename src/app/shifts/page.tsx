"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import toast from "react-hot-toast";
import { AiOutlineSchedule, AiOutlineLeft, AiOutlineRight, AiOutlineTags } from "react-icons/ai";
import AppWrapper from "@/components/AppWrapper";
import EnabledCompanySelect from "@/components/absences/EnabledCompanySelect";
import ShiftGrid from "@/components/shifts/ShiftGrid";
import CellEditor from "@/components/shifts/CellEditor";
import PublishDialog from "@/components/shifts/PublishDialog";
import { apiClient, type Roster, type ShiftType, type WorkCenter, type CellShiftInput } from "@/lib/api-client";
import { getApiErrorMessage } from "@/lib/error-messages";
import { getMonthName } from "@/utils/dateFormatters";
import { addDays, mondayOf, monthDates, toDateKey, weekDates } from "@/utils/shiftGrid";

type Tool = { kind: "edit" } | { kind: "erase" } | { kind: "type"; id: string };

export default function ShiftsPage() {
  const t = useTranslations("shifts");
  const tc = useTranslations("common");
  const [companyId, setCompanyId] = useState("");
  const [view, setView] = useState<"week" | "month">("week");
  const [anchor, setAnchor] = useState(() => toDateKey(new Date())); // any day of the shown week/month
  const [workCenterId, setWorkCenterId] = useState("");
  const [workCenters, setWorkCenters] = useState<WorkCenter[]>([]);
  const [types, setTypes] = useState<ShiftType[]>([]);
  const [roster, setRoster] = useState<Roster | null>(null);
  const [absences, setAbsences] = useState<Set<string>>(new Set());
  const [tool, setTool] = useState<Tool>({ kind: "edit" });
  const [editing, setEditing] = useState<{ workerId: string; date: string } | null>(null);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const [year, month] = anchor.split("-").map(Number);
  const dates = view === "week" ? weekDates(anchor) : monthDates(year, month);
  const startDate = dates[0];
  const endDate = dates[dates.length - 1];

  const loadRoster = useCallback(async () => {
    if (!companyId) return;
    try {
      const data = await apiClient.getRoster({
        company_id: companyId,
        start_date: startDate,
        end_date: endDate,
        ...(workCenterId ? { work_center_id: workCenterId } : {}),
      });
      setRoster(data);
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("loadError")));
    }
  }, [companyId, startDate, endDate, workCenterId, t]);

  // Company-level data: shift types, work centers (filter).
  useEffect(() => {
    if (!companyId) return;
    apiClient.getShiftTypes(companyId).then(setTypes).catch((e) => toast.error(getApiErrorMessage(e, t("loadError"))));
    apiClient.getWorkCenters({ company_id: companyId }).then(setWorkCenters).catch(() => setWorkCenters([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  useEffect(() => {
    if (!companyId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadRoster();
  }, [companyId, loadRoster]);

  // Approved absences, only when the company has the absence module on.
  useEffect(() => {
    if (!companyId) return;
    apiClient
      .getCompany(companyId)
      .then((c) =>
        c.absence_management_enabled
          ? apiClient.getAbsenceCalendar({ company_id: companyId, start_date: startDate, end_date: endDate })
          : []
      )
      .then((entries) => {
        const set = new Set<string>();
        for (const e of entries) for (const d of dates) if (e.start_date <= d && e.end_date >= d) set.add(`${e.worker_id}|${d}`);
        setAbsences(set);
      })
      .catch(() => setAbsences(new Set()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, startDate, endDate]);

  const changeCompany = (id: string) => {
    setCompanyId(id);
    setWorkCenterId("");
    setRoster(null);
  };

  const step = (dir: 1 | -1) => {
    if (view === "week") return setAnchor(addDays(anchor, 7 * dir));
    const d = new Date(year, month - 1 + dir, 1);
    setAnchor(toDateKey(d));
  };

  const saveCell = async (workerId: string, date: string, shifts: CellShiftInput[]) => {
    setSaving(true);
    setEditorError(null);
    try {
      await apiClient.putShiftCell({ company_id: companyId, worker_id: workerId, date, shifts });
      setEditing(null);
      await loadRoster();
    } catch (error) {
      const message = getApiErrorMessage(error, t("saveError"));
      if (editing) setEditorError(message);
      else toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleCellClick = (workerId: string, date: string) => {
    if (tool.kind === "type") saveCell(workerId, date, [{ shift_type_id: tool.id }]);
    else if (tool.kind === "erase") saveCell(workerId, date, []);
    else {
      setEditorError(null);
      setEditing({ workerId, date });
    }
  };

  const copyWeek = async (conflict: "skip" | "overwrite") => {
    setBusy(true);
    try {
      const r = await apiClient.copyShiftWeek({
        company_id: companyId,
        source_week_start: addDays(mondayOf(anchor), -7),
        target_week_start: mondayOf(anchor),
        conflict,
      });
      toast.success(t("copied", { copied: r.copied, skipped: r.skipped }));
      setCopyOpen(false);
      await loadRoster();
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("copyError")));
    } finally {
      setBusy(false);
    }
  };

  const publish = async (opts: { acknowledge_warnings: boolean; notify: boolean }) => {
    setBusy(true);
    try {
      const r = await apiClient.publishShiftPlan({ company_id: companyId, start_date: startDate, end_date: endDate, ...opts });
      toast.success(t("published", { count: r.changed_cells }));
      setPublishOpen(false);
      await loadRoster();
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("publishError")));
    } finally {
      setBusy(false);
    }
  };

  const editingWorker = editing && roster?.workers.find((w) => w.id === editing.workerId);
  const toolButton = (active: boolean) =>
    `px-3 py-1.5 rounded-lg border text-sm ${active ? "border-accent ring-2 ring-accent" : "border-border hover:bg-muted"}`;

  return (
    <AppWrapper>
      <div>
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <AiOutlineSchedule />
              {t("title")}
            </h1>
            <p className="text-muted-foreground">{t("subtitle")}</p>
          </div>
          <Link
            href="/shifts/types"
            className="flex items-center gap-2 bg-accent text-accent-foreground px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
          >
            <AiOutlineTags className="text-xl" />
            <span>{t("manageTypes")}</span>
          </Link>
        </div>

        <div className="bg-card border border-border rounded-lg p-4 mb-4 flex flex-wrap items-end gap-4">
          <div className="max-w-sm flex-1 min-w-[220px]">
            <EnabledCompanySelect module="shift" value={companyId} onChange={changeCompany} />
          </div>
          {companyId && (
            <>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">{t("workCenter")}</label>
                <select
                  value={workCenterId}
                  onChange={(e) => setWorkCenterId(e.target.value)}
                  className="px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                >
                  <option value="">{tc("all")}</option>
                  {workCenters.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex rounded-lg border border-border overflow-hidden">
                {(["week", "month"] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className={`px-3 py-2 text-sm ${view === v ? "bg-accent text-accent-foreground" : "hover:bg-muted"}`}
                  >
                    {t(v)}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => step(-1)} className="p-2 rounded-lg border border-border hover:bg-muted" aria-label={t("prev")}>
                  <AiOutlineLeft />
                </button>
                <span className="font-medium text-foreground min-w-[160px] text-center">
                  {view === "week" ? `${startDate} – ${endDate}` : `${getMonthName(month)} ${year}`}
                </span>
                <button
                  onClick={() => setAnchor(toDateKey(new Date()))}
                  disabled={dates.includes(toDateKey(new Date()))}
                  className="px-3 py-2 rounded-lg border border-border hover:bg-muted text-sm disabled:opacity-50 disabled:hover:bg-transparent"
                >
                  {t("today")}
                </button>
                <button onClick={() => step(1)} className="p-2 rounded-lg border border-border hover:bg-muted" aria-label={t("next")}>
                  <AiOutlineRight />
                </button>
              </div>
            </>
          )}
        </div>

        {companyId && view === "week" && (
          <div className="bg-card border border-border rounded-lg p-4 mb-4 flex flex-wrap items-center gap-2">
            <button className={toolButton(tool.kind === "edit")} onClick={() => setTool({ kind: "edit" })}>
              {t("toolEdit")}
            </button>
            {types.map((type) => (
              <button
                key={type.id}
                className={toolButton(tool.kind === "type" && tool.id === type.id)}
                onClick={() => setTool({ kind: "type", id: type.id })}
                title={`${type.name} ${type.start_time}-${type.end_time}`}
              >
                <span className="inline-block rounded px-1.5 mr-1 text-white text-xs font-medium" style={{ backgroundColor: type.color }}>
                  {type.short_code}
                </span>
                {type.name}
              </button>
            ))}
            <button className={toolButton(tool.kind === "erase")} onClick={() => setTool({ kind: "erase" })}>
              {t("toolErase")}
            </button>
            <div className="ml-auto flex items-center gap-2">
              <button onClick={() => setCopyOpen(true)} className="px-3 py-1.5 rounded-lg border border-border hover:bg-muted text-sm">
                {t("copyPrevious")}
              </button>
              <button
                onClick={() => setPublishOpen(true)}
                disabled={!roster || roster.pending_changes === 0}
                className="px-4 py-1.5 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
              >
                {t("publish", { count: roster?.pending_changes ?? 0 })}
              </button>
            </div>
          </div>
        )}

        {companyId && view === "month" && <p className="text-sm text-muted-foreground mb-2">{t("monthReadOnly")}</p>}

        {companyId && (!roster ? (
          <p className="text-muted-foreground">{t("loading")}</p>
        ) : (
          roster && (
            <ShiftGrid
              roster={roster}
              dates={dates}
              absences={absences}
              onCellClick={view === "week" ? handleCellClick : undefined}
            />
          )
        ))}
        {companyId && roster && <p className="text-xs text-muted-foreground mt-3">{t("limits")}</p>}
      </div>

      {editing && editingWorker && (
        <CellEditor
          title={`${editingWorker.first_name} ${editingWorker.last_name} · ${editing.date}`}
          shifts={editingWorker.cells[editing.date] ?? []}
          types={types}
          error={editorError}
          saving={saving}
          onSave={(shifts) => saveCell(editing.workerId, editing.date, shifts)}
          onClose={() => setEditing(null)}
        />
      )}

      {publishOpen && roster && (
        <PublishDialog roster={roster} publishing={busy} onConfirm={publish} onClose={() => setPublishOpen(false)} />
      )}

      {copyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-label={t("copyPrevious")}>
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md space-y-4">
            <h2 className="text-lg font-semibold text-foreground">{t("copyPrevious")}</h2>
            <p className="text-sm text-muted-foreground">{t("copyHelp")}</p>
            <div className="flex flex-col gap-2">
              <button disabled={busy} onClick={() => copyWeek("skip")} className="px-4 py-2 border border-border rounded-lg hover:bg-muted text-left">
                {t("copySkip")}
              </button>
              <button disabled={busy} onClick={() => copyWeek("overwrite")} className="px-4 py-2 border border-border rounded-lg hover:bg-muted text-left">
                {t("copyOverwrite")}
              </button>
            </div>
            <div className="flex justify-end">
              <button onClick={() => setCopyOpen(false)} className="px-4 py-2 border border-border rounded-lg hover:bg-muted">
                {tc("cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppWrapper>
  );
}
