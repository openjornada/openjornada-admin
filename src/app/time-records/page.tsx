"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import AppWrapper from "@/components/AppWrapper";
import { apiClient, type TimeRecord, type Company, type WorkCenter, type RealtimeEvent } from "@/lib/api-client";
import { useRealtime, useRealtimeConnection } from "@/contexts/RealtimeProvider";
import { useAuth } from "@/contexts/AuthContext";
import toast from "react-hot-toast";
import { getApiErrorMessage } from "@/lib/error-messages";
import { AiOutlineClockCircle, AiOutlineDownload } from "react-icons/ai";
import { getCurrentMonthRange, getBrowserTimezone, getLocalDateString } from "@/utils/dateFormatters";
import {
  buildTimeRecordColumns,
  defaultVisibleColumnKeys,
  resolveVisibleColumnKeys,
  serializeVisibleColumnKeys,
  visibleColumnsStorageKey,
  type TimeRecordColumnKey,
} from "@/lib/time-record-columns";

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
  work_center_id?: string | null; // may be absent in older frames
  work_center_name?: string | null;
  daily_total_minutes?: number; // totales del trabajador; ausentes en frames antiguos
  weekly_total_minutes?: number; // totales del trabajador; ausentes en frames antiguos
  monthly_total_minutes?: number; // totales del trabajador; ausentes en frames antiguos
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
  const [workCenters, setWorkCenters] = useState<WorkCenter[]>([]);
  const [loadingWorkCenters, setLoadingWorkCenters] = useState(true);
  const [selectedWorkCenterId, setSelectedWorkCenterId] = useState<string>("");

  // Initialize with current month range
  const monthRange = getCurrentMonthRange();
  const [startDate, setStartDate] = useState(monthRange.start);
  const [endDate, setEndDate] = useState(monthRange.end);
  const [filtering, setFiltering] = useState(false);

  const { user } = useAuth();
  const [visibleColumns, setVisibleColumns] = useState<Set<TimeRecordColumnKey>>(() =>
    defaultVisibleColumnKeys()
  );
  const [showColumnsModal, setShowColumnsModal] = useState(false);
  const columnsModalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load records with default month range on initial mount only
    // TODO: migrar a hook de datos (fetch-on-mount)
    // eslint-disable-next-line react-hooks/immutability
    loadRecords({
      start_date: monthRange.start,
      end_date: monthRange.end,
      timezone: getBrowserTimezone(),
    });
    // eslint-disable-next-line react-hooks/immutability
    loadCompanies();
    // eslint-disable-next-line react-hooks/immutability
    loadWorkCenters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Read the persisted columns after mount (never during SSR) and whenever the
  // authenticated admin changes; initial render always uses the defaults.
  useEffect(() => {
    const storageKey = visibleColumnsStorageKey(user);
    // The stored preference can only be read after mount; the initial render
    // always uses the defaults to stay hydration-safe.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisibleColumns(
      storageKey
        ? resolveVisibleColumnKeys(localStorage.getItem(storageKey))
        : defaultVisibleColumnKeys()
    );
  }, [user]);

  useEffect(() => {
    if (showColumnsModal) columnsModalRef.current?.focus();
  }, [showColumnsModal]);

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

  const loadWorkCenters = async () => {
    try {
      const data = await apiClient.getWorkCenters();
      setWorkCenters(data);
    } catch (error) {
      console.error("Error loading work centers:", error);
      toast.error(getApiErrorMessage(error, t("centersLoadError")));
    } finally {
      setLoadingWorkCenters(false);
    }
  };

  const loadRecords = async (filters?: { start_date?: string; end_date?: string; company_id?: string; worker_name?: string; work_center_id?: string; timezone?: string }) => {
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
    const filters: { start_date?: string; end_date?: string; company_id?: string; worker_name?: string; work_center_id?: string; timezone?: string } = {};
    if (startDate) filters.start_date = startDate;
    if (endDate) filters.end_date = endDate;
    if (selectedCompanyId) filters.company_id = selectedCompanyId;
    if (selectedWorkCenterId) filters.work_center_id = selectedWorkCenterId;
    if (searchTerm) filters.worker_name = searchTerm;
    filters.timezone = getBrowserTimezone();
    return filters;
  };

  const handleFilter = () => {
    loadRecords(buildCurrentFilters());
  };

  const handleCompanyFilterChange = (companyId: string) => {
    setSelectedCompanyId(companyId);
    // Reset the center filter if the selected center doesn't belong to the new company
    if (selectedWorkCenterId) {
      const center = workCenters.find((c) => c.id === selectedWorkCenterId);
      if (center && center.company_id !== companyId) {
        setSelectedWorkCenterId("");
      }
    }
  };

  const handleClearFilters = () => {
    const monthRange = getCurrentMonthRange();
    setStartDate(monthRange.start);
    setEndDate(monthRange.end);
    setSearchTerm("");
    setSelectedCompanyId("");
    setSelectedWorkCenterId("");
    loadRecords({
      start_date: monthRange.start,
      end_date: monthRange.end,
      timezone: getBrowserTimezone(),
    });
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return "-";
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  // Records are now filtered on the backend
  const filteredRecords = records;

  const centerOptions = selectedCompanyId
    ? workCenters.filter((c) => c.company_id === selectedCompanyId)
    : workCenters;

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
    // Work center filter: only applied when the payload carries the center id;
    // older frames without it are not dropped (can't verify the match).
    if (selectedWorkCenterId) {
      if (payload.work_center_id !== undefined && payload.work_center_id !== selectedWorkCenterId) return;
    }
    // Date filter: the listing requests carry the browser timezone, so the
    // backend filters by local natural day. Derive the payload's date in that
    // same browser timezone to keep an insert near midnight consistent with the
    // server (behavioral coupling, keep in sync).
    const localDate = getLocalDateString(payload.timestamp); // YYYY-MM-DD in browser tz
    if (startDate && localDate < startDate) return;
    if (endDate && localDate > endDate) return;
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
      work_center_id: payload.work_center_id ?? null,
      work_center_name: payload.work_center_name ?? null,
      // Passed straight through: undefined on older frames keeps the totals
      // columns rendering "-" (formatDuration fallback) until the next refetch.
      daily_total_minutes: payload.daily_total_minutes,
      weekly_total_minutes: payload.weekly_total_minutes,
      monthly_total_minutes: payload.monthly_total_minutes,
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

  // Single column config driving the table header, the table cells and the
  // Excel export (see src/lib/time-record-columns.tsx).
  const columns = buildTimeRecordColumns({
    t,
    tc,
    getRecordTypeLabel,
    formatDuration,
  });

  const toggleColumn = (columnKey: TimeRecordColumnKey) => {
    const next = new Set(visibleColumns);
    if (next.has(columnKey)) next.delete(columnKey);
    else next.add(columnKey);
    setVisibleColumns(next);
    const storageKey = visibleColumnsStorageKey(user);
    if (storageKey) localStorage.setItem(storageKey, serializeVisibleColumnKeys(next));
  };

  // Export to Excel function
  const handleExportToExcel = async () => {
    if (filteredRecords.length === 0) {
      toast.error(t("nothingToExport"));
      return;
    }

    try {
      const XLSX = await import("xlsx");

      // Always export the full column set, regardless of what is visible on screen.
      const dataToExport = filteredRecords.map((record) => {
        const row: Record<string, string> = {};
        for (const column of columns) {
          row[column.label] = column.exportValue(record);
        }
        return row;
      });

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
                    onChange={(e) => handleCompanyFilterChange(e.target.value)}
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

              <div className="flex-1 min-w-[200px]">
                <label htmlFor="center" className="block text-sm font-medium text-foreground mb-2">
                  {t("centerFilter")}
                </label>
                {loadingWorkCenters ? (
                  <div className="w-full px-4 py-2 border border-input bg-background rounded-lg text-sm text-muted-foreground">
                    {tc("loading")}
                  </div>
                ) : (
                  <select
                    id="center"
                    value={selectedWorkCenterId}
                    onChange={(e) => setSelectedWorkCenterId(e.target.value)}
                    className="w-full px-4 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    <option value="">{t("allCenters")}</option>
                    {centerOptions.map((center) => (
                      <option key={center.id} value={center.id}>
                        {center.name}
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

            {/* Export and columns controls */}
            <div className="flex justify-end gap-3 pt-2 border-t border-border">
              <button
                onClick={() => setShowColumnsModal(true)}
                className="bg-secondary text-secondary-foreground px-6 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity"
              >
                {t("columnsButton")}
              </button>
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
                {(searchTerm || selectedCompanyId || selectedWorkCenterId) ? t("emptyFiltered") : t("empty")}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    {columns
                      .filter((column) => visibleColumns.has(column.key))
                      .map((column) => (
                        <th
                          key={column.key}
                          className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                        >
                          {column.label}
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {filteredRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-muted/50 transition-colors">
                      {columns
                        .filter((column) => visibleColumns.has(column.key))
                        .map((column) => (
                          <td key={column.key} className={column.cellClassName}>
                            {column.render(record)}
                          </td>
                        ))}
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

      {/* Column selection modal */}
      {showColumnsModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowColumnsModal(false)}
        >
          <div
            className="bg-card border border-border rounded-lg p-6 w-full max-w-md"
            role="dialog"
            aria-modal="true"
            aria-labelledby="columns-modal-title"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => { if (e.key === "Escape") setShowColumnsModal(false); }}
            tabIndex={-1}
            ref={columnsModalRef}
          >
            <h3 id="columns-modal-title" className="text-lg font-semibold text-foreground mb-4">
              {t("columnsModalTitle")}
            </h3>
            <div className="space-y-2 mb-6">
              {columns.map((column) => (
                <label key={column.key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={visibleColumns.has(column.key)}
                    onChange={() => toggleColumn(column.key)}
                    className="w-4 h-4 rounded border-input"
                  />
                  <span className="text-sm text-foreground">{column.label}</span>
                </label>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setShowColumnsModal(false)}
              className="w-full px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              {tc("close")}
            </button>
          </div>
        </div>
      )}
    </AppWrapper>
  );
}
