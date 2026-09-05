"use client";

import { useState, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import AppWrapper from "@/components/AppWrapper";
import EnabledCompanySelect from "@/components/absences/EnabledCompanySelect";
import { apiClient, Absence } from "@/lib/api-client";
import { getCurrentMonthToYearEndRange } from "@/utils/dateFormatters";
import toast from "react-hot-toast";
import { getApiErrorMessage } from "@/lib/error-messages";
import { AiOutlineBank, AiOutlineCalendar, AiOutlineEye, AiOutlineSetting } from "react-icons/ai";
import { useRouter } from "next/navigation";
import Link from "next/link";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  accepted: "bg-green-100 text-green-800 border-green-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
  cancelled: "bg-gray-100 text-gray-800 border-gray-200",
};

export default function AbsencesPage() {
  const t = useTranslations("absences");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const [companyId, setCompanyId] = useState("");
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtering, setFiltering] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  const defaultRange = getCurrentMonthToYearEndRange();
  const [startDate, setStartDate] = useState(defaultRange.start);
  const [endDate, setEndDate] = useState(defaultRange.end);

  useEffect(() => {
    if (!companyId) return;
    // eslint-disable-next-line react-hooks/immutability
    loadAbsences({
      company_id: companyId,
      status: (statusFilter as Absence["status"]) || undefined,
      start_date: defaultRange.start,
      end_date: defaultRange.end,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const loadAbsences = async (filters: {
    company_id: string;
    status?: Absence["status"];
    start_date?: string;
    end_date?: string;
  }) => {
    setFiltering(true);
    try {
      const data = await apiClient.getAbsences(filters);
      setAbsences(data);
    } catch (error) {
      console.error("Error loading absences:", error);
      toast.error(getApiErrorMessage(error, t("loadError")));
    } finally {
      setLoading(false);
      setFiltering(false);
    }
  };

  const handleFilter = () => {
    if (!companyId) return;
    loadAbsences({
      company_id: companyId,
      status: (statusFilter as Absence["status"]) || undefined,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
    });
  };

  const handleClearFilters = () => {
    setStartDate("");
    setEndDate("");
    setSearchTerm("");
    setStatusFilter("");
    if (companyId) {
      loadAbsences({ company_id: companyId });
    }
  };

  const filteredAbsences = absences.filter((a) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return `${a.worker_first_name} ${a.worker_last_name}`.toLowerCase().includes(searchLower);
  });

  return (
    <AppWrapper>
      <div>
        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <AiOutlineCalendar />
              {t("title")}
            </h1>
            <p className="text-muted-foreground">{t("subtitle")}</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/absences/calendar"
              className="flex items-center gap-2 text-accent hover:underline text-sm font-medium"
            >
              <AiOutlineCalendar />
              {t("teamCalendar")}
            </Link>
            <Link
              href="/settings/absences"
              className="flex items-center gap-2 text-accent hover:underline text-sm font-medium"
            >
              <AiOutlineSetting />
              {t("configurePolicy")}
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-card border border-border rounded-lg p-4 mb-6">
          <div className="space-y-4">
            <div className="max-w-sm">
              <EnabledCompanySelect value={companyId} onChange={setCompanyId} />
            </div>

            {companyId && (
              <>
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
                      <option value="accepted">{tc("statuses.accepted")}</option>
                      <option value="rejected">{tc("statuses.rejected")}</option>
                      <option value="cancelled">{tc("statuses.cancelled")}</option>
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
              </>
            )}
          </div>
        </div>

        {/* Empty state: no company selected */}
        {!companyId && (
          <div className="bg-card border border-border rounded-lg p-8 text-center">
            <AiOutlineBank className="text-5xl text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {t("selectCompany")}
            </p>
          </div>
        )}

        {/* Table */}
        {companyId && (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto mb-4"></div>
                <p className="text-muted-foreground">{t("loading")}</p>
              </div>
            ) : filteredAbsences.length === 0 ? (
              <div className="p-8 text-center">
                <AiOutlineCalendar className="text-6xl text-muted-foreground mx-auto mb-4" />
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
                        {t("typeCol")}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {t("datesCol")}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {t("daysCol")}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {tc("status")}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {t("requestedCol")}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {tc("actions")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-card divide-y divide-border">
                    {filteredAbsences.map((absence) => (
                      <tr
                        key={absence.id}
                        className="hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => router.push(`/absences/${absence.id}`)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-foreground">
                            {absence.worker_first_name} {absence.worker_last_name}
                          </div>
                          <div className="text-xs text-muted-foreground">{absence.worker_email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                          {absence.absence_type_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                          {absence.start_date} — {absence.end_date}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                          {absence.days_computed}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColors[absence.status]}`}
                          >
                            {tc(`statuses.${absence.status}`)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                          {new Date(absence.created_at).toLocaleDateString(locale)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/absences/${absence.id}`);
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
        )}

        {/* Summary */}
        {companyId && filteredAbsences.length > 0 && (
          <div className="mt-4 text-sm text-muted-foreground">
            {searchTerm
              ? t("showingFiltered", { shown: filteredAbsences.length, total: absences.length, term: searchTerm })
              : t("showing", { count: filteredAbsences.length })}
          </div>
        )}
      </div>
    </AppWrapper>
  );
}
