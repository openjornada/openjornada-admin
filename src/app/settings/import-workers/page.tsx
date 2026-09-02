"use client";

import { useState } from "react";
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
import {
  AiOutlineArrowLeft,
  AiOutlineUpload,
  AiOutlineDownload,
  AiOutlineFileText,
} from "react-icons/ai";

const MAX_ROWS = 500;
const REQUIRED_COLUMNS = ["first_name", "last_name", "email", "id_number", "empresas"];
const CSV_COLUMNS = ["first_name", "last_name", "email", "phone_number", "id_number", "empresas", "default_timezone"];

type CsvRow = Record<string, string>;

const STATUS_STYLES: Record<WorkerImportRowResult["status"], string> = {
  created: "bg-green-100 text-green-800 border-green-200",
  skipped_duplicate: "bg-amber-100 text-amber-800 border-amber-200",
  error: "bg-red-100 text-red-800 border-red-200",
};

const statusLabel = (status: WorkerImportRowResult["status"], dryRun: boolean): string => {
  switch (status) {
    case "created":
      return dryRun ? "Se crearía" : "Creado";
    case "skipped_duplicate":
      return dryRun ? "Duplicado (se omitiría)" : "Duplicado (omitido)";
    case "error":
      return "Error";
  }
};

const parseColumns = (row: CsvRow): string[] =>
  (row.empresas ?? "").split("|").map((c) => c.trim()).filter(Boolean);

const toImportRows = (csvRows: CsvRow[]): WorkerImportRow[] =>
  csvRows.map((row) => ({
    first_name: (row.first_name ?? "").trim(),
    last_name: (row.last_name ?? "").trim(),
    email: (row.email ?? "").trim(),
    phone_number: (row.phone_number ?? "").trim() || undefined,
    id_number: (row.id_number ?? "").trim(),
    company_names: parseColumns(row),
    default_timezone: (row.default_timezone ?? "").trim() || "UTC",
  }));

