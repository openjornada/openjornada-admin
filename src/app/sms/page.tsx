"use client";

import { useState, useEffect, useRef } from "react";
import AppWrapper from "@/components/AppWrapper";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import type { SmsConfig, SmsCredits, SmsStats, SmsTemplateResponse } from "@/lib/api-client";
import toast from "react-hot-toast";
import { AiOutlineMessage, AiOutlineCheckCircle, AiOutlineCloseCircle } from "react-icons/ai";
import SmsCreditsBadge from "@/components/sms/SmsCreditsBadge";

export default function SmsPage() {
  const [config, setConfig] = useState<SmsConfig | null>(null);
  const [credits, setCredits] = useState<SmsCredits | null>(null);
  const [stats, setStats] = useState<SmsStats | null>(null);
  const [templateData, setTemplateData] = useState<SmsTemplateResponse | null>(null);
  const [templateText, setTemplateText] = useState("");
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
    fetchData();
  }, []);

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
        setTemplateData(templateResult.value);
        setTemplateText(templateResult.value.template);
      }
    } catch (error) {
      console.error("Error fetching SMS data:", error);
      toast.error("Error al cargar la configuración SMS");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? (e.target as HTMLInputElement).checked
          : type === "number"
          ? parseInt(value) || 0
          : value,
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
      toast.success("Configuración SMS guardada correctamente");
    } catch (error) {
      console.error("Error saving SMS config:", error);
      const detail = (error as { response?: { data?: { detail?: unknown } } }).response?.data?.detail;
      let message = "Error al guardar la configuración SMS";
      if (typeof detail === "string") {
        message = detail;
      } else if (Array.isArray(detail) && detail.length > 0) {
        message = detail.map((e: { msg?: string }) => e.msg || "").filter(Boolean).join("; ");
      }
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppWrapper>
        <div className="min-h-[400px] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
            <p className="text-muted-foreground">Cargando configuración SMS...</p>
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
            <h1 className="text-3xl font-bold text-foreground">Recordatorios SMS</h1>
          </div>
          <p className="text-muted-foreground">
            Configura el envío automático de recordatorios SMS a los trabajadores
          </p>
        </div>

        <div className="space-y-6 max-w-3xl">
          {/* Estado del servicio */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <AiOutlineMessage className="text-accent" />
              Estado del servicio SMS
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Activo/Inactivo */}
              <div className="bg-muted/30 rounded-lg p-4 text-center">
                <p className="text-xs text-muted-foreground mb-2">Estado</p>
                <div className="flex items-center justify-center gap-1">
                  {credits?.provider_enabled && formData.enabled ? (
                    <>
                      <AiOutlineCheckCircle className="text-xl text-green-600 dark:text-green-400" />
                      <span className="text-sm font-semibold text-green-600 dark:text-green-400">Activo</span>
                    </>
                  ) : (
                    <>
                      <AiOutlineCloseCircle className="text-xl text-muted-foreground" />
                      <span className="text-sm font-semibold text-muted-foreground">Inactivo</span>
                    </>
                  )}
                </div>
              </div>

              {/* Créditos */}
              <div className="bg-muted/30 rounded-lg p-4 text-center">
                <p className="text-xs text-muted-foreground mb-2">Créditos</p>
                {credits ? (
                  <SmsCreditsBadge balance={credits.balance} currency={credits.currency} unlimited={credits.unlimited} />
                ) : (
                  <span className="text-sm text-muted-foreground">-</span>
                )}
              </div>

              {/* SMS este mes */}
              <div className="bg-muted/30 rounded-lg p-4 text-center">
                <p className="text-xs text-muted-foreground mb-2">Este mes</p>
                <p className="text-2xl font-bold text-foreground">
                  {stats ? stats.sent_this_month : "-"}
                </p>
              </div>

              {/* Pendientes */}
              <div className="bg-muted/30 rounded-lg p-4 text-center">
                <p className="text-xs text-muted-foreground mb-2">Pendientes</p>
                <p className={`text-2xl font-bold ${stats && stats.pending > 0 ? "text-yellow-600 dark:text-yellow-400" : "text-foreground"}`}>
                  {stats ? stats.pending : "-"}
                </p>
              </div>
            </div>

            {credits && !credits.provider_enabled && (
              <div className="mt-4 flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <AiOutlineCloseCircle className="text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  El proveedor SMS no está configurado. Activa la variable de entorno <code className="bg-yellow-100 dark:bg-yellow-900/40 px-1 rounded">SMS_ENABLED=true</code> y configura las credenciales del proveedor para habilitar el envío de SMS.
                </p>
              </div>
            )}

            {stats && stats.failed_today > 0 && (
              <div className="mt-4 flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <AiOutlineCloseCircle className="text-destructive flex-shrink-0" />
                <p className="text-sm text-destructive">
                  Hay <strong>{stats.failed_today}</strong> SMS fallidos hoy.{" "}
                  <Link href="/sms/history?status=failed" className="underline font-medium">
                    Ver detalles
                  </Link>
                </p>
              </div>
            )}
          </div>

          {/* Plantilla del mensaje */}
          {templateData && (
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                <AiOutlineMessage className="text-accent" />
                Plantilla del mensaje
              </h2>

              <div className="space-y-4">
                {/* Textarea */}
                <div>
                  <label htmlFor="sms_template" className="block text-sm font-medium text-foreground mb-2">
                    Texto del SMS
                  </label>
                  <textarea
                    ref={templateRef}
                    id="sms_template"
                    value={templateText}
                    onChange={(e) => setTemplateText(e.target.value)}
                    maxLength={480}
                    rows={4}
                    className="w-full px-4 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-accent resize-vertical font-mono text-sm"
                    disabled={savingTemplate}
                  />
                  <p className="text-xs text-muted-foreground mt-1 text-right">
                    {templateText.length}/480
                  </p>
                </div>

                {/* Etiquetas disponibles */}
                <div>
                  <p className="text-sm font-medium text-foreground mb-2">Etiquetas disponibles</p>
                  <div className="flex flex-wrap gap-2">
                    {templateData.available_tags.map((tag) => (
                      <button
                        key={tag.tag}
                        type="button"
                        title={`${tag.description} (ej: ${tag.example})`}
                        className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-colors"
                        onClick={() => {
                          const textarea = templateRef.current;
                          if (!textarea) return;
                          const start = textarea.selectionStart;
                          const end = textarea.selectionEnd;
                          const newText = templateText.slice(0, start) + tag.tag + templateText.slice(end);
                          if (newText.length <= 480) {
                            setTemplateText(newText);
                            // Restore cursor position after the inserted tag
                            requestAnimationFrame(() => {
                              textarea.focus();
                              const pos = start + tag.tag.length;
                              textarea.setSelectionRange(pos, pos);
                            });
                          }
                        }}
                      >
                        {tag.tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Vista previa */}
                <div>
                  <p className="text-sm font-medium text-foreground mb-2">Vista previa</p>
                  <div className="bg-muted/30 border border-border rounded-lg p-4 text-sm text-foreground whitespace-pre-wrap">
                    {templateData.available_tags.reduce(
                      (text, tag) => text.replaceAll(tag.tag, tag.example),
                      templateText
                    )}
                  </div>
                </div>

                {/* Botones */}
                <div className="flex items-center gap-3 pt-2 border-t border-border">
                  <button
                    type="button"
                    disabled={savingTemplate}
                    onClick={async () => {
                      setSavingTemplate(true);
                      try {
                        const result = await apiClient.updateSmsTemplate({ template: templateText });
                        setTemplateData(result);
                        setTemplateText(result.template);
                        toast.success("Plantilla guardada correctamente");
                      } catch (error) {
                        console.error("Error saving template:", error);
                        const message =
                          (error as { response?: { data?: { detail?: string } } }).response?.data?.detail ||
                          "Error al guardar la plantilla";
                        toast.error(message);
                      } finally {
                        setSavingTemplate(false);
                      }
                    }}
                    className="bg-accent text-accent-foreground py-2 px-6 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {savingTemplate ? "Guardando..." : "Guardar plantilla"}
                  </button>

                  {templateText !== templateData.default_template && (
                    <button
                      type="button"
                      disabled={savingTemplate}
                      onClick={async () => {
                        setSavingTemplate(true);
                        try {
                          const result = await apiClient.resetSmsTemplate();
                          setTemplateData(result);
                          setTemplateText(result.template);
                          toast.success("Plantilla restaurada por defecto");
                        } catch (error) {
                          console.error("Error resetting template:", error);
                          toast.error("Error al restaurar la plantilla");
                        } finally {
                          setSavingTemplate(false);
                        }
                      }}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Restaurar por defecto
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Configuración de recordatorios */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <AiOutlineMessage className="text-accent" />
              Configuración de Recordatorios
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Toggle activar */}
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
                  Activar recordatorios SMS automáticos
                </label>
              </div>

              {/* Settings */}
              <div className="border-t border-border pt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="first_reminder_minutes" className="block text-sm font-medium text-foreground mb-2">
                      Primer recordatorio (minutos)
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
                    <p className="text-xs text-muted-foreground mt-1">
                      Minutos después del inicio de jornada sin registrar
                    </p>
                  </div>

                  <div>
                    <label htmlFor="reminder_frequency_minutes" className="block text-sm font-medium text-foreground mb-2">
                      Frecuencia de recordatorios (minutos)
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
                    <p className="text-xs text-muted-foreground mt-1">
                      Intervalo entre recordatorios sucesivos
                    </p>
                  </div>

                  <div>
                    <label htmlFor="max_reminders_per_day" className="block text-sm font-medium text-foreground mb-2">
                      Máximo por día
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
                    <p className="text-xs text-muted-foreground mt-1">
                      Número máximo de SMS por trabajador por día
                    </p>
                  </div>
                </div>

                <div className="border-t border-border pt-4">
                  <h3 className="text-sm font-semibold text-foreground mb-3">Horario activo</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="active_hours_start" className="block text-sm font-medium text-foreground mb-2">
                        Hora de inicio
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
                        Hora de fin
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
                  <p className="text-xs text-muted-foreground mt-2">
                    Solo se enviarán recordatorios dentro de este horario
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 pt-4 border-t border-border">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-accent text-accent-foreground py-2 px-6 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? "Guardando..." : "Guardar configuración"}
                </button>

                <Link
                  href="/sms/history"
                  className="text-sm text-accent hover:underline"
                >
                  Ver historial de SMS →
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </AppWrapper>
  );
}
