"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import AppWrapper from "@/components/AppWrapper";
import Link from "next/link";
import Papa from "papaparse";
import { apiClient } from "@/lib/api-client";
import type {
  WorkerImportRow,
  WorkerImportRowResult,
  WorkerBulkImportResponse,
} from "@/lib/api-client";
import { appConfig } from "@/lib/config";
import toast from "react-hot-toast";
import { getApiErrorMessage } from "@/lib/error-messages";
import {
  AiOutlineArrowLeft,
  AiOutlineUpload,
  AiOutlineDownload,
  AiOutlineFileText,
} from "react-icons/ai";

const MAX_ROWS = 200;
const REQUIRED_COLUMNS = ["first_name", "last_name", "email", "id_number", "empresas"];
const CSV_COLUMNS = ["first_name", "last_name", "email", "phone_number", "id_number", "empresas", "default_timezone"];

type CsvRow = Record<string, string>;

const STATUS_STYLES: Record<WorkerImportRowResult["status"], string> = {
  created: "bg-green-100 text-green-800 border-green-200",
  skipped_duplicate: "bg-amber-100 text-amber-800 border-amber-200",
  error: "bg-red-100 text-red-800 border-red-200",
};

const parseColumns = (row: CsvRow): string[] =>
  (row.empresas ?? "").split("|").map((c) => c.trim()).filter(Boolean);

const toImportRows = (csvRows: CsvRow[]): WorkerImportRow[] =>
  csvRows.map((row) => ({
    first_name: (row.first_name ?? "").trim(),
    last_name: (row.last_name ?? "").trim(),
    email: (row.email ?? "").trim(),
    phone_number: (row.phone_number ?? "").trim(),
    id_number: (row.id_number ?? "").trim(),
    company_names: parseColumns(row),
    default_timezone: (row.default_timezone ?? "").trim() || "UTC",
  }));

