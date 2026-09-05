"use client";

import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
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

const CURRENT_YEAR = new Date().getFullYear();

export default function ExportReportModal({
  isOpen,
  onClose,
  companies,
  defaultCompanyId,
}: ExportReportModalProps) {
  const t = useTranslations("reports.export");
  const tm = useTranslations("common.months");
  const [companyId, setCompanyId] = useState(defaultCompanyId ?? companies[0]?.id ?? "");
  const [year, setYear] = useState(() => getPreviousMonthDefaults().year);
  const [month, setMonth] = useState(() => getPreviousMonthDefaults().month);
  const [format, setFormat] = useState<"pdf" | "csv">("pdf");
  const [downloading, setDownloading] = useState(false);

  // Sync companyId when defaultCompanyId or companies change
  useEffect(() => {
    // TODO: derivar de props en render en vez de sincronizar por effect
    if (defaultCompanyId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCompanyId(defaultCompanyId);
    } else if (companies.length > 0) {
      setCompanyId((prev) => prev || companies[0].id);
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
      toast.error(t("selectCompanyError"));
      return;
    }
    if (year < 2020 || year > CURRENT_YEAR) {
      toast.error(t("invalidYearError"));
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
      toast.success(t("downloaded", { file: fileName }));
      onClose();
    } catch {
      toast.error(t("generateError"));
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
      <div
        className="relative bg-card border border-border rounded-xl shadow-xl w-full max-w-md mx-4 p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 id="export-modal-title" className="text-lg font-semibold text-foreground">
            {t("modalTitle")}
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted/50"
            aria-label={t("close")}
          >
            <AiOutlineClose className="text-xl" />
          </button>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {/* Company */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              {t("company")}
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
                {t("month")}
              </label>
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {tm(String(m))}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                {t("year")}
              </label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                min={2020}
                max={CURRENT_YEAR}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
              />
            </div>
          </div>

          {/* Format */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              {t("format")}
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
          {t("legalNote")}
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
              {t("generating")}
            </>
          ) : (
            <>
              <AiOutlineDownload className="text-base" />
              {t("download")}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
