"use client";

import { useState } from "react";
import AppWrapper from "@/components/AppWrapper";
import Link from "next/link";
import { apiClient, CompanyMonthlySummary, WorkerMonthlySummary } from "@/lib/api-client";
import toast from "react-hot-toast";
import { AiOutlineArrowLeft, AiOutlineBarChart } from "react-icons/ai";
import StatCard from "@/components/reports/StatCard";
import ReportFilters from "@/components/reports/ReportFilters";
import ExportButtons from "@/components/reports/ExportButtons";
import { getMonthName, formatMinutesToHoursMinutes } from "@/utils/dateFormatters";

export default function CompanyReportPage() {
  const [report, setReport] = useState<CompanyMonthlySummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [currentFilters, setCurrentFilters] = useState<{
    company_id: string;
    year: number;
    month: number;
  } | null>(null);

  const handleFilter = async (filters: {
    company_id: string;
    year: number;
    month: number;
    timezone?: string;
  }) => {
    setLoading(true);
    setCurrentFilters(filters);

    try {
      const data = await apiClient.getCompanyMonthlyReport(filters);
      setReport(data);
    } catch (error) {
      console.error("Error loading company monthly report:", error);
      toast.error("Error al cargar el informe mensual");
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: "csv" | "xlsx" | "pdf") => {
    if (!currentFilters) return;

    setExporting(true);

    try {
      await apiClient.exportMonthlyReport({ ...currentFilters, format });
      toast.success(`Informe exportado como ${format.toUpperCase()}`);
    } catch (error) {
      console.error("Error exporting report:", error);
      toast.error("Error al exportar el informe");
    } finally {
      setExporting(false);
    }
  };

  const totalHours = report
    ? report.workers.reduce((sum, w) => sum + w.total_worked_minutes, 0)
    : 0;

  const totalOvertime = report
    ? report.workers.reduce((sum, w) => sum + w.total_overtime_minutes, 0)
    : 0;

  const totalPauses = report
    ? report.workers.reduce((sum, w) => sum + w.total_pause_minutes, 0)
    : 0;

  const signatureLabel = (status: WorkerMonthlySummary["signature_status"]) => {
    if (status === "signed") return "Firmado";
    if (status === "pending") return "Pendiente";
    return "No requerida";
  };

  return (
    <AppWrapper>
      <div>
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/reports"
            className="inline-flex items-center gap-2 text-accent hover:underline mb-4"
          >
            <AiOutlineArrowLeft />
            <span>Volver a informes</span>
          </Link>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <AiOutlineBarChart />
            Informe Mensual de Empresa
          </h1>
          <p className="text-muted-foreground">
            Resumen mensual de horas trabajadas por empresa
          </p>
        </div>

        {/* Filters */}
        <ReportFilters onFilter={handleFilter} loading={loading} />

        {/* Loading state */}
        {loading && (
          <div className="bg-card border border-border rounded-lg p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto mb-4"></div>
            <p className="text-muted-foreground">Generando informe...</p>
          </div>
        )}

        {/* Report content */}
        {!loading && report && (
          <div className="space-y-6">
            {/* Period heading */}
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">
                {report.company_name} — {getMonthName(report.month)} {report.year}
              </h2>
              <ExportButtons
                onExport={handleExport}
                disabled={!report}
                loading={exporting}
              />
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Total Trabajadores"
                value={report.total_workers}
                subtitle="trabajadores con actividad"
              />
              <StatCard
                title="Total Horas"
                value={formatMinutesToHoursMinutes(totalHours)}
                subtitle="horas trabajadas en el mes"
              />
              <StatCard
                title="Total Horas Extra"
                value={formatMinutesToHoursMinutes(totalOvertime)}
                subtitle="horas extra acumuladas"
                variant={totalOvertime > 0 ? "warning" : "default"}
              />
              <StatCard
                title="Total Pausas"
                value={formatMinutesToHoursMinutes(totalPauses)}
                subtitle="tiempo de pausas en el mes"
              />
            </div>

            {/* Workers table */}
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              {report.workers.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-muted-foreground">
                    No hay datos de trabajadores para este periodo
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Trabajador
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          DNI
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Días
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Horas Trabajadas
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Pausas
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Horas Extra
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Firma
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-card divide-y divide-border">
                      {report.workers.map((worker) => (
                        <tr
                          key={worker.worker_id}
                          className="hover:bg-muted/50 transition-colors"
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                            {worker.worker_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                            {worker.worker_id_number}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                            {worker.total_days_worked}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                            {formatMinutesToHoursMinutes(worker.total_worked_minutes)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                            {formatMinutesToHoursMinutes(worker.total_pause_minutes)}
                          </td>
                          <td
                            className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                              worker.total_overtime_minutes > 0
                                ? "bg-yellow-50/70 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400"
                                : "text-foreground"
                            }`}
                          >
                            {formatMinutesToHoursMinutes(worker.total_overtime_minutes)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                            {signatureLabel(worker.signature_status)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Empty state before first filter */}
        {!loading && !report && (
          <div className="bg-card border border-border rounded-lg p-8 text-center">
            <AiOutlineBarChart className="text-5xl text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              Selecciona una empresa, año y mes para generar el informe
            </p>
          </div>
        )}
      </div>
    </AppWrapper>
  );
}
