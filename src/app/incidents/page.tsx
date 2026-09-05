"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import AppWrapper from "@/components/AppWrapper";
import { apiClient, Incident } from "@/lib/api-client";
import toast from "react-hot-toast";
import { getApiErrorMessage } from "@/lib/error-messages";
import { AiOutlineAlert, AiOutlineEye } from "react-icons/ai";
import { useRouter } from "next/navigation";
import { formatDateTimeLocale, getCurrentMonthRange } from "@/utils/dateFormatters";

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  in_review: "bg-blue-100 text-blue-800 border-blue-200",
  resolved: "bg-green-100 text-green-800 border-green-200"
};

export default function IncidentsPage() {
  const t = useTranslations("incidents");
  const tc = useTranslations("common");
  const router = useRouter();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  // Initialize with current month range
  const monthRange = getCurrentMonthRange();
  const [startDate, setStartDate] = useState(monthRange.start);
  const [endDate, setEndDate] = useState(monthRange.end);
  const [filtering, setFiltering] = useState(false);

  useEffect(() => {
    // Load incidents with default month range on initial mount only
    // TODO: migrar a hook de datos (fetch-on-mount)
    // eslint-disable-next-line react-hooks/immutability
    loadIncidents({ start_date: monthRange.start, end_date: monthRange.end });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadIncidents = async (filters?: {
    status?: string;
    start_date?: string;
    end_date?: string;
  }) => {
    setFiltering(true);
    try {
      const data = await apiClient.getIncidents(filters);
      setIncidents(data);
    } catch (error) {
      console.error("Error loading incidents:", error);
      toast.error(getApiErrorMessage(error, t("loadError")));
    } finally {
      setLoading(false);
      setFiltering(false);
    }
  };

  const handleFilter = () => {
    const filters: { status?: string; start_date?: string; end_date?: string } = {};
    if (statusFilter) filters.status = statusFilter;
    if (startDate) filters.start_date = startDate;
    if (endDate) filters.end_date = endDate;
    loadIncidents(filters);
  };

  const handleClearFilters = () => {
    const monthRange = getCurrentMonthRange();
    setStartDate(monthRange.start);
    setEndDate(monthRange.end);
    setSearchTerm("");
    setStatusFilter("");
    loadIncidents({ start_date: monthRange.start, end_date: monthRange.end });
  };

  const truncateText = (text: string, maxLength: number = 50) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  // Filter incidents by search term (worker name)
  const filteredIncidents = incidents.filter((incident) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return incident.worker_name.toLowerCase().includes(searchLower);
  });

  return (
    <AppWrapper>
      <div>
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <AiOutlineAlert />
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

            {/* Status and date filters */}
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex-1 min-w-[200px]">
                <label htmlFor="status" className="block text-sm font-medium text-foreground mb-2">
                  {tc("status")}
                </label>
                <select
                  id="status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-4 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="">{tc("all")}</option>
                  <option value="pending">{tc("statuses.pending")}</option>
                  <option value="in_review">{tc("statuses.in_review")}</option>
                  <option value="resolved">{tc("statuses.resolved")}</option>
                </select>
              </div>

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
          </div>
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto mb-4"></div>
              <p className="text-muted-foreground">{t("loading")}</p>
            </div>
          ) : filteredIncidents.length === 0 ? (
            <div className="p-8 text-center">
              <AiOutlineAlert className="text-6xl text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchTerm ? t("emptyFiltered") : t("empty")}
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
                      {tc("email")}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {tc("status")}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {tc("createdAt")}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {t("descriptionCol")}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {tc("actions")}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {filteredIncidents.map((incident) => (
                    <tr
                      key={incident.id}
                      className="hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => router.push(`/incidents/${incident.id}`)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-foreground">
                            {incident.worker_name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {incident.worker_id_number}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                        {incident.worker_email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                            statusColors[incident.status]
                          }`}
                        >
                          {tc(`statuses.${incident.status}`)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                        {formatDateTimeLocale(incident.created_at)}
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground max-w-xs">
                        {truncateText(incident.description)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/incidents/${incident.id}`);
                          }}
                          className="text-accent hover:text-accent/80 font-medium inline-flex items-center gap-1"
                        >
                          <AiOutlineEye className="text-lg" />
                          {tc("viewDetail")}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Summary */}
        {filteredIncidents.length > 0 && (
          <div className="mt-4 text-sm text-muted-foreground">
            {searchTerm
              ? t("showingFiltered", { shown: filteredIncidents.length, total: incidents.length, term: searchTerm })
              : t("showing", { count: filteredIncidents.length })}
          </div>
        )}
      </div>
    </AppWrapper>
  );
}
