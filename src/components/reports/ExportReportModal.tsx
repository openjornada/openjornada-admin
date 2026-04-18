"use client";

import React, { useState, useEffect } from "react";
import { apiClient } from "@/lib/api-client";
import toast from "react-hot-toast";
import { AiOutlineClose, AiOutlineDownload, AiOutlineLoading3Quarters } from "react-icons/ai";

interface ExportReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  companies: { id: string; name: string }[];
  defaultCompanyId?: string;
}

function getPreviousMonthDefaults(): { year: number; month: number } {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

export default function ExportReportModal({
  isOpen,
  onClose,
  companies,
  defaultCompanyId,
}: ExportReportModalProps) {
  const defaults = getPreviousMonthDefaults();

  const [companyId, setCompanyId] = useState(defaultCompanyId ?? companies[0]?.id ?? "");
  const [year, setYear] = useState(defaults.year);
  const [month, setMonth] = useState(defaults.month);
  const [format, setFormat] = useState<"pdf" | "csv">("pdf");
  const [downloading, setDownloading] = useState(false);

  // Sync companyId when defaultCompanyId or companies change
  useEffect(() => {
    if (defaultCompanyId) {
      setCompanyId(defaultCompanyId);
    } else if (companies.length > 0 && !companyId) {
      setCompanyId(companies[0].id);
    }
  }, [defaultCompanyId, companies]);

  if (!isOpen) return null;

  const selectedCompany = companies.find((c) => c.id === companyId);
  const monthPadded = String(month).padStart(2, "0");
  const companySlug = selectedCompany?.name
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "") ?? "empresa";
  const fileName = `informe_jornada_${companySlug}_${year}-${monthPadded}.${format}`;

  const handleDownload = async () => {
    if (!companyId) {
      toast.error("Selecciona una empresa");
      return;
    }
    setDownloading(true);
    try {
      await apiClient.exportMonthlyReport({
        company_id: companyId,
        year,
        month,
        format,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      toast.success(`Descargado: ${fileName}`);
      onClose();
    } catch {
      toast.error("Error al generar el informe. Inténtalo de nuevo.");
    } finally {
      setDownloading(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="relative bg-card border border-border rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-foreground">
            Exportar informe de jornada
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted/50"
            aria-label="Cerrar"
          >
            <AiOutlineClose className="text-xl" />
          </button>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {/* Company */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Empresa
            </label>
            <select
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Month and year */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Mes
              </label>
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
              >
                {[
                  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
                  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
                ].map((name, i) => (
                  <option key={i + 1} value={i + 1}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Año
              </label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                min={2020}
                max={new Date().getFullYear()}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
              />
            </div>
          </div>

          {/* Format */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Formato
            </label>
            <div className="flex gap-3">
              {(["pdf", "csv"] as const).map((f) => (
                <label
                  key={f}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer text-sm transition-colors ${
                    format === f
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border text-foreground hover:bg-muted/30"
                  }`}
                >
                  <input
                    type="radio"
                    name="format"
                    value={f}
                    checked={format === f}
                    onChange={() => setFormat(f)}
                    className="sr-only"
                  />
                  {f.toUpperCase()}
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Legal banner */}
        <div className="mt-5 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
          Este informe incluye el historial completo de modificaciones aprobadas.
          Guarda una copia firmada en los archivos de la empresa (obligatorio art. 34.9 ET, conservación 4 años).
        </div>

        {/* Download button */}
        <button
          onClick={handleDownload}
          disabled={downloading || !companyId}
          className="mt-5 w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {downloading ? (
            <>
              <AiOutlineLoading3Quarters className="animate-spin text-base" />
              Generando...
            </>
          ) : (
            <>
              <AiOutlineDownload className="text-base" />
              Descargar informe
            </>
          )}
        </button>
      </div>
    </div>
  );
}
