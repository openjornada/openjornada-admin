"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import AppWrapper from "@/components/AppWrapper";
import Link from "next/link";
import EnabledCompanySelect from "@/components/absences/EnabledCompanySelect";
import { apiClient, AbsenceBlackoutPeriod, AbsenceType } from "@/lib/api-client";
import toast from "react-hot-toast";
import { getApiErrorMessage } from "@/lib/error-messages";
import { AiOutlineArrowLeft, AiOutlineSetting, AiOutlinePlus, AiOutlineDelete } from "react-icons/ai";

interface PolicyFormState {
  annual_vacation_days: number;
  computation: "business_days" | "calendar_days";
  reference_year: "calendar" | "hire_date";
  min_advance_days: number;
  allow_half_day: boolean;
  allow_hourly: boolean;
  max_overlap_per_company: number | "";
  blackout_periods: AbsenceBlackoutPeriod[];
  absence_types: AbsenceType[];
}

const emptyBlackout = (): AbsenceBlackoutPeriod => ({ name: "", start_date: "", end_date: "" });
const emptyType = (): AbsenceType => ({
  code: "",
  name: "",
  deducts_balance: false,
  is_paid: true,
  requires_attachment: false,
  max_days: null,
  color: "#3B82F6",
});

export default function AbsencePolicySettingsPage() {
  const t = useTranslations("absencePolicy");
  const [companyId, setCompanyId] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<PolicyFormState | null>(null);

  useEffect(() => {
    if (!companyId) return;
    // eslint-disable-next-line react-hooks/immutability
    loadPolicy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const loadPolicy = async () => {
    setLoading(true);
    try {
      const policy = await apiClient.getAbsencePolicy(companyId);
      setForm({
        annual_vacation_days: policy.annual_vacation_days,
        computation: policy.computation,
        reference_year: policy.reference_year,
        min_advance_days: policy.min_advance_days,
        allow_half_day: policy.allow_half_day,
        allow_hourly: policy.allow_hourly,
        max_overlap_per_company: policy.max_overlap_per_company ?? "",
        blackout_periods: policy.blackout_periods,
        absence_types: policy.absence_types,
      });
    } catch (error) {
      console.error("Error loading absence policy:", error);
      toast.error(getApiErrorMessage(error, t("loadError")));
    } finally {
      setLoading(false);
    }
  };

  const updateForm = <K extends keyof PolicyFormState>(key: K, value: PolicyFormState[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  // Blackout periods
  const addBlackout = () => {
    if (!form) return;
    updateForm("blackout_periods", [...form.blackout_periods, emptyBlackout()]);
  };
  const updateBlackout = (index: number, field: keyof AbsenceBlackoutPeriod, value: string) => {
    if (!form) return;
    const next = form.blackout_periods.map((b, i) => (i === index ? { ...b, [field]: value } : b));
    updateForm("blackout_periods", next);
  };
  const removeBlackout = (index: number) => {
    if (!form) return;
    updateForm("blackout_periods", form.blackout_periods.filter((_, i) => i !== index));
  };

  // Absence types
  const addType = () => {
    if (!form) return;
    updateForm("absence_types", [...form.absence_types, emptyType()]);
  };
  const updateType = (index: number, field: keyof AbsenceType, value: string | boolean | number | null) => {
    if (!form) return;
    const next = form.absence_types.map((t, i) => (i === index ? { ...t, [field]: value } : t));
    updateForm("absence_types", next);
  };
  const removeType = (index: number) => {
    if (!form) return;
    updateForm("absence_types", form.absence_types.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form || !companyId) return;

    if (form.absence_types.some((t) => !t.code.trim() || !t.name.trim())) {
      toast.error(t("typesIncomplete"));
      return;
    }
    if (form.blackout_periods.some((b) => !b.name.trim() || !b.start_date || !b.end_date)) {
      toast.error(t("blackoutsIncomplete"));
      return;
    }

    setSaving(true);
    try {
      const updated = await apiClient.updateAbsencePolicy(companyId, {
        annual_vacation_days: form.annual_vacation_days,
        computation: form.computation,
        reference_year: form.reference_year,
        min_advance_days: form.min_advance_days,
        allow_half_day: form.allow_half_day,
        allow_hourly: form.allow_hourly,
        max_overlap_per_company: form.max_overlap_per_company === "" ? null : form.max_overlap_per_company,
        blackout_periods: form.blackout_periods,
        absence_types: form.absence_types,
      });
      setForm({
        annual_vacation_days: updated.annual_vacation_days,
        computation: updated.computation,
        reference_year: updated.reference_year,
        min_advance_days: updated.min_advance_days,
        allow_half_day: updated.allow_half_day,
        allow_hourly: updated.allow_hourly,
        max_overlap_per_company: updated.max_overlap_per_company ?? "",
        blackout_periods: updated.blackout_periods,
        absence_types: updated.absence_types,
      });
      toast.success(t("saved"));
    } catch (error) {
      console.error("Error updating absence policy:", error);
      toast.error(getApiErrorMessage(error, t("saveError")));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppWrapper>
      <div>
        {/* Header */}
        <div className="mb-6">
          <Link href="/absences" className="inline-flex items-center gap-2 text-accent hover:underline mb-4">
            <AiOutlineArrowLeft />
            <span>{t("backToAbsences")}</span>
          </Link>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <AiOutlineSetting />
            {t("title")}
          </h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>

        <div className="bg-card border border-border rounded-lg p-4 mb-6 max-w-sm">
          <EnabledCompanySelect value={companyId} onChange={setCompanyId} />
        </div>

        {loading && (
          <div className="bg-card border border-border rounded-lg p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto mb-4"></div>
            <p className="text-muted-foreground">{t("loading")}</p>
          </div>
        )}

        {!loading && form && companyId && (
          <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
            {/* General policy */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">{t("general")}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">{t("annualDays")}</label>
                  <input
                    type="number"
                    min={0}
                    max={365}
                    step={0.5}
                    value={form.annual_vacation_days}
                    onChange={(e) => updateForm("annual_vacation_days", Number(e.target.value))}
                    className="w-full px-4 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">{t("minAdvance")}</label>
                  <input
                    type="number"
                    min={0}
                    value={form.min_advance_days}
                    onChange={(e) => updateForm("min_advance_days", Number(e.target.value))}
                    className="w-full px-4 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">{t("computation")}</label>
                  <select
                    value={form.computation}
                    onChange={(e) => updateForm("computation", e.target.value as "business_days" | "calendar_days")}
                    className="w-full px-4 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    <option value="business_days">{t("computationBusiness")}</option>
                    <option value="calendar_days">{t("computationCalendar")}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">{t("referenceYear")}</label>
                  <select
                    value={form.reference_year}
                    onChange={(e) => updateForm("reference_year", e.target.value as "calendar" | "hire_date")}
                    className="w-full px-4 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    <option value="calendar">{t("referenceCalendar")}</option>
                    <option value="hire_date">{t("referenceHire")}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    {t("maxOverlap")}
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={form.max_overlap_per_company}
                    onChange={(e) =>
                      updateForm("max_overlap_per_company", e.target.value === "" ? "" : Number(e.target.value))
                    }
                    placeholder={t("maxDaysPlaceholder")}
                    className="w-full px-4 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                  <p className="text-xs text-muted-foreground mt-1">{t("maxOverlapHelp")}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-6 mt-4 pt-4 border-t border-border">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.allow_half_day}
                    onChange={(e) => updateForm("allow_half_day", e.target.checked)}
                    className="w-5 h-5 rounded border-input text-accent focus:ring-accent"
                  />
                  <span className="text-sm font-medium text-foreground">{t("allowHalfDay")}</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.allow_hourly}
                    onChange={(e) => updateForm("allow_hourly", e.target.checked)}
                    className="w-5 h-5 rounded border-input text-accent focus:ring-accent"
                  />
                  <span className="text-sm font-medium text-foreground">{t("allowHourly")}</span>
                </label>
              </div>
            </div>

            {/* Blackout periods */}
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-foreground">{t("blackouts")}</h2>
                <button
                  type="button"
                  onClick={addBlackout}
                  className="flex items-center gap-2 text-accent hover:underline text-sm font-medium"
                >
                  <AiOutlinePlus />
                  {t("addBlackout")}
                </button>
              </div>

              {form.blackout_periods.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("noBlackouts")}</p>
              ) : (
                <div className="space-y-3">
                  {form.blackout_periods.map((b, index) => (
                    <div key={index} className="flex flex-wrap items-end gap-3 bg-muted/30 rounded-lg p-3">
                      <div className="flex-1 min-w-[160px]">
                        <label className="block text-xs font-medium text-muted-foreground mb-1">{t("typeName")}</label>
                        <input
                          type="text"
                          value={b.name}
                          onChange={(e) => updateBlackout(index, "name", e.target.value)}
                          className="w-full px-3 py-1.5 border border-input bg-background rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                          placeholder={t("blackoutNamePlaceholder")}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">{t("blackoutStart")}</label>
                        <input
                          type="date"
                          value={b.start_date}
                          onChange={(e) => updateBlackout(index, "start_date", e.target.value)}
                          className="px-3 py-1.5 border border-input bg-background rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">{t("blackoutEnd")}</label>
                        <input
                          type="date"
                          value={b.end_date}
                          onChange={(e) => updateBlackout(index, "end_date", e.target.value)}
                          className="px-3 py-1.5 border border-input bg-background rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeBlackout(index)}
                        className="text-destructive hover:text-destructive/80 p-2"
                        title={t("delete")}
                      >
                        <AiOutlineDelete className="text-lg" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Absence types catalogue */}
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-foreground">{t("types")}</h2>
                <button
                  type="button"
                  onClick={addType}
                  className="flex items-center gap-2 text-accent hover:underline text-sm font-medium"
                >
                  <AiOutlinePlus />
                  {t("addType")}
                </button>
              </div>

              <div className="space-y-4">
                {form.absence_types.map((at, index) => (
                  <div key={index} className="bg-muted/30 rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-1">{t("typeCode")}</label>
                          <input
                            type="text"
                            value={at.code}
                            onChange={(e) => updateType(index, "code", e.target.value)}
                            className="w-full px-3 py-1.5 border border-input bg-background rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                            placeholder="vacation"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-1">{t("typeName")}</label>
                          <input
                            type="text"
                            value={at.name}
                            onChange={(e) => updateType(index, "name", e.target.value)}
                            className="w-full px-3 py-1.5 border border-input bg-background rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                            placeholder={t("typeNamePlaceholder")}
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeType(index)}
                        className="text-destructive hover:text-destructive/80 p-2"
                        title={t("deleteType")}
                      >
                        <AiOutlineDelete className="text-lg" />
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={at.deducts_balance}
                          onChange={(e) => updateType(index, "deducts_balance", e.target.checked)}
                          className="w-4 h-4 rounded border-input text-accent focus:ring-accent"
                        />
                        <span className="text-sm text-foreground">{t("deductsBalance")}</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={at.is_paid}
                          onChange={(e) => updateType(index, "is_paid", e.target.checked)}
                          className="w-4 h-4 rounded border-input text-accent focus:ring-accent"
                        />
                        <span className="text-sm text-foreground">{t("isPaid")}</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={at.requires_attachment}
                          onChange={(e) => updateType(index, "requires_attachment", e.target.checked)}
                          className="w-4 h-4 rounded border-input text-accent focus:ring-accent"
                        />
                        <span className="text-sm text-foreground">{t("requiresAttachment")}</span>
                      </label>

                      <div className="flex items-center gap-2">
                        <label className="text-sm text-foreground">{t("maxDays")}</label>
                        <input
                          type="number"
                          min={0}
                          value={at.max_days ?? ""}
                          onChange={(e) => updateType(index, "max_days", e.target.value === "" ? null : Number(e.target.value))}
                          placeholder={t("maxDaysPlaceholder")}
                          className="w-28 px-2 py-1 border border-input bg-background rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="text-sm text-foreground">{t("color")}</label>
                        <input
                          type="color"
                          value={at.color}
                          onChange={(e) => updateType(index, "color", e.target.value)}
                          className="w-10 h-8 border border-input rounded cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={saving}
                className="bg-accent text-accent-foreground py-2 px-6 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? t("saving") : t("save")}
              </button>
            </div>
          </form>
        )}
      </div>
    </AppWrapper>
  );
}
