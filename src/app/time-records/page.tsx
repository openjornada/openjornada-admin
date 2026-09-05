"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import AppWrapper from "@/components/AppWrapper";
import { apiClient, type TimeRecord, type Company, type RealtimeEvent } from "@/lib/api-client";
import { useRealtime, useRealtimeConnection } from "@/contexts/RealtimeProvider";
import toast from "react-hot-toast";
import { getApiErrorMessage } from "@/lib/error-messages";
import { AiOutlineClockCircle, AiOutlineDownload } from "react-icons/ai";
import { formatToLocalTime, getCurrentMonthRange } from "@/utils/dateFormatters";

// Payload of the "fichaje.created" realtime event (subset of TimeRecord fields).
interface FichajeCreatedPayload {
  time_record_id?: string;
  worker_id?: string;
  worker_name?: string;
  record_type?: "entry" | "exit" | "pause_start" | "pause_end";
  timestamp?: string; // ISO UTC
  duration_minutes?: number; // solo en exit/pause_end; ausente en entry/pause_start
  company_id?: string; // authoritative id; older frames may omit it
  company_name?: string;
}

export default function TimeRecordsPage() {
  const t = useTranslations("timeRecords");
  const tc = useTranslations("common");
  const trt = useTranslations("common.recordTypes");
  const [records, setRecords] = useState<TimeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");

  // Initialize with current month range
  const monthRange = getCurrentMonthRange();
  const [startDate, setStartDate] = useState(monthRange.start);
  const [endDate, setEndDate] = useState(monthRange.end);
  const [filtering, setFiltering] = useState(false);

  useEffect(() => {
    // Load records with default month range on initial mount only
    // TODO: migrar a hook de datos (fetch-on-mount)
    // eslint-disable-next-line react-hooks/immutability
    loadRecords({ start_date: monthRange.start, end_date: monthRange.end });
    // eslint-disable-next-line react-hooks/immutability
    loadCompanies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadCompanies = async () => {
    try {
      const data = await apiClient.getCompanies();
      setCompanies(data);
    } catch (error) {
      console.error("Error loading companies:", error);
      toast.error(getApiErrorMessage(error, t("companiesLoadError")));
    } finally {
      setLoadingCompanies(false);
    }
  };

  const loadRecords = async (filters?: { start_date?: string; end_date?: string; company_id?: string; worker_name?: string }) => {
    setFiltering(true);
    try {
      const data = await apiClient.getTimeRecords(filters);
      setRecords(data);
    } catch (error) {
      console.error("Error loading time records:", error);
      toast.error(getApiErrorMessage(error, t("loadError")));
    } finally {
      setLoading(false);
      setFiltering(false);
    }
  };

  const buildCurrentFilters = () => {
    const filters: { start_date?: string; end_date?: string; company_id?: string; worker_name?: string } = {};
    if (startDate) filters.start_date = startDate;
    if (endDate) filters.end_date = endDate;
    if (selectedCompanyId) filters.company_id = selectedCompanyId;
    if (searchTerm) filters.worker_name = searchTerm;
    return filters;
  };

  const handleFilter = () => {
    loadRecords(buildCurrentFilters());
  };

  const handleClearFilters = () => {
    const monthRange = getCurrentMonthRange();
    setStartDate(monthRange.start);
    setEndDate(monthRange.end);
    setSearchTerm("");
    setSelectedCompanyId("");
    loadRecords({ start_date: monthRange.start, end_date: monthRange.end });
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return "-";
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  // Records are now filtered on the backend
  const filteredRecords = records;

  // Live insert on "fichaje.created" (no refetch): the list is ordered by
  // created_at desc, so a just-created record goes on top. Only inserted if it
  // passes the same filters currently applied and is not already present.
  useRealtime("fichaje.created", (event: RealtimeEvent) => {
    const payload = event.payload as FichajeCreatedPayload;
    if (!payload.time_record_id || !payload.timestamp || !payload.record_type) return;

    // Company filter: prefer the authoritative company_id in the payload; fall
    // back to resolving the selected company by name only for older frames that
    // don't carry the id yet (back-compat).
    if (selectedCompanyId) {
      if (payload.company_id) {
        if (payload.company_id !== selectedCompanyId) return;
      } else {
        const selected = companies.find((c) => c.id === selectedCompanyId);
        if (!selected || selected.name !== payload.company_name) return;
      }
    }
    // Date filter: both sides compare UTC calendar dates. getTimeRecords sends no
    // timezone param, so the backend filters with its UTC default and this slice(0,10)
    // (UTC) matches it. If a non-UTC tz is ever passed to getTimeRecords here, this
    // comparison must switch to the same tz (behavioral coupling, keep in sync).
    const utcDate = payload.timestamp.slice(0, 10); // YYYY-MM-DD in UTC
    if (startDate && utcDate < startDate) return;
    if (endDate && utcDate > endDate) return;
    // Worker name filter: case-insensitive partial match, as in the backend regex.
    if (searchTerm && !payload.worker_name?.toLowerCase().includes(searchTerm.toLowerCase())) {
      return;
    }

    const newRecord: TimeRecord = {
      id: payload.time_record_id,
      worker_id: payload.worker_id ?? "",
      worker_name: payload.worker_name ?? "",
      worker_id_number: "", // not available in the realtime payload
      record_type: payload.record_type,
      timestamp: payload.timestamp,
      duration_minutes: payload.duration_minutes,
      company_id:
        payload.company_id ?? companies.find((c) => c.name === payload.company_name)?.id,
      company_name: payload.company_name,
    };

    setRecords((prev) =>
      prev.some((r) => r.id === newRecord.id) ? prev : [newRecord, ...prev]
    );
  });

  // On successful stream (re)opens (throttled by the provider), refetch with the
  // filters currently applied so events dropped under backpressure (or across a
  // cut) can't leave the list stale. The hook keeps this closure in a ref
  // refreshed each render, so buildCurrentFilters/loadRecords always see fresh
  // state. The extra fetch on the very first open is idempotent with the initial
  // load above.
  useRealtimeConnection(() => {
    loadRecords(buildCurrentFilters());
  });

  const getRecordTypeLabel = (type: string) =>
    trt.has(type) ? trt(type as "entry") : type;

  // Export to Excel function
  const handleExportToExcel = async () => {
    if (filteredRecords.length === 0) {
      toast.error(t("nothingToExport"));
      return;
    }

    try {
      const XLSX = await import("xlsx");

      // Prepare data for Excel
      const headers = t.raw("excelHeaders") as Record<string, string>;
      const dataToExport = filteredRecords.map((record) => ({
        [headers.dni]: record.worker_id_number,
        [headers.worker]: record.worker_name,
        [headers.company]: record.company_name || tc("notAvailable"),
        [headers.type]: getRecordTypeLabel(record.record_type),
        [headers.pauseType]: record.pause_type_name || "-",
        [headers.pauseCounts]: record.pause_counts_as_work !== undefined
          ? (record.pause_counts_as_work ? tc("yes") : tc("no"))
          : "-",
        [headers.dateTime]: formatToLocalTime(record.timestamp),
        [headers.duration]: formatDuration(record.duration_minutes),
      }));

      // Create workbook and worksheet
      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, t("sheetName"));

      // Generate filename with current date
      const today = new Date().toISOString().split("T")[0];
      const filename = `${t("fileName")}_${today}.xlsx`;

      // Download file
      XLSX.writeFile(workbook, filename);

      toast.success(t("exported", { count: filteredRecords.length }));
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      toast.error(getApiErrorMessage(error, t("exportError")));
    }
  };

  return (
    <AppWrapper>
      <div>
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <AiOutlineClockCircle />
            {t("title")}
          </h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>

        {/* Filters */}
        <div className="bg-card border border-border rounded-lg p-4 mb-6">
          <div className="space-y-4">
            {/* Search by worker name */}
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-foreground mb-2">
                {tc("searchWorker")}
              </label>
              <input
                type="text"
                id="search"
                placeholder={tc("searchPlaceholder")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            {/* Date and company filters */}
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex-1 min-w-[200px]">
                <label htmlFor="start_date" className="block text-sm font-medium text-foreground mb-2">
                  {tc("startDate")}
                </label>
                <input
                  type="date"
                  id="start_date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              <div className="flex-1 min-w-[200px]">
                <label htmlFor="end_date" className="block text-sm font-medium text-foreground mb-2">
                  {tc("endDate")}
                </label>
                <input
                  type="date"
                  id="end_date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              <div className="flex-1 min-w-[200px]">
                <label htmlFor="company" className="block text-sm font-medium text-foreground mb-2">
                  {tc("company")}
                </label>
                {loadingCompanies ? (
                  <div className="w-full px-4 py-2 border border-input bg-background rounded-lg text-sm text-muted-foreground">
                    {tc("loading")}
                  </div>
                ) : (
                  <select
                    id="company"
                    value={selectedCompanyId}
                    onChange={(e) => setSelectedCompanyId(e.target.value)}
                    className="w-full px-4 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    <option value="">{t("allCompanies")}</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <button
                onClick={handleFilter}
                disabled={filtering}
                className="bg-accent text-accent-foreground px-6 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {filtering ? tc("filtering") : tc("filter")}
              </button>

              <button
                onClick={handleClearFilters}
                className="bg-secondary text-secondary-foreground px-6 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity"
              >
                {tc("clearFilters")}
              </button>
            </div>

            {/* Export button */}
            <div className="flex justify-end pt-2 border-t border-border">
              <button
                onClick={handleExportToExcel}
                disabled={loading || filteredRecords.length === 0}
                className="bg-green-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <AiOutlineDownload className="text-lg" />
                {t("exportWithCount", { count: filteredRecords.length })}
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto mb-4"></div>
              <p className="text-muted-foreground">{t("loading")}</p>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="p-8 text-center">
              <AiOutlineClockCircle className="text-6xl text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {(searchTerm || selectedCompanyId) ? t("emptyFiltered") : t("empty")}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {tc("worker")}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {tc("company")}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {t("type")}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {t("detail")}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {t("dateTime")}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {t("duration")}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {filteredRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                        {record.worker_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {record.company_name || tc("notAvailable")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            record.record_type === "entry"
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                              : record.record_type === "exit"
                              ? "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                              : record.record_type === "pause_start"
                              ? "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
                              : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                          }`}
                        >
                          {getRecordTypeLabel(record.record_type)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {record.pause_type_name ? (
                          <div>
                            <div className="font-medium text-foreground">{record.pause_type_name}</div>
                            <div className="text-xs">
                              {record.pause_counts_as_work ? (
                                <span className="text-green-600 dark:text-green-400">{t("pauseCountsAsWork")}</span>
                              ) : (
                                <span className="text-orange-600 dark:text-orange-400">{t("pauseOutsideShift")}</span>
                              )}
                            </div>
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                        {formatToLocalTime(record.timestamp)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {formatDuration(record.duration_minutes)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Summary */}
        {filteredRecords.length > 0 && (
          <div className="mt-4 text-sm text-muted-foreground">
            {tc("showingRecords", { count: filteredRecords.length })}
          </div>
        )}
      </div>
    </AppWrapper>
  );
}
