"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import toast from "react-hot-toast";
import { AiOutlineArrowLeft, AiOutlinePlus, AiOutlineEdit, AiOutlineDelete } from "react-icons/ai";
import AppWrapper from "@/components/AppWrapper";
import EnabledCompanySelect from "@/components/absences/EnabledCompanySelect";
import { apiClient, type ShiftType } from "@/lib/api-client";
import { getApiErrorMessage } from "@/lib/error-messages";

interface Form {
  id: string | null;
  name: string;
  short_code: string;
  color: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
}

const EMPTY: Form = { id: null, name: "", short_code: "", color: "#3b82f6", start_time: "09:00", end_time: "17:00", break_minutes: 0 };
const inputClass = "w-full px-3 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-accent";

export default function ShiftTypesPage() {
  const t = useTranslations("shifts");
  const tc = useTranslations("common");
  const [companyId, setCompanyId] = useState("");
  const [types, setTypes] = useState<ShiftType[]>([]);
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!companyId) return;
    try {
      setTypes(await apiClient.getShiftTypes(companyId));
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("loadError")));
    }
  }, [companyId, t]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    const { id, ...fields } = form;
    setSaving(true);
    try {
      if (id) await apiClient.updateShiftType(id, companyId, fields);
      else await apiClient.createShiftType({ company_id: companyId, ...fields });
      toast.success(t("typeSaved"));
      setForm(null);
      await load();
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("typeSaveError")));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (type: ShiftType) => {
    if (!confirm(t("confirmDeleteType", { name: type.name }))) return;
    try {
      await apiClient.deleteShiftType(type.id, companyId);
      toast.success(t("typeDeleted"));
      await load();
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("typeDeleteError")));
    }
  };

  const set = (patch: Partial<Form>) => setForm((f) => (f ? { ...f, ...patch } : f));

  return (
    <AppWrapper>
      <div>
        <div className="mb-6">
          <Link href="/shifts" className="inline-flex items-center gap-2 text-accent hover:underline mb-4">
            <AiOutlineArrowLeft />
            <span>{t("backToShifts")}</span>
          </Link>
          <h1 className="text-3xl font-bold text-foreground">{t("typesTitle")}</h1>
          <p className="text-muted-foreground">{t("typesSubtitle")}</p>
        </div>

        <div className="bg-card border border-border rounded-lg p-4 mb-6 flex flex-wrap items-end gap-4">
          <div className="max-w-sm flex-1 min-w-[220px]">
            <EnabledCompanySelect module="shift" value={companyId} onChange={setCompanyId} />
          </div>
          {companyId && (
            <button
              onClick={() => setForm(EMPTY)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:opacity-90"
            >
              <AiOutlinePlus /> {t("newType")}
            </button>
          )}
        </div>

        {form && (
          <form onSubmit={submit} className="bg-card border border-border rounded-lg p-6 mb-6 max-w-2xl space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="text-sm font-medium text-foreground">
                {tc("name")}
                <input required maxLength={100} value={form.name} onChange={(e) => set({ name: e.target.value })} className={inputClass} />
              </label>
              <label className="text-sm font-medium text-foreground">
                {t("shortCode")}
                <input required maxLength={4} value={form.short_code} onChange={(e) => set({ short_code: e.target.value })} className={inputClass} />
              </label>
              <label className="text-sm font-medium text-foreground">
                {t("start")}
                <input required type="time" value={form.start_time} onChange={(e) => set({ start_time: e.target.value })} className={inputClass} />
              </label>
              <label className="text-sm font-medium text-foreground">
                {t("end")}
                <input required type="time" value={form.end_time} onChange={(e) => set({ end_time: e.target.value })} className={inputClass} />
              </label>
              <label className="text-sm font-medium text-foreground">
                {t("breakMinutes")}
                <input
                  type="number"
                  min={0}
                  value={form.break_minutes}
                  onChange={(e) => set({ break_minutes: Math.max(0, Number(e.target.value) || 0) })}
                  className={inputClass}
                />
              </label>
              <label className="text-sm font-medium text-foreground">
                {t("color")}
                <input type="color" value={form.color} onChange={(e) => set({ color: e.target.value })} className="block h-10 w-full" />
              </label>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {t("preview")}
              <span className="rounded px-2 py-0.5 text-white text-xs font-medium" style={{ backgroundColor: form.color }}>
                {form.short_code || "?"}
              </span>
              {form.end_time <= form.start_time && <span>{t("overnight")}</span>}
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={saving} className="px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:opacity-90 disabled:opacity-50">
                {tc("save")}
              </button>
              <button type="button" onClick={() => setForm(null)} className="px-4 py-2 border border-border rounded-lg hover:bg-muted">
                {tc("cancel")}
              </button>
            </div>
          </form>
        )}

        {companyId && (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            {types.length === 0 ? (
              <p className="p-6 text-muted-foreground">{t("noTypes")}</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 text-left">{t("preview")}</th>
                    <th className="px-4 py-2 text-left">{tc("name")}</th>
                    <th className="px-4 py-2 text-left">{t("hours")}</th>
                    <th className="px-4 py-2 text-left">{t("breakMinutes")}</th>
                    <th className="px-4 py-2 text-right">{tc("actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {types.map((type) => (
                    <tr key={type.id} className="border-t border-border">
                      <td className="px-4 py-2">
                        <span className="rounded px-2 py-0.5 text-white text-xs font-medium" style={{ backgroundColor: type.color }}>
                          {type.short_code}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-foreground">{type.name}</td>
                      <td className="px-4 py-2 text-foreground">
                        {type.start_time}–{type.end_time}
                        {type.end_time <= type.start_time && ` (${t("overnight")})`}
                      </td>
                      <td className="px-4 py-2 text-foreground">{type.break_minutes}</td>
                      <td className="px-4 py-2 text-right">
                        <button
                          onClick={() =>
                            setForm({ id: type.id, name: type.name, short_code: type.short_code, color: type.color, start_time: type.start_time, end_time: type.end_time, break_minutes: type.break_minutes })
                          }
                          className="p-2 hover:bg-muted rounded-lg"
                          title={tc("edit")}
                          aria-label={tc("edit")}
                        >
                          <AiOutlineEdit className="text-xl" />
                        </button>
                        <button onClick={() => remove(type)} className="p-2 text-red-600 hover:bg-muted rounded-lg" title={tc("delete")} aria-label={tc("delete")}>
                          <AiOutlineDelete className="text-xl" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </AppWrapper>
  );
}