export default function ImportWorkersPage() {
  const t = useTranslations("importWorkers");
  const ts = useTranslations("importWorkers.status");
  const tc = useTranslations("common");
  const [fileName, setFileName] = useState("");
  const [csvRows, setCsvRows] = useState<CsvRow[]>([]);
  const [sendWelcomeEmail, setSendWelcomeEmail] = useState(false);
  const [preview, setPreview] = useState<WorkerBulkImportResponse | null>(null);
  const [finalResult, setFinalResult] = useState<WorkerBulkImportResponse | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [importing, setImporting] = useState(false);

  const statusLabel = (status: WorkerImportRowResult["status"], dryRun: boolean): string => {
    switch (status) {
      case "created":
        return dryRun ? ts("wouldCreate") : ts("created");
      case "skipped_duplicate":
        return dryRun ? ts("duplicateWouldSkip") : ts("duplicateSkipped");
      case "error":
        return ts("error");
    }
  };

  const resetAll = () => {
    setFileName("");
    setCsvRows([]);
    setPreview(null);
    setFinalResult(null);
    setSendWelcomeEmail(false);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
      complete: (result) => {
        const fields = result.meta.fields ?? [];
        const missing = REQUIRED_COLUMNS.filter((col) => !fields.includes(col));
        if (missing.length > 0) {
          toast.error(t("missingColumns", { columns: missing.join(", ") }));
          return;
        }
        if (result.data.length === 0) {
          toast.error(t("emptyCsv"));
          return;
        }
        if (result.data.length > MAX_ROWS) {
          toast.error(t("tooManyRows", { count: result.data.length, max: MAX_ROWS }));
          return;
        }
        setFileName(file.name);
        setCsvRows(result.data);
        setPreview(null);
        setFinalResult(null);
      },
      error: () => {
        toast.error(t("parseError"));
      },
    });
  };

  const runDryPreview = async (): Promise<WorkerBulkImportResponse | null> => {
    try {
      return await apiClient.bulkImportWorkers({
        rows: toImportRows(csvRows),
        dry_run: true,
        send_welcome_email: sendWelcomeEmail,
      });
    } catch (error) {
      console.error("Error en previsualización de importación:", error);
      toast.error(getApiErrorMessage(error, t("previewError")));
      return null;
    }
  };

  const handlePreview = async () => {
    setPreviewing(true);
    try {
      const response = await runDryPreview();
      if (response) setPreview(response);
    } finally {
      setPreviewing(false);
    }
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      const response = await apiClient.bulkImportWorkers({
        rows: toImportRows(csvRows),
        dry_run: false,
        send_welcome_email: sendWelcomeEmail,
      });
      setFinalResult(response);
      toast.success(t("imported"));
    } catch (error) {
      console.error("Error en importación:", error);
      toast.error(getApiErrorMessage(error, t("importError")));
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadErrorReport = () => {
    const result = finalResult;
    if (!result) return;
    const problemRows = result.results.filter(
      (r) => r.status === "error" || r.status === "skipped_duplicate"
    );
    const report = problemRows.map((r) => {
      const original = csvRows[r.row_index] ?? {};
      return {
        ...Object.fromEntries(CSV_COLUMNS.map((col) => [col, original[col] ?? ""])),
        [t("errorReportEstado")]: statusLabel(r.status, false),
        [t("errorReportMotivo")]: r.detail ?? "",
      };
    });
    const csv = "\uFEFF" + Papa.unparse(report); // BOM para que Excel lea los acentos correctamente
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = t("errorReportFile");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const shown = finalResult ?? preview;
  const isDryRun = !finalResult && !!preview;

  return (
    <AppWrapper>
      <div>
        {/* Header */}
        <div className="mb-6">
          <Link href="/settings" className="inline-flex items-center gap-2 text-accent hover:underline mb-4">
            <AiOutlineArrowLeft />
            <span>{t("backToSettings")}</span>
          </Link>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <AiOutlineUpload />
            {t("title")}
          </h1>
          <p className="text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>

        <div className="space-y-6 max-w-5xl">
          {/* Step 1: Template + columns explanation */}
          {!shown && (
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                <AiOutlineFileText className="text-accent" />
                {t("step1")}
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                {t("step1Help", { max: MAX_ROWS })}
              </p>
              <a
                href={`${appConfig.basePath}/plantilla-trabajadores.csv`}
                download
                className="inline-flex items-center gap-2 bg-secondary text-secondary-foreground py-2 px-4 rounded-lg font-medium hover:opacity-90 transition-opacity mb-6"
              >
                <AiOutlineDownload />
                <span>{t("downloadTemplate")}</span>
              </a>

              <div className="overflow-x-auto border border-border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-muted-foreground">{t("colColumn")}</th>
                      <th className="px-4 py-2 text-left font-medium text-muted-foreground">{t("colDescription")}</th>
                      <th className="px-4 py-2 text-left font-medium text-muted-foreground">{t("colRequired")}</th>
                    </tr>
                  </thead>
                  <tbody className="bg-card divide-y divide-border">
                    <tr>
                      <td className="px-4 py-2 font-mono text-foreground">first_name</td>
                      <td className="px-4 py-2 text-muted-foreground">{t("columns.firstName")}</td>
                      <td className="px-4 py-2 text-muted-foreground">{tc("yes")}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-mono text-foreground">last_name</td>
                      <td className="px-4 py-2 text-muted-foreground">{t("columns.lastName")}</td>
                      <td className="px-4 py-2 text-muted-foreground">{tc("yes")}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-mono text-foreground">email</td>
                      <td className="px-4 py-2 text-muted-foreground">{t("columns.email")}</td>
                      <td className="px-4 py-2 text-muted-foreground">{tc("yes")}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-mono text-foreground">phone_number</td>
                      <td className="px-4 py-2 text-muted-foreground">{t("columns.phone")}</td>
                      <td className="px-4 py-2 text-muted-foreground">{tc("no")}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-mono text-foreground">id_number</td>
                      <td className="px-4 py-2 text-muted-foreground">{t("columns.idNumber")}</td>
                      <td className="px-4 py-2 text-muted-foreground">{tc("yes")}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-mono text-foreground">empresas</td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {t("columns.companies")}
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">{tc("yes")}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-mono text-foreground">default_timezone</td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {t("columns.timezone")}
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">{tc("no")}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Step 2: Upload */}
          {!shown && (
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">{t("step2")}</h2>
              <div className="flex flex-wrap items-center gap-6">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFile}
                  className="text-sm text-muted-foreground file:mr-3 file:px-4 file:py-2 file:rounded-lg file:border-0 file:bg-accent file:text-accent-foreground file:font-medium hover:file:opacity-90"
                />
                {csvRows.length > 0 && (
                  <span className="text-sm text-foreground">
                    {t("rowsRead", { file: fileName, count: csvRows.length })}
                  </span>
                )}
              </div>
              <label className="flex items-center gap-2 mt-4">
                <input
                  type="checkbox"
                  checked={sendWelcomeEmail}
                  onChange={(e) => setSendWelcomeEmail(e.target.checked)}
                  className="w-5 h-5 rounded border-input text-accent focus:ring-accent"
                />
                <span className="text-sm font-medium text-foreground">{t("sendWelcome")}</span>
              </label>
              <p className="text-xs text-muted-foreground mt-1 ml-7 max-w-xl">
                {t("welcomeHelp")}
              </p>
              <div className="mt-6">
                <button
                  type="button"
                  onClick={handlePreview}
                  disabled={csvRows.length === 0 || previewing}
                  className="bg-accent text-accent-foreground py-2 px-6 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {previewing ? t("previewing") : t("previewBtn")}
                </button>
                {csvRows.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {t("selectFileHint")}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Preview summary counters */}
          {shown && (
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
                <h2 className="text-xl font-semibold text-foreground">
                  {finalResult ? t("resultTitle") : t("previewTitle")}
                </h2>
                <span className="text-sm text-muted-foreground">{fileName}</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-muted/30 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-foreground">{shown.total}</p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">{t("statTotal")}</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-green-800 dark:text-green-200">{shown.created}</p>
                  <p className="text-xs text-green-700 dark:text-green-300 uppercase tracking-wider">
                    {isDryRun ? t("statWouldCreate") : t("statCreated")}
                  </p>
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-amber-800 dark:text-amber-200">{shown.skipped}</p>
                  <p className="text-xs text-amber-700 dark:text-amber-300 uppercase tracking-wider">{t("statSkipped")}</p>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-red-800 dark:text-red-200">{shown.errors}</p>
                  <p className="text-xs text-red-700 dark:text-red-300 uppercase tracking-wider">{t("statErrors")}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t border-border">
                {!finalResult ? (
                  <>
                    <button
                      type="button"
                      onClick={handleImport}
                      disabled={shown.created === 0 || importing}
                      className="bg-accent text-accent-foreground py-2 px-6 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {importing ? t("importing") : t("importBtn")}
                    </button>
                    <button
                      type="button"
                      onClick={resetAll}
                      className="bg-secondary text-secondary-foreground py-2 px-6 rounded-lg font-medium hover:opacity-90 transition-opacity"
                    >
                      {tc("cancel")}
                    </button>
                  </>
                ) : (
                  <>
                    {finalResult.results.some((r) => r.status !== "created") && (
                      <button
                        type="button"
                        onClick={handleDownloadErrorReport}
                        className="inline-flex items-center gap-2 bg-secondary text-secondary-foreground py-2 px-6 rounded-lg font-medium hover:opacity-90 transition-opacity"
                      >
                        <AiOutlineDownload />
                        <span>{t("downloadErrorReport")}</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={async () => {
                        setImporting(true);
                        try {
                          const response = await runDryPreview();
                          if (response) {
                            setFinalResult(null);
                            setPreview(response);
                          }
                        } finally {
                          setImporting(false);
                        }
                      }}
                      disabled={importing}
                      className="bg-accent text-accent-foreground py-2 px-6 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {t("recheck")}
                    </button>
                    <button
                      type="button"
                      onClick={resetAll}
                      className="bg-secondary text-secondary-foreground py-2 px-6 rounded-lg font-medium hover:opacity-90 transition-opacity"
                    >
                      {t("newImport")}
                    </button>
                  </>
                )}
              </div>
              {!finalResult && shown.created === 0 && (
                <p className="text-sm text-muted-foreground mt-3">
                  {t("nothingToCreate")}
                </p>
              )}
            </div>
          )}

          {/* Results table */}
          {shown && (
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">#</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("tableCols.name")}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("tableCols.email")}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("tableCols.dni")}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("tableCols.companies")}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("tableCols.timezone")}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("tableCols.status")}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("tableCols.detail")}</th>
                    </tr>
                  </thead>
                  <tbody className="bg-card divide-y divide-border">
                    {shown.results.map((r) => {
                      const original = csvRows[r.row_index] ?? {};
                      return (
                        <tr key={r.row_index} className="hover:bg-muted/50 transition-colors">
                          <td className="px-4 py-3 text-sm text-muted-foreground">{r.row_index + 1}</td>
                          <td className="px-4 py-3 text-sm font-medium text-foreground whitespace-nowrap">
                            {(original.first_name ?? "") + " " + (original.last_name ?? "")}
                          </td>
                          <td className="px-4 py-3 text-sm text-foreground">{r.email || original.email || "—"}</td>
                          <td className="px-4 py-3 text-sm text-foreground">{original.id_number || "—"}</td>
                          <td className="px-4 py-3 text-sm text-foreground">{original.empresas || "—"}</td>
                          <td className="px-4 py-3 text-sm text-foreground">{original.default_timezone || "UTC"}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[r.status]}`}
                            >
                              {statusLabel(r.status, isDryRun)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{r.detail || "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppWrapper>
  );
}
