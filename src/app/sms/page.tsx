"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import AppWrapper from "@/components/AppWrapper";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import type { SmsConfig, SmsCredits, SmsStats, SmsTemplateResponse } from "@/lib/api-client";
import toast from "react-hot-toast";
import { getApiErrorMessage } from "@/lib/error-messages";
import { isGsm7, smsLength, smsSegmentLimit } from "@/lib/sms-segment";
import { AiOutlineMessage, AiOutlineCheckCircle, AiOutlineCloseCircle } from "react-icons/ai";
import SmsCreditsBadge from "@/components/sms/SmsCreditsBadge";

/** Minimum characters accepted for a customized template. */
const MIN_TEMPLATE_LENGTH = 10;

export default function SmsPage() {
  const t = useTranslations("sms");
  const tt = useTranslations("sms.template");
  const tc = useTranslations("common");
  const [, setConfig] = useState<SmsConfig | null>(null);
  const [credits, setCredits] = useState<SmsCredits | null>(null);
  const [stats, setStats] = useState<SmsStats | null>(null);
  const [templateData, setTemplateData] = useState<SmsTemplateResponse | null>(null);
  // Per-locale template texts (customized value or default), edited in tabs.
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [activeLocale, setActiveLocale] = useState<string>("es");
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const templateRef = useRef<HTMLTextAreaElement>(null);

  const [formData, setFormData] = useState({
    enabled: false,
    first_reminder_minutes: 240,
    reminder_frequency_minutes: 60,
    max_reminders_per_day: 5,
    active_hours_start: "08:00",
    active_hours_end: "20:00",
  });

  useEffect(() => {
    // TODO: migrar a hook de datos (fetch-on-mount)
    // eslint-disable-next-line react-hooks/immutability
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Build the editable per-locale map: customized text ?? default text. */
  const buildTexts = (data: SmsTemplateResponse): Record<string, string> => {
    const map: Record<string, string> = {};
    for (const locale of data.supported_locales) {
      map[locale] = data.templates[locale] ?? data.default_templates[locale] ?? "";
    }
    return map;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [configData, creditsData, statsData, templateResult] = await Promise.allSettled([
        apiClient.getSmsConfig(),
        apiClient.getSmsCredits(),
        apiClient.getSmsStats(),
        apiClient.getSmsTemplate(),
      ]);

      if (configData.status === "fulfilled") {
        const c = configData.value;
        setConfig(c);
        setFormData({
          enabled: c.enabled,
          first_reminder_minutes: c.first_reminder_minutes,
          reminder_frequency_minutes: c.reminder_frequency_minutes,
          max_reminders_per_day: c.max_reminders_per_day,
          active_hours_start: c.active_hours_start,
          active_hours_end: c.active_hours_end,
        });
      }

      if (creditsData.status === "fulfilled") {
        setCredits(creditsData.value);
      }

      if (statsData.status === "fulfilled") {
        setStats(statsData.value);
      }

      if (templateResult.status === "fulfilled") {
        const data = templateResult.value;
        setTemplateData(data);
        setTexts(buildTexts(data));
        // Start on the admin's current UI locale when supported, else first.
        setActiveLocale((prev) =>
          data.supported_locales.includes(prev) ? prev : data.supported_locales[0] ?? "es"
        );
      }
    } catch (error) {
      console.error("Error fetching SMS data:", error);
      toast.error(getApiErrorMessage(error, t("loadError")));
    } finally {
      setLoading(false);
    }
  };

  const clampNumberInput = (e: React.ChangeEvent<HTMLInputElement>): number => {
    const parsed = parseInt(e.target.value, 10);
    if (isNaN(parsed)) return 0;
    const min = e.target.min ? parseInt(e.target.min, 10) : 0;
    const max = e.target.max ? parseInt(e.target.max, 10) : Infinity;
    return Math.min(max, Math.max(min, parsed));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? (e.target as HTMLInputElement).checked
          : type === "number"
          ? clampNumberInput(e as React.ChangeEvent<HTMLInputElement>)
          : e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const updated = await apiClient.updateSmsConfig(formData);
      setConfig(updated);
      setFormData({
        enabled: updated.enabled,
        first_reminder_minutes: updated.first_reminder_minutes,
        reminder_frequency_minutes: updated.reminder_frequency_minutes,
        max_reminders_per_day: updated.max_reminders_per_day,
        active_hours_start: updated.active_hours_start,
        active_hours_end: updated.active_hours_end,
      });
      toast.success(t("configSaved"));
    } catch (error) {
      console.error("Error saving SMS config:", error);
      toast.error(getApiErrorMessage(error, t("configSaveError")));
    } finally {
      setSaving(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Template editor (per-locale tabs; the single-segment limit is surfaced on
  // the raw text AND the preview, and enforced on save — never by discarding
  // what the user typed)
  // ---------------------------------------------------------------------------

  const currentText = texts[activeLocale] ?? "";
  const segmentLimit = smsSegmentLimit(currentText);
  const segmentLength = smsLength(currentText);
  const overLimit = segmentLength > segmentLimit;
  const tooShort = currentText.length < MIN_TEMPLATE_LENGTH;
  const isCustomized =
    !!templateData &&
    templateData.templates[activeLocale] !== undefined &&
    templateData.templates[activeLocale] !== templateData.default_templates[activeLocale];
  const isDirty = currentText !== (templateData?.templates[activeLocale] ?? templateData?.default_templates[activeLocale] ?? "");

  /**
   * Update the active tab's text unconditionally. Over-limit input is kept in
   * state (never silently dropped) and surfaced via the red counter; saving is
   * what blocks until the text fits one segment.
   */
  const setTemplateText = (next: string) => {
    setTexts((prev) => ({ ...prev, [activeLocale]: next }));
  };

  const handleSaveTemplate = async () => {
    if (overLimit) return; // visible in the red counter + disabled Save button
    if (tooShort) {
      // The Save button is disabled for this too; the toast is defense in
      // depth so the guard can never be a silent no-op.
      toast.error(tt("tooShort", { min: MIN_TEMPLATE_LENGTH }));
      return;
    }
    setSavingTemplate(true);
    try {
      const result = await apiClient.updateSmsTemplate({
        locale: activeLocale,
        template: currentText,
      });
      setTemplateData(result);
      setTexts(buildTexts(result));
      toast.success(tt("saved"));
    } catch (error) {
      console.error("Error saving template:", error);
      toast.error(getApiErrorMessage(error, tt("saveError")));
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleResetTemplate = async () => {
    setSavingTemplate(true);
    try {
      const result = await apiClient.resetSmsTemplate(activeLocale);
      setTemplateData(result);
      setTexts(buildTexts(result));
      toast.success(tt("resetDone"));
    } catch (error) {
      console.error("Error resetting template:", error);
      toast.error(getApiErrorMessage(error, tt("resetError")));
    } finally {
      setSavingTemplate(false);
    }
  };

  const insertTag = (tag: string) => {
    const textarea = templateRef.current;
    const start = textarea ? textarea.selectionStart : currentText.length;
    const end = textarea ? textarea.selectionEnd : currentText.length;
    const newText = currentText.slice(0, start) + tag + currentText.slice(end);
    // Accepted unconditionally (same policy as setTemplateText): an over-limit
    // insertion is surfaced by the red counter and blocks saving.
    setTexts((prev) => ({ ...prev, [activeLocale]: newText }));
    if (textarea) {
      // Restore cursor position after the inserted tag
      requestAnimationFrame(() => {
        textarea.focus();
        const pos = start + tag.length;
        textarea.setSelectionRange(pos, pos);
      });
    }
  };

  const preview =
    templateData?.available_tags.reduce(
      (text, tag) => text.replaceAll(tag.tag, tag.example),
      currentText
    ) ?? currentText;

  // The counter measures the RAW template, but at send time the tags are
  // substituted by real values: a template that fits one segment can still
  // overflow once expanded. Warn (don't block) when the preview exceeds.
  const previewOverflow =
    !overLimit && smsLength(preview) > smsSegmentLimit(preview);

  if (loading) {
    return (
      <AppWrapper>
        <div className="min-h-[400px] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
            <p className="text-muted-foreground">{t("loading")}</p>
          </div>
        </div>
      </AppWrapper>
    );
  }

  return (
    <AppWrapper>
      <div>
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <AiOutlineMessage className="text-3xl text-accent" />
            <h1 className="text-3xl font-bold text-foreground">{t("title")}</h1>
          </div>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>

        <div className="space-y-6 max-w-3xl">
          {/* Service status */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <AiOutlineMessage className="text-accent" />
              {t("serviceStatus")}
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Active/Inactive */}
              <div className="bg-muted/30 rounded-lg p-4 text-center">
                <p className="text-xs text-muted-foreground mb-2">{t("stateLabel")}</p>
                <div className="flex items-center justify-center gap-1">
                  {credits?.provider_enabled && formData.enabled ? (
                    <>
                      <AiOutlineCheckCircle className="text-xl text-green-600 dark:text-green-400" />
                      <span className="text-sm font-semibold text-green-600 dark:text-green-400">{tc("active")}</span>
                    </>
                  ) : (
                    <>
                      <AiOutlineCloseCircle className="text-xl text-muted-foreground" />
                      <span className="text-sm font-semibold text-muted-foreground">{tc("inactive")}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Credits */}
              <div className="bg-muted/30 rounded-lg p-4 text-center">
                <p className="text-xs text-muted-foreground mb-2">{t("creditsLabel")}</p>
                {credits ? (
                  <SmsCreditsBadge balance={credits.balance} currency={credits.currency} unlimited={credits.unlimited} />
                ) : (
                  <span className="text-sm text-muted-foreground">-</span>
                )}
              </div>

              {/* SMS this month */}
              <div className="bg-muted/30 rounded-lg p-4 text-center">
                <p className="text-xs text-muted-foreground mb-2">{t("thisMonthLabel")}</p>
                <p className="text-2xl font-bold text-foreground">
                  {stats ? stats.sent_this_month : "-"}
                </p>
              </div>

              {/* Pending */}
              <div className="bg-muted/30 rounded-lg p-4 text-center">
                <p className="text-xs text-muted-foreground mb-2">{t("pendingLabel")}</p>
                <p className={`text-2xl font-bold ${stats && stats.pending > 0 ? "text-yellow-600 dark:text-yellow-400" : "text-foreground"}`}>
                  {stats ? stats.pending : "-"}
                </p>
              </div>
            </div>

            {credits && !credits.provider_enabled && (
              <div className="mt-4 flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <AiOutlineCloseCircle className="text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  {t("providerNotConfigured", { env: "SMS_ENABLED=true" })}
                </p>
              </div>
            )}

            {stats && stats.failed_today > 0 && (
              <div className="mt-4 flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <AiOutlineCloseCircle className="text-destructive flex-shrink-0" />
                <p className="text-sm text-destructive">
                  {t("failedToday", { count: stats.failed_today })}{" "}
                  <Link href="/sms/history?status=failed" className="underline font-medium">
                    {t("viewDetails")}
                  </Link>
                </p>
              </div>
            )}
          </div>

          {/* Message template (per-locale tabs) */}
          {templateData && (
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-xl font-semibold text-foreground mb-1 flex items-center gap-2">
                <AiOutlineMessage className="text-accent" />
                {tt("title")}
              </h2>
              <p className="text-xs text-muted-foreground mb-4">{tt("companyLanguageNote")}</p>

              {/* Locale tabs */}
              <div role="tablist" aria-label={tt("tabsAria")} className="flex gap-1 border-b border-border mb-4">
                {templateData.supported_locales.map((locale) => {
                  const customized =
                    templateData.templates[locale] !== undefined &&
                    templateData.templates[locale] !== templateData.default_templates[locale];
                  const selected = locale === activeLocale;
                  return (
                    <button
                      key={locale}
                      role="tab"
                      aria-selected={selected}
                      type="button"
                      onClick={() => setActiveLocale(locale)}
                      className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 -mb-px transition-colors ${
                        selected
                          ? "border-accent text-accent"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {locale.toUpperCase()}
                      {customized && (
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-accent"
                          title={tt("customized")}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="space-y-4">
                {/* Customized / default indicator */}
                <div className="flex items-center justify-between">
                  <label htmlFor="sms_template" className="block text-sm font-medium text-foreground">
                    {tt("textLabel")} — {tc(`language.${activeLocale}`)}
                  </label>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      isCustomized
                        ? "bg-accent/10 text-accent border border-accent/20"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {isCustomized ? tt("customized") : tt("default")}
                  </span>
                </div>

                {/* Textarea (over-limit input is kept and flagged; saving is blocked) */}
                <div>
                  <textarea
                    ref={templateRef}
                    id="sms_template"
                    value={currentText}
                    onChange={(e) => setTemplateText(e.target.value)}
                    rows={4}
                    className={`w-full px-4 py-2 border bg-background rounded-lg focus:outline-none focus:ring-2 resize-vertical font-mono text-sm ${
                      overLimit
                        ? "border-destructive focus:ring-destructive"
                        : "border-input focus:ring-accent"
                    }`}
                    disabled={savingTemplate}
                  />
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-muted-foreground">{tt("encodingNote")}</p>
                    <p
                      className={`text-xs mt-1 text-right font-medium ${
                        overLimit ? "text-destructive" : isGsm7(currentText) ? "text-muted-foreground" : "text-yellow-600 dark:text-yellow-400"
                      }`}
                    >
                      {overLimit
                        ? tt("overLimit", { length: segmentLength, limit: segmentLimit })
                        : tt("counter", { length: segmentLength, limit: segmentLimit })}
                    </p>
                  </div>
                </div>

                {/* Available tags */}
                <div>
                  <p className="text-sm font-medium text-foreground mb-2">{tt("tagsTitle")}</p>
                  <div className="flex flex-wrap gap-2">
                    {templateData.available_tags.map((tag) => (
                      <button
                        key={tag.tag}
                        type="button"
                        title={tt("tagHint", { description: tag.description, example: tag.example })}
                        className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-colors"
                        onClick={() => insertTag(tag.tag)}
                      >
                        {tag.tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preview with sample values */}
                <div>
                  <p className="text-sm font-medium text-foreground mb-2">{tt("previewTitle")}</p>
                  <div className="bg-muted/30 border border-border rounded-lg p-4 text-sm text-foreground whitespace-pre-wrap">
                    {preview}
                  </div>
                  {previewOverflow && (
                    <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                      {tt("previewOverflow")}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 pt-2 border-t border-border">
                  <button
                    type="button"
                    disabled={savingTemplate || overLimit || tooShort || !isDirty}
                    onClick={handleSaveTemplate}
                    title={
                      overLimit
                        ? tt("overLimit", { length: segmentLength, limit: segmentLimit })
                        : tooShort
                        ? tt("tooShort", { min: MIN_TEMPLATE_LENGTH })
                        : undefined
                    }
                    className="bg-accent text-accent-foreground py-2 px-6 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {savingTemplate ? tt("saving") : tt("save")}
                  </button>

                  {isCustomized && (
                    <button
                      type="button"
                      disabled={savingTemplate}
                      onClick={handleResetTemplate}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {tt("reset")}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Reminder configuration */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <AiOutlineMessage className="text-accent" />
              {t("configTitle")}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Enable toggle */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="sms_enabled"
                  name="enabled"
                  checked={formData.enabled}
                  onChange={handleChange}
                  className="w-5 h-5 rounded border-input text-accent focus:ring-accent"
                />
                <label htmlFor="sms_enabled" className="text-sm font-medium text-foreground">
                  {t("enableReminders")}
                </label>
              </div>

              {/* Settings */}
              <div className="border-t border-border pt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="first_reminder_minutes" className="block text-sm font-medium text-foreground mb-2">
                      {t("firstReminder")}
                    </label>
                    <input
                      type="number"
                      id="first_reminder_minutes"
                      name="first_reminder_minutes"
                      value={formData.first_reminder_minutes}
                      onChange={handleChange}
                      min={30}
                      max={1440}
                      className="w-full px-4 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                      disabled={saving}
                    />
                    <p className="text-xs text-muted-foreground mt-1">{t("firstReminderHelp")}</p>
                  </div>

                  <div>
                    <label htmlFor="reminder_frequency_minutes" className="block text-sm font-medium text-foreground mb-2">
                      {t("frequency")}
                    </label>
                    <input
                      type="number"
                      id="reminder_frequency_minutes"
                      name="reminder_frequency_minutes"
                      value={formData.reminder_frequency_minutes}
                      onChange={handleChange}
                      min={30}
                      max={720}
                      className="w-full px-4 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                      disabled={saving}
                    />
                    <p className="text-xs text-muted-foreground mt-1">{t("frequencyHelp")}</p>
                  </div>

                  <div>
                    <label htmlFor="max_reminders_per_day" className="block text-sm font-medium text-foreground mb-2">
                      {t("maxPerDay")}
                    </label>
                    <input
                      type="number"
                      id="max_reminders_per_day"
                      name="max_reminders_per_day"
                      value={formData.max_reminders_per_day}
                      onChange={handleChange}
                      min={1}
                      max={20}
                      className="w-full px-4 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                      disabled={saving}
                    />
                    <p className="text-xs text-muted-foreground mt-1">{t("maxPerDayHelp")}</p>
                  </div>
                </div>

                <div className="border-t border-border pt-4">
                  <h3 className="text-sm font-semibold text-foreground mb-3">{t("activeHours")}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="active_hours_start" className="block text-sm font-medium text-foreground mb-2">
                        {t("startHour")}
                      </label>
                      <input
                        type="time"
                        id="active_hours_start"
                        name="active_hours_start"
                        value={formData.active_hours_start}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                        disabled={saving}
                      />
                    </div>

                    <div>
                      <label htmlFor="active_hours_end" className="block text-sm font-medium text-foreground mb-2">
                        {t("endHour")}
                      </label>
                      <input
                        type="time"
                        id="active_hours_end"
                        name="active_hours_end"
                        value={formData.active_hours_end}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                        disabled={saving}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{t("activeHoursHelp")}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 pt-4 border-t border-border">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-accent text-accent-foreground py-2 px-6 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? tc("saving") : t("saveConfig")}
                </button>

                <Link
                  href="/sms/history"
                  className="text-sm text-accent hover:underline"
                >
                  {t("viewHistory")}
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </AppWrapper>
  );
}
