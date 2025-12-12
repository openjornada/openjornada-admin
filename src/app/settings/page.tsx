"use client";

import { useState, useEffect } from "react";
import AppWrapper from "@/components/AppWrapper";
import { apiClient } from "@/lib/api-client";
import type { Settings } from "@/lib/api-client";
import toast from "react-hot-toast";
import { AiOutlineSetting } from "react-icons/ai";

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    contact_email: ""
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

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Trim whitespace
    const trimmedData = {
      contact_email: formData.contact_email.trim()
    };

    // Validation
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

        {/* Form */}
        <div className="bg-card border border-border rounded-lg p-6 max-w-2xl">
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

            <div className="pt-4">
              <button
                type="submit"
                disabled={saving}
                className="w-full bg-accent text-accent-foreground py-2 px-4 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-accent-foreground"></div>
                    Guardando...
                  </span>
                ) : (
                  "Guardar cambios"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppWrapper>
  );
}
