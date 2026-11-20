"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AiOutlineDelete, AiOutlinePlus } from "react-icons/ai";
import type { CellShiftInput, PlannedShift, ShiftType } from "@/lib/api-client";

interface CellEditorProps {
  title: string;
  shifts: PlannedShift[];
  types: ShiftType[];
  /** Inline error from the last save attempt (e.g. overlap). */
  error: string | null;
  saving: boolean;
  onSave: (shifts: CellShiftInput[]) => void;
  onClose: () => void;
}

interface Row {
  typeId: string; // "" = custom
  start: string;
  end: string;
  breakMinutes: number;
}

const inputClass = "px-2 py-1 border border-border rounded-lg bg-background text-foreground";

/** Modal to set custom hours/break, add a second shift or clear the day. */
export default function CellEditor({ title, shifts, types, error, saving, onSave, onClose }: CellEditorProps) {
  const t = useTranslations("shifts");
  const tc = useTranslations("common");
  const [rows, setRows] = useState<Row[]>(
    shifts.map((s) => ({ typeId: s.shift_type_id ?? "", start: s.start_time, end: s.end_time, breakMinutes: s.break_minutes }))
  );

  const update = (i: number, patch: Partial<Row>) => setRows((r) => r.map((row, j) => (j === i ? { ...row, ...patch } : row)));

  const pickType = (i: number, typeId: string) => {
    const type = types.find((x) => x.id === typeId);
    update(i, type ? { typeId, start: type.start_time, end: type.end_time, breakMinutes: type.break_minutes } : { typeId: "" });
  };

  const save = () =>
    onSave(
      rows.map((r) => ({
        ...(r.typeId ? { shift_type_id: r.typeId } : {}),
        start_time: r.start,
        end_time: r.end,
        break_minutes: r.breakMinutes,
      }))
    );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-label={title}>
      <div className="bg-card border border-border rounded-lg p-6 w-full max-w-xl space-y-4">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        {rows.length === 0 && <p className="text-sm text-muted-foreground">{t("emptyDay")}</p>}
        {rows.map((row, i) => (
          <div key={i} className="flex flex-wrap items-end gap-2">
            <label className="text-xs text-muted-foreground">
              {t("type")}
              <select value={row.typeId} onChange={(e) => pickType(i, e.target.value)} className={`${inputClass} block`}>
                <option value="">{t("custom")}</option>
                {types.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-muted-foreground">
              {t("start")}
              <input type="time" value={row.start} onChange={(e) => update(i, { start: e.target.value })} className={`${inputClass} block`} />
            </label>
            <label className="text-xs text-muted-foreground">
              {t("end")}
              <input type="time" value={row.end} onChange={(e) => update(i, { end: e.target.value })} className={`${inputClass} block`} />
            </label>
            <label className="text-xs text-muted-foreground">
              {t("breakMinutes")}
              <input
                type="number"
                min={0}
                value={row.breakMinutes}
                onChange={(e) => update(i, { breakMinutes: Math.max(0, Number(e.target.value) || 0) })}
                className={`${inputClass} block w-24`}
              />
            </label>
            <button
              type="button"
              onClick={() => setRows((r) => r.filter((_, j) => j !== i))}
              className="p-2 text-red-600 hover:bg-muted rounded-lg"
              title={tc("delete")}
              aria-label={tc("delete")}
            >
              <AiOutlineDelete />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setRows((r) => [...r, { typeId: "", start: "09:00", end: "17:00", breakMinutes: 0 }])}
          className="inline-flex items-center gap-1 text-sm text-accent hover:underline"
        >
          <AiOutlinePlus /> {t("addShift")}
        </button>
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 border border-border rounded-lg hover:bg-muted">
            {tc("cancel")}
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:opacity-90 disabled:opacity-50"
          >
            {tc("save")}
          </button>
        </div>
      </div>
    </div>
  );
}
