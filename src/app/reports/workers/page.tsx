"use client";

import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import AppWrapper from "@/components/AppWrapper";
import Link from "next/link";
import {
  apiClient,
  CompanyMonthlySummary,
  WorkerMonthlySummary,
  Company,
} from "@/lib/api-client";
import ReportFilters from "@/components/reports/ReportFilters";
import ExportButtons from "@/components/reports/ExportButtons";
import ExportReportModal from "@/components/reports/ExportReportModal";
import StatCard from "@/components/reports/StatCard";
import {
  formatToLocalTimeShort,
  getMonthName,
  formatMinutesToHoursMinutes,
} from "@/utils/dateFormatters";
import {
  AiOutlineCalendar,
  AiOutlineClockCircle,
  AiOutlineArrowLeft,
  AiOutlinePause,
  AiOutlineWarning,
  AiOutlineDownload,
} from "react-icons/ai";
import toast from "react-hot-toast";

export default function WorkerReportsPage() {
  const t = useTranslations("reports");
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [report, setReport] = useState<
    WorkerMonthlySummary | CompanyMonthlySummary | null
  >(null);
  const [filters, setFilters] = useState<{
    company_id: string;
    year: number;
    month: number;
  } | null>(null);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [expandedWorker, setExpandedWorker] = useState<string | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [exportModalOpen, setExportModalOpen] = useState(false);

  useEffect(() => {
    apiClient.getCompanies().then(setCompanies).catch(() => {
      toast.error(t("loadCompaniesError"));
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilter = async (f: {
    company_id: string;
    year: number;
    month: number;
    worker_id?: string | null;
  }) => {
    const workerId = f.worker_id ?? null;
    setFilters({ company_id: f.company_id, year: f.year, month: f.month });
    setLoading(true);
    setReport(null);
    try {
      if (workerId) {
        const data = await apiClient.getWorkerMonthlyReport(workerId, {
          company_id: f.company_id,
          year: f.year,
          month: f.month,
        });
        setReport(data);
      } else {
        const data = await apiClient.getCompanyMonthlyReport({
          company_id: f.company_id,
          year: f.year,
          month: f.month,
        });
        setReport(data);
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : t("generateError"));
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: "csv" | "xlsx" | "pdf") => {
    if (!filters) return;
    setExporting(true);
    try {
      await apiClient.exportMonthlyReport({
        ...filters,
        worker_id: selectedWorkerId || undefined,
        format,
      });
      toast.success(t("exportedAs", { format: format.toUpperCase() }));
    } catch {
      toast.error(t("exportError"));
    } finally {
      setExporting(false);
    }
  };

  const isWorkerReport = (r: unknown): r is WorkerMonthlySummary =>
    r !== null &&
    typeof r === "object" &&
    "worker_id" in (r as Record<string, unknown>);

  const isCompanyReport = (r: unknown): r is CompanyMonthlySummary =>
    r !== null &&
    typeof r === "object" &&
    "workers" in (r as Record<string, unknown>);

  return (
    <AppWrapper>
      <div>
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/reports"
            className="text-accent hover:underline text-sm flex items-center gap-1 mb-3"
          >
            <AiOutlineArrowLeft /> {t("backToReportsCapital")}
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                {t("workerReportTitle")}
              </h1>
              <p className="text-muted-foreground">
                {t("workerReportPageSubtitle")}
              </p>
            </div>
            <button
              onClick={() => setExportModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors shrink-0"
            >
              <AiOutlineDownload className="text-base" />
              {t("exportReport")}
            </button>
          </div>
        </div>

        {/* Filters */}
        <ReportFilters
          onFilter={handleFilter}
          showWorkerFilter={true}
          onWorkerChange={(id) => setSelectedWorkerId(id)}
          loading={loading}
        />

        {/* Report title and export */}
        {report && (
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">
              {isWorkerReport(report)
                ? `${report.worker_name} — ${getMonthName(report.month)} ${report.year}`
                : `${(report as CompanyMonthlySummary).company_name} — ${getMonthName(
                    (report as CompanyMonthlySummary).month
                  )} ${(report as CompanyMonthlySummary).year}`}
            </h2>
            <ExportButtons
              onExport={handleExport}
              disabled={exporting}
              loading={exporting}
            />
          </div>
        )}

        {/* Single worker report */}
        {report && isWorkerReport(report) && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatCard
                title={t("statDaysWorked")}
                value={report.total_days_worked}
                icon={<AiOutlineCalendar className="text-xl text-accent" />}
              />
              <StatCard
                title={t("statWorkedHours")}
                value={formatMinutesToHoursMinutes(report.total_worked_minutes)}
                icon={<AiOutlineClockCircle className="text-xl text-accent" />}
              />
              <StatCard
                title={t("statPauseTime2")}
                value={formatMinutesToHoursMinutes(report.total_pause_minutes)}
                icon={<AiOutlinePause className="text-xl text-accent" />}
              />
              <StatCard
                title={t("statOvertime")}
                value={formatMinutesToHoursMinutes(report.total_overtime_minutes)}
                variant={report.total_overtime_minutes > 0 ? "warning" : "default"}
                icon={<AiOutlineWarning className="text-xl" />}
              />
            </div>

            {/* Daily detail table */}
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                      {t("colDate")}
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                      {t("colEntry")}
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                      {t("colExit")}
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                      {t("colWorked")}
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                      {t("colPauses")}
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                      {t("colStatus")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {report.daily_details.map((day) => (
                    <tr
                      key={day.date}
                      className="border-b border-border last:border-0 hover:bg-muted/10"
                    >
                      <td className="px-4 py-3 text-sm text-foreground font-medium">
                        {day.date}
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground">
                        {day.first_entry
                          ? formatToLocalTimeShort(day.first_entry)
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground">
                        {day.last_exit
                          ? formatToLocalTimeShort(day.last_exit)
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground">
                        {formatMinutesToHoursMinutes(day.total_worked_minutes)}
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground">
                        {formatMinutesToHoursMinutes(day.total_pause_minutes)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {day.has_open_session ? (
                          <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 rounded-full">
                            {t("sessionOpen")}
                          </span>
                        ) : day.is_modified ? (
                          <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 rounded-full">
                            {t("modified")}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded-full">
                            {t("complete")}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {report.daily_details.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  {t("noRecords")}
                </p>
              )}
            </div>

            {/* Signature status */}
            <div className="mt-4 bg-card border border-border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {t("signatureStatus")}
                </span>
                <span
                  className={`px-3 py-1 text-sm rounded-full ${
                    report.signature_status === "signed"
                      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                  }`}
                >
                  {report.signature_status === "signed"
                    ? t("signed")
                    : t("pendingSignature")}
                </span>
              </div>
            </div>
          </>
        )}

        {/* Company report (all workers) */}
        {report && isCompanyReport(report) && (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                    {t("colWorker")}
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                    {t("colDni")}
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                    {t("colDays")}
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                    {t("colHours")}
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                    {t("colPauses")}
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                    {t("colOvertime")}
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                    {t("colSignature")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {report.workers.map((w) => (
                  <React.Fragment key={w.worker_id}>
                    <tr
                      className="border-b border-border hover:bg-muted/10 cursor-pointer"
                      onClick={() =>
                        setExpandedWorker(
                          expandedWorker === w.worker_id ? null : w.worker_id
                        )
                      }
                    >
                      <td className="px-4 py-3 text-sm text-foreground font-medium">
                        {w.worker_name}
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground">
                        {w.worker_id_number}
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground">
                        {w.total_days_worked}
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground">
                        {formatMinutesToHoursMinutes(w.total_worked_minutes)}
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground">
                        {formatMinutesToHoursMinutes(w.total_pause_minutes)}
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground">
                        {w.total_overtime_minutes > 0 ? (
                          <span className="text-yellow-600 dark:text-yellow-400">
                            {formatMinutesToHoursMinutes(w.total_overtime_minutes)}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`px-2 py-0.5 text-xs rounded-full ${
                            w.signature_status === "signed"
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                          }`}
                        >
                          {w.signature_status === "signed" ? t("signed") : t("pending")}
                        </span>
                      </td>
                    </tr>
                    {expandedWorker === w.worker_id &&
                      w.daily_details.length > 0 && (
                        <tr key={`${w.worker_id}-details`}>
                          <td colSpan={7} className="px-8 py-3 bg-muted/5">
                            <table className="w-full">
                              <thead>
                                <tr className="text-xs text-muted-foreground">
                                  <th className="text-left py-1 pr-4">{t("colDate")}</th>
                                  <th className="text-left py-1 pr-4">{t("colEntry")}</th>
                                  <th className="text-left py-1 pr-4">{t("colExit")}</th>
                                  <th className="text-left py-1 pr-4">{t("colWorked")}</th>
                                  <th className="text-left py-1 pr-4">{t("colPauses")}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {w.daily_details.map((d) => (
                                  <tr key={d.date} className="text-xs text-foreground">
                                    <td className="py-1 pr-4">{d.date}</td>
                                    <td className="py-1 pr-4">
                                      {d.first_entry
                                        ? formatToLocalTimeShort(d.first_entry)
                                        : "—"}
                                    </td>
                                    <td className="py-1 pr-4">
                                      {d.last_exit
                                        ? formatToLocalTimeShort(d.last_exit)
                                        : "—"}
                                    </td>
                                    <td className="py-1 pr-4">
                                      {formatMinutesToHoursMinutes(
                                        d.total_worked_minutes
                                      )}
                                    </td>
                                    <td className="py-1 pr-4">
                                      {formatMinutesToHoursMinutes(
                                        d.total_pause_minutes
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
            {report.workers.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                {t("noWorkersWithRecords")}
              </p>
            )}
          </div>
        )}

        {/* Empty state */}
        {!report && !loading && (
          <div className="text-center py-12 text-muted-foreground">
            {t("selectFiltersHint")}
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto mb-4"></div>
            <p className="text-muted-foreground">{t("generating")}</p>
          </div>
        )}
      </div>

      <ExportReportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        companies={companies}
        defaultCompanyId={filters?.company_id}
      />
    </AppWrapper>
  );
}
