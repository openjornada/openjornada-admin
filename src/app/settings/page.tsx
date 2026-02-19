"use client";

import { useState, useEffect } from "react";
import AppWrapper from "@/components/AppWrapper";
import { apiClient } from "@/lib/api-client";
import type { Settings, BackupConfigInput, BackupSchedule } from "@/lib/api-client";
import toast from "react-hot-toast";
import { AiOutlineSetting, AiOutlineCloudServer, AiOutlineDatabase } from "react-icons/ai";
import Link from "next/link";

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingBackup, setSavingBackup] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);

  // General settings form
  const [formData, setFormData] = useState({
    contact_email: ""
  });

  // Backup settings form
  const [backupForm, setBackupForm] = useState<{
    enabled: boolean;
    frequency: "daily" | "weekly" | "monthly";
    time: string;
    day_of_week: number;
    day_of_month: number;
    retention_days: number;
    storage_type: "s3" | "sftp" | "local";
    // S3
    s3_endpoint_url: string;
    s3_bucket_name: string;
    s3_access_key_id: string;
    s3_secret_access_key: string;
    s3_region: string;
    // SFTP
    sftp_host: string;
    sftp_port: number;
    sftp_username: string;
    sftp_password: string;
    sftp_remote_path: string;
    // Local
    local_path: string;
  }>({
    enabled: false,
    frequency: "daily",
    time: "00:00",
    day_of_week: 0,
    day_of_month: 1,
    retention_days: 730,
    storage_type: "local",
    s3_endpoint_url: "",
    s3_bucket_name: "",
    s3_access_key_id: "",
    s3_secret_access_key: "",
    s3_region: "us-west-004",
    sftp_host: "",
    sftp_port: 22,
    sftp_username: "",
    sftp_password: "",
    sftp_remote_path: "/backups/openjornada/",
    local_path: "/app/backups"
  });

  // Load settings on mount
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getSettings();
      setSettings(data);
      setFormData({
        contact_email: data.contact_email
      });

      // Load backup config if exists
      if (data.backup_config) {
        const bc = data.backup_config;
        setBackupForm(prev => ({
          ...prev,
          enabled: bc.enabled,
          frequency: bc.schedule?.frequency || "daily",
          time: bc.schedule?.time || "00:00",
          day_of_week: bc.schedule?.day_of_week ?? 0,
          day_of_month: bc.schedule?.day_of_month ?? 1,
          retention_days: bc.retention_days,
          storage_type: bc.storage_type,
          s3_endpoint_url: bc.s3_endpoint || "",
          s3_bucket_name: bc.s3_bucket || "",
          sftp_host: bc.sftp_host || "",
          sftp_remote_path: bc.sftp_path || "/backups/openjornada/",
          local_path: bc.local_path || "/app/backups"
        }));
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("Error al cargar la configuración");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleBackupChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setBackupForm(prev => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked :
              type === "number" ? parseInt(value) || 0 : value
    }));
  };

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedData = {
      contact_email: formData.contact_email.trim()
    };

    if (!trimmedData.contact_email || !isValidEmail(trimmedData.contact_email)) {
      toast.error("Email de contacto no válido");
      return;
    }

    setSaving(true);

    try {
      const updatedSettings = await apiClient.updateSettings(trimmedData);
      setSettings(updatedSettings);
      setFormData({
        contact_email: updatedSettings.contact_email
      });
      toast.success("Configuración guardada correctamente");
    } catch (error) {
      console.error("Error updating settings:", error);
      const message = (error as { response?: { data?: { detail?: string } } }).response?.data?.detail || "Error al guardar la configuración";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleBackupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBackup(true);

    try {
      const schedule: BackupSchedule = {
        frequency: backupForm.frequency,
        time: backupForm.time,
        day_of_week: backupForm.day_of_week,
        day_of_month: backupForm.day_of_month
      };

      const backupConfig: BackupConfigInput = {
        enabled: backupForm.enabled,
        schedule: schedule,
        retention_days: backupForm.retention_days,
        storage_type: backupForm.storage_type
      };

      // Add storage-specific config
      if (backupForm.storage_type === "s3" && backupForm.s3_access_key_id) {
        backupConfig.s3_config = {
          endpoint_url: backupForm.s3_endpoint_url,
          bucket_name: backupForm.s3_bucket_name,
          access_key_id: backupForm.s3_access_key_id,
          secret_access_key: backupForm.s3_secret_access_key,
          region: backupForm.s3_region
        };
      }

      if (backupForm.storage_type === "sftp" && backupForm.sftp_password) {
        backupConfig.sftp_config = {
          host: backupForm.sftp_host,
          port: backupForm.sftp_port,
          username: backupForm.sftp_username,
          password: backupForm.sftp_password,
          remote_path: backupForm.sftp_remote_path
        };
      }

      if (backupForm.storage_type === "local") {
        backupConfig.local_config = {
          path: backupForm.local_path
        };
      }

      const updatedSettings = await apiClient.updateSettings({ backup_config: backupConfig });
      setSettings(updatedSettings);
      toast.success("Configuración de backup guardada");
    } catch (error) {
      console.error("Error updating backup settings:", error);
      const message = (error as { response?: { data?: { detail?: string } } }).response?.data?.detail || "Error al guardar configuración de backup";
      toast.error(message);
    } finally {
      setSavingBackup(false);
    }
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    try {
      const result = await apiClient.testBackupConnection({
        storage_type: backupForm.storage_type,
        s3_endpoint_url: backupForm.s3_endpoint_url,
        s3_bucket_name: backupForm.s3_bucket_name,
        s3_access_key_id: backupForm.s3_access_key_id,
        s3_secret_access_key: backupForm.s3_secret_access_key,
        s3_region: backupForm.s3_region,
        sftp_host: backupForm.sftp_host,
        sftp_port: backupForm.sftp_port,
        sftp_username: backupForm.sftp_username,
        sftp_password: backupForm.sftp_password,
        sftp_remote_path: backupForm.sftp_remote_path,
        local_path: backupForm.local_path
      });

      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      const message = (error as { response?: { data?: { detail?: string } } }).response?.data?.detail || "Error al probar conexión";
      toast.error(message);
    } finally {
      setTestingConnection(false);
    }
  };

  if (loading) {
    return (
      <AppWrapper>
        <div className="min-h-[400px] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
            <p className="text-muted-foreground">Cargando configuración...</p>
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
            <AiOutlineSetting className="text-3xl text-accent" />
            <h1 className="text-3xl font-bold text-foreground">Configuración de la aplicación</h1>
          </div>
          <p className="text-muted-foreground">Gestiona la configuración general del sistema</p>
        </div>

        <div className="space-y-8 max-w-3xl">
          {/* General Settings */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <AiOutlineSetting className="text-accent" />
              Configuración General
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="contact_email" className="block text-sm font-medium text-foreground mb-2">
                  Email de contacto para trabajadores <span className="text-destructive">*</span>
                </label>
                <input
                  type="email"
                  id="contact_email"
                  name="contact_email"
                  value={formData.contact_email}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                  placeholder="support@example.com"
                  required
                  disabled={saving}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Este email aparecerá en los correos de recuperación de contraseña
                </p>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-accent text-accent-foreground py-2 px-6 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>

          {/* Backup Settings */}
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <AiOutlineDatabase className="text-accent" />
                Copias de Seguridad
              </h2>
              <Link
                href="/backups"
                className="text-sm text-accent hover:underline"
              >
                Ver backups →
              </Link>
            </div>

            <form onSubmit={handleBackupSubmit} className="space-y-6">
              {/* Enable/Disable */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="backup_enabled"
                  name="enabled"
                  checked={backupForm.enabled}
                  onChange={handleBackupChange}
                  className="w-5 h-5 rounded border-input text-accent focus:ring-accent"
                />
                <label htmlFor="backup_enabled" className="text-sm font-medium text-foreground">
                  Activar backups automáticos
                </label>
              </div>

              {backupForm.enabled && (
                <>
                  {/* Schedule */}
                  <div className="border-t border-border pt-4">
                    <h3 className="text-sm font-semibold text-foreground mb-3">Programación</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">Frecuencia</label>
                        <select
                          name="frequency"
                          value={backupForm.frequency}
                          onChange={handleBackupChange}
                          className="w-full px-4 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                        >
                          <option value="daily">Diario</option>
                          <option value="weekly">Semanal</option>
                          <option value="monthly">Mensual</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">Hora (UTC)</label>
                        <input
                          type="time"
                          name="time"
                          value={backupForm.time}
                          onChange={handleBackupChange}
                          className="w-full px-4 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                        />
                      </div>

                      {backupForm.frequency === "weekly" && (
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">Día de la semana</label>
                          <select
                            name="day_of_week"
                            value={backupForm.day_of_week}
                            onChange={handleBackupChange}
                            className="w-full px-4 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                          >
                            <option value={0}>Lunes</option>
                            <option value={1}>Martes</option>
                            <option value={2}>Miércoles</option>
                            <option value={3}>Jueves</option>
                            <option value={4}>Viernes</option>
                            <option value={5}>Sábado</option>
                            <option value={6}>Domingo</option>
                          </select>
                        </div>
                      )}

                      {backupForm.frequency === "monthly" && (
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">Día del mes</label>
                          <input
                            type="number"
                            name="day_of_month"
                            value={backupForm.day_of_month}
                            onChange={handleBackupChange}
                            min={1}
                            max={28}
                            className="w-full px-4 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Retention */}
                  <div className="border-t border-border pt-4">
                    <h3 className="text-sm font-semibold text-foreground mb-3">Retención</h3>
                    <div className="max-w-xs">
                      <label className="block text-sm font-medium text-foreground mb-2">Días de retención</label>
                      <input
                        type="number"
                        name="retention_days"
                        value={backupForm.retention_days}
                        onChange={handleBackupChange}
                        min={1}
                        max={3650}
                        className="w-full px-4 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Los backups más antiguos se eliminarán automáticamente (730 días = 2 años)
                      </p>
                    </div>
                  </div>

                  {/* Storage Type */}
                  <div className="border-t border-border pt-4">
                    <h3 className="text-sm font-semibold text-foreground mb-3">Almacenamiento</h3>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-foreground mb-2">Tipo de almacenamiento</label>
                      <select
                        name="storage_type"
                        value={backupForm.storage_type}
                        onChange={handleBackupChange}
                        className="w-full max-w-xs px-4 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                      >
                        <option value="local">Local (servidor)</option>
                        <option value="s3">S3 (AWS, Backblaze B2, etc.)</option>
                        <option value="sftp">SFTP</option>
                      </select>
                    </div>

                    {/* S3 Config */}
                    {backupForm.storage_type === "s3" && (
                      <div className="bg-muted/30 rounded-lg p-4 space-y-4">
                        <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                          <AiOutlineCloudServer />
                          Configuración S3
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">Endpoint URL</label>
                            <input
                              type="url"
                              name="s3_endpoint_url"
                              value={backupForm.s3_endpoint_url}
                              onChange={handleBackupChange}
                              placeholder="https://s3.us-west-004.backblazeb2.com"
                              className="w-full px-4 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">Bucket</label>
                            <input
                              type="text"
                              name="s3_bucket_name"
                              value={backupForm.s3_bucket_name}
                              onChange={handleBackupChange}
                              placeholder="openjornada-backups"
                              className="w-full px-4 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">Access Key ID</label>
                            <input
                              type="text"
                              name="s3_access_key_id"
                              value={backupForm.s3_access_key_id}
                              onChange={handleBackupChange}
                              placeholder={settings?.backup_config?.s3_configured ? "••••••••" : ""}
                              className="w-full px-4 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">Secret Access Key</label>
                            <input
                              type="password"
                              name="s3_secret_access_key"
                              value={backupForm.s3_secret_access_key}
                              onChange={handleBackupChange}
                              placeholder={settings?.backup_config?.s3_configured ? "••••••••" : ""}
                              className="w-full px-4 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">Región</label>
                            <input
                              type="text"
                              name="s3_region"
                              value={backupForm.s3_region}
                              onChange={handleBackupChange}
                              placeholder="us-west-004"
                              className="w-full px-4 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                            />
                          </div>
                        </div>
                        {settings?.backup_config?.s3_configured && (
                          <p className="text-xs text-muted-foreground">
                            Deja los campos de credenciales vacíos para mantener las actuales
                          </p>
                        )}
                      </div>
                    )}

                    {/* SFTP Config */}
                    {backupForm.storage_type === "sftp" && (
                      <div className="bg-muted/30 rounded-lg p-4 space-y-4">
                        <h4 className="text-sm font-medium text-foreground">Configuración SFTP</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">Host</label>
                            <input
                              type="text"
                              name="sftp_host"
                              value={backupForm.sftp_host}
                              onChange={handleBackupChange}
                              placeholder="backup.example.com"
                              className="w-full px-4 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">Puerto</label>
                            <input
                              type="number"
                              name="sftp_port"
                              value={backupForm.sftp_port}
                              onChange={handleBackupChange}
                              className="w-full px-4 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">Usuario</label>
                            <input
                              type="text"
                              name="sftp_username"
                              value={backupForm.sftp_username}
                              onChange={handleBackupChange}
                              className="w-full px-4 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">Contraseña</label>
                            <input
                              type="password"
                              name="sftp_password"
                              value={backupForm.sftp_password}
                              onChange={handleBackupChange}
                              placeholder={settings?.backup_config?.sftp_configured ? "••••••••" : ""}
                              className="w-full px-4 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-foreground mb-2">Ruta remota</label>
                            <input
                              type="text"
                              name="sftp_remote_path"
                              value={backupForm.sftp_remote_path}
                              onChange={handleBackupChange}
                              placeholder="/backups/openjornada/"
                              className="w-full px-4 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Local Config */}
                    {backupForm.storage_type === "local" && (
                      <div className="bg-muted/30 rounded-lg p-4 space-y-4">
                        <h4 className="text-sm font-medium text-foreground">Configuración Local</h4>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">Ruta en el servidor</label>
                          <input
                            type="text"
                            name="local_path"
                            value={backupForm.local_path}
                            onChange={handleBackupChange}
                            placeholder="/app/backups"
                            className="w-full max-w-md px-4 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Esta ruta debe estar montada como volumen en Docker (bind mount al host)
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Actions */}
              <div className="flex items-center gap-4 pt-4 border-t border-border">
                <button
                  type="submit"
                  disabled={savingBackup}
                  className="bg-accent text-accent-foreground py-2 px-6 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingBackup ? "Guardando..." : "Guardar configuración"}
                </button>

                {backupForm.enabled && (
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={testingConnection}
                    className="bg-secondary text-secondary-foreground py-2 px-6 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {testingConnection ? "Probando..." : "Probar conexión"}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </AppWrapper>
  );
}