export default function ImportWorkersPage() {
  const [fileName, setFileName] = useState("");
  const [csvRows, setCsvRows] = useState<CsvRow[]>([]);
  const [sendWelcomeEmail, setSendWelcomeEmail] = useState(false);
  const [preview, setPreview] = useState<WorkerBulkImportResponse | null>(null);
  const [finalResult, setFinalResult] = useState<WorkerBulkImportResponse | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [importing, setImporting] = useState(false);

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
          toast.error(
            `El CSV no tiene las columnas obligatorias: ${missing.join(", ")}. Descarga la plantilla y revisa la cabecera.`
          );
          return;
        }
        if (result.data.length === 0) {
          toast.error("El CSV no contiene ninguna fila de trabajadores");
          return;
        }
        if (result.data.length > MAX_ROWS) {
          toast.error(
            `El CSV tiene ${result.data.length} filas y el máximo por importación es ${MAX_ROWS}. Divide el archivo en varios CSV más pequeños.`
          );
          return;
        }
        setFileName(file.name);
        setCsvRows(result.data);
        setPreview(null);
        setFinalResult(null);
      },
      error: () => {
        toast.error("No se pudo leer el archivo CSV. Comprueba que el formato es correcto.");
      },
    });
  };

  const apiError = (error: unknown, fallback: string): string =>
    (error as { response?: { data?: { detail?: string } } }).response?.data?.detail || fallback;

  const runDryPreview = async (): Promise<WorkerBulkImportResponse | null> => {
    try {
      return await apiClient.bulkImportWorkers({
        rows: toImportRows(csvRows),
        dry_run: true,
        send_welcome_email: sendWelcomeEmail,
      });
    } catch (error) {
      console.error("Error en previsualización de importación:", error);
      toast.error(apiError(error, "Error al comprobar el CSV contra el servidor"));
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
      toast.success("Importación finalizada");
    } catch (error) {
      console.error("Error en importación:", error);
      toast.error(apiError(error, "Error al importar los trabajadores"));
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
        estado: statusLabel(r.status, false),
        motivo: r.detail ?? "",
      };
    });
    const csv = "\uFEFF" + Papa.unparse(report); // BOM para que Excel lea los acentos correctamente
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "informe-errores-importacion.csv";
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
            <span>Volver a configuración</span>
          </Link>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <AiOutlineUpload />
            Importar trabajadores (CSV)
          </h1>
          <p className="text-muted-foreground">
            Carga varios trabajadores a la vez desde un archivo CSV
          </p>
        </div>

        <div className="space-y-6 max-w-5xl">
          {/* Step 1: Template + columns explanation */}
          {!shown && (
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                <AiOutlineFileText className="text-accent" />
                1. Prepara el archivo CSV
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                Descarga la plantilla, rellena una fila por trabajador y súbela aquí. El máximo
                por importación es de {MAX_ROWS} filas: si tienes más trabajadores, divide el
                archivo en varios CSV e impórtalos por separado.
              </p>
              <a
                href={`${appConfig.basePath}/plantilla-trabajadores.csv`}
                download
                className="inline-flex items-center gap-2 bg-secondary text-secondary-foreground py-2 px-4 rounded-lg font-medium hover:opacity-90 transition-opacity mb-6"
              >
                <AiOutlineDownload />
                <span>Descargar plantilla</span>
              </a>

              <div className="overflow-x-auto border border-border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-muted-foreground">Columna</th>
                      <th className="px-4 py-2 text-left font-medium text-muted-foreground">Descripción</th>
                      <th className="px-4 py-2 text-left font-medium text-muted-foreground">Obligatoria</th>
                    </tr>
                  </thead>
                  <tbody className="bg-card divide-y divide-border">
                    <tr>
                      <td className="px-4 py-2 font-mono text-foreground">first_name</td>
                      <td className="px-4 py-2 text-muted-foreground">Nombre</td>
                      <td className="px-4 py-2 text-muted-foreground">Sí</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-mono text-foreground">last_name</td>
                      <td className="px-4 py-2 text-muted-foreground">Apellidos</td>
                      <td className="px-4 py-2 text-muted-foreground">Sí</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-mono text-foreground">email</td>
                      <td className="px-4 py-2 text-muted-foreground">Email (servirá de identificador de acceso)</td>
                      <td className="px-4 py-2 text-muted-foreground">Sí</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-mono text-foreground">phone_number</td>
                      <td className="px-4 py-2 text-muted-foreground">Teléfono (p. ej. +34600112233)</td>
                      <td className="px-4 py-2 text-muted-foreground">No</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-mono text-foreground">id_number</td>
                      <td className="px-4 py-2 text-muted-foreground">DNI/NIE</td>
                      <td className="px-4 py-2 text-muted-foreground">Sí</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-mono text-foreground">empresas</td>
                      <td className="px-4 py-2 text-muted-foreground">
                        Nombres de empresa; si son varias, sepáralos con | (p. ej.{" "}
                        <span className="font-mono">&quot;Empresa 1 S.L.|Empresa 2 S.L.&quot;</span>)
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">Sí</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-mono text-foreground">default_timezone</td>
                      <td className="px-4 py-2 text-muted-foreground">
                        Zona horaria (p. ej. Europe/Madrid). Vacío = UTC
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">No</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Step 2: Upload */}
          {!shown && (
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">2. Sube el CSV</h2>
              <div className="flex flex-wrap items-center gap-6">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFile}
                  className="text-sm text-muted-foreground file:mr-3 file:px-4 file:py-2 file:rounded-lg file:border-0 file:bg-accent file:text-accent-foreground file:font-medium hover:file:opacity-90"
                />
                {csvRows.length > 0 && (
                  <span className="text-sm text-foreground">
                    {fileName}: {csvRows.length} fila{csvRows.length === 1 ? "" : "s"} leída
                    {csvRows.length === 1 ? "" : "s"}
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
                <span className="text-sm font-medium text-foreground">Enviar email de bienvenida</span>
              </label>
              <p className="text-xs text-muted-foreground mt-1 ml-7 max-w-xl">
                Los trabajadores reciben un email con un enlace para establecer su propia contraseña.
                El CSV no incluye contraseñas por seguridad: se genera una provisional aleatoria y el
                enlace de bienvenida permite cambiarla en el primer acceso.
              </p>
              <div className="mt-6">
                <button
                  type="button"
                  onClick={handlePreview}
                  disabled={csvRows.length === 0 || previewing}
                  className="bg-accent text-accent-foreground py-2 px-6 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {previewing ? "Comprobando..." : "Previsualizar (comprobar)"}
                </button>
                {csvRows.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Selecciona primero un archivo CSV válido.
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
                  {finalResult ? "Resultado de la importación" : "Vista previa (sin cambios)"}
                </h2>
                <span className="text-sm text-muted-foreground">{fileName}</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-muted/30 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-foreground">{shown.total}</p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Total</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-green-800 dark:text-green-200">{shown.created}</p>
                  <p className="text-xs text-green-700 dark:text-green-300 uppercase tracking-wider">
                    {isDryRun ? "Se crearían" : "Creados"}
                  </p>
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-amber-800 dark:text-amber-200">{shown.skipped}</p>
                  <p className="text-xs text-amber-700 dark:text-amber-300 uppercase tracking-wider">Omitidos</p>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-red-800 dark:text-red-200">{shown.errors}</p>
                  <p className="text-xs text-red-700 dark:text-red-300 uppercase tracking-wider">Errores</p>
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
                      {importing ? "Importando..." : "Importar"}
                    </button>
                    <button
                      type="button"
                      onClick={resetAll}
                      className="bg-secondary text-secondary-foreground py-2 px-6 rounded-lg font-medium hover:opacity-90 transition-opacity"
                    >
                      Cancelar
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
                        <span>Descargar informe de errores</span>
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
                      Volver a comprobar
                    </button>
                    <button
                      type="button"
                      onClick={resetAll}
                      className="bg-secondary text-secondary-foreground py-2 px-6 rounded-lg font-medium hover:opacity-90 transition-opacity"
                    >
                      Nueva importación
                    </button>
                  </>
                )}
              </div>
              {!finalResult && shown.created === 0 && (
                <p className="text-sm text-muted-foreground mt-3">
                  No hay filas que se vayan a crear: corrige el CSV y vuelve a comprobar.
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
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Nombre</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">DNI/NIE</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Empresas</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Zona horaria</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Estado</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Detalle</th>
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
