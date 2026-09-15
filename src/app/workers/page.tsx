"use client";

import { useState, useEffect, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import AppWrapper from "@/components/AppWrapper";
import Link from "next/link";
import { apiClient, type Worker, type Company, type WorkCenter } from "@/lib/api-client";
import toast from "react-hot-toast";
import { getApiErrorMessage } from "@/lib/error-messages";
import { AiOutlinePlus, AiOutlineEdit, AiOutlineDelete, AiOutlineShop } from "react-icons/ai";

export default function WorkersPage() {
  const t = useTranslations("workers");
  const tc = useTranslations("common");
  const locale = useLocale();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [centers, setCenters] = useState<WorkCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [loadingCenters, setLoadingCenters] = useState(true);
  const [filtering, setFiltering] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [selectedCenterId, setSelectedCenterId] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [assigningWorker, setAssigningWorker] = useState<Worker | null>(null);
  const [assigningCompanyId, setAssigningCompanyId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState("");
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
  const [bulkAssignCenterId, setBulkAssignCenterId] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);

  const assignModalRef = useRef<HTMLDivElement>(null);
  const bulkModalRef = useRef<HTMLDivElement>(null);
  const selectAllRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (assigningWorker) assignModalRef.current?.focus();
  }, [assigningWorker]);

  useEffect(() => {
    if (bulkAssignOpen) bulkModalRef.current?.focus();
  }, [bulkAssignOpen]);

  useEffect(() => {
    // TODO: migrar a hook de datos (fetch-on-mount)
    // eslint-disable-next-line react-hooks/immutability
    loadWorkers();
    // eslint-disable-next-line react-hooks/immutability
    loadCompanies();
    // eslint-disable-next-line react-hooks/immutability
    loadCenters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadWorkers = async (workCenterId?: string) => {
    setFiltering(true);
    setSelectedIds([]);
    try {
      const data = await apiClient.getWorkers(workCenterId ? { work_center_id: workCenterId } : undefined);
      setWorkers(data);
    } catch (error) {
      console.error("Error loading workers:", error);
      toast.error(getApiErrorMessage(error, t("loadError")));
    } finally {
      setLoading(false);
      setFiltering(false);
    }
  };

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

  const loadCenters = async () => {
    try {
      const data = await apiClient.getWorkCenters();
      setCenters(data);
    } catch (error) {
      console.error("Error loading work centers:", error);
      toast.error(getApiErrorMessage(error, t("centerLoadError")));
    } finally {
      setLoadingCenters(false);
    }
  };

  const handleCompanyFilterChange = (companyId: string) => {
    setSelectedCompanyId(companyId);
    setSelectedIds([]);
    // Reset the center filter if the selected center doesn't belong to the new company
    if (selectedCenterId) {
      const center = centers.find((c) => c.id === selectedCenterId);
      if (center && center.company_id !== companyId) {
        setSelectedCenterId("");
      }
    }
  };

  const handleCenterFilterChange = (centerId: string) => {
    setSelectedCenterId(centerId);
    setSelectedIds([]);
  };

  const handleFilter = () => {
    setSelectedIds([]);
    loadWorkers(selectedCenterId || undefined);
  };

  const handleClearFilters = () => {
    setSelectedCompanyId("");
    setSelectedCenterId("");
    setSelectedIds([]);
    loadWorkers();
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(t("confirmDelete", { name }))) {
      return;
    }

    setDeletingId(id);

    try {
      await apiClient.deleteWorker(id);
      toast.success(t("deleted"));
      loadWorkers(selectedCenterId || undefined);
    } catch (error) {
      console.error("Error deleting worker:", error);
      toast.error(getApiErrorMessage(error, t("deleteError")));
    } finally {
      setDeletingId(null);
    }
  };

  const handleAssign = async (worker: Worker, companyId: string, workCenterId: string) => {
    setAssigningCompanyId(companyId);
    try {
      const updated = await apiClient.assignWorkerWorkCenter(worker.id, {
        company_id: companyId,
        work_center_id: workCenterId || null,
      });
      setWorkers((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
      setAssigningWorker(updated);
      toast.success(t("centerAssigned"));
    } catch (error) {
      console.error("Error assigning work center:", error);
      toast.error(getApiErrorMessage(error, t("assignError")));
    } finally {
      setAssigningCompanyId(null);
    }
  };

  const toggleWorkerSelection = (workerId: string) => {
    setSelectedIds((prev) =>
      prev.includes(workerId) ? prev.filter((id) => id !== workerId) : [...prev, workerId]
    );
  };

  const toggleSelectAllVisible = () => {
    const visibleIds = filteredWorkers.map((w) => w.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
    setSelectedIds((prev) =>
      allSelected ? prev.filter((id) => !visibleIds.includes(id)) : [...new Set([...prev, ...visibleIds])]
    );
  };

  const handleApplyBulkAction = () => {
    if (!bulkAction || selectedIds.length === 0) return;
    if (bulkAction === "assign") {
      setBulkAssignCenterId("");
      setBulkAssignOpen(true);
    } else if (bulkAction === "clear") {
      const confirmMessage = selectedCompanyId
        ? t("bulkClearConfirmCompany", {
            count: selectedIds.length,
            company: companies.find((c) => c.id === selectedCompanyId)?.name || "",
          })
        : t("bulkClearConfirm", { count: selectedIds.length });
      if (!confirm(confirmMessage)) return;
      void runBulkClear();
    }
  };

  const runBulkClear = async () => {
    setBulkLoading(true);
    try {
      const result = await apiClient.bulkWorkCenter({
        worker_ids: selectedIds,
        action: "clear",
        company_id: selectedCompanyId || undefined,
      });
      toast.success(t("bulkCleared", { updated: result.updated }));
      setBulkAction("");
      setSelectedIds([]);
      loadWorkers(selectedCenterId || undefined);
    } catch (error) {
      console.error("Error clearing work centers in bulk:", error);
      toast.error(getApiErrorMessage(error, t("bulkClearError")));
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkAssign = async () => {
    if (!bulkAssignCenterId) return;
    const center = centers.find((c) => c.id === bulkAssignCenterId);
    if (!center) return;

    setBulkLoading(true);
    try {
      const result = await apiClient.bulkWorkCenter({
        worker_ids: selectedIds,
        action: "assign",
        company_id: center.company_id,
        work_center_id: center.id,
      });
      toast.success(t("bulkAssigned", { updated: result.updated, total: result.total }));
      if (result.skipped > 0) {
        toast(t("bulkSkippedNote", { skipped: result.skipped }));
      }
      setBulkAssignOpen(false);
      setBulkAssignCenterId("");
      setBulkAction("");
      setSelectedIds([]);
      loadWorkers(selectedCenterId || undefined);
    } catch (error) {
      console.error("Error assigning work centers in bulk:", error);
      toast.error(getApiErrorMessage(error, t("bulkAssignError")));
    } finally {
      setBulkLoading(false);
    }
  };

  const getWorkerCentersLabel = (worker: Worker) => {
    const parts = Object.entries(worker.work_center_names || {})
      .map(([companyId, centerName]) => {
        const companyName = worker.company_names[worker.company_ids.indexOf(companyId)] || "";
        return `${centerName} · ${companyName}`;
      });
    return parts.length > 0 ? parts.join(", ") : "—";
  };

  const centerOptions = selectedCompanyId
    ? centers.filter((c) => c.company_id === selectedCompanyId)
    : centers;

  const filteredWorkers = selectedCompanyId
    ? workers.filter((w) => w.company_ids.includes(selectedCompanyId))
    : workers;

  const hasActiveFilters = Boolean(selectedCompanyId || selectedCenterId);

  const allVisibleSelected =
    filteredWorkers.length > 0 && filteredWorkers.every((w) => selectedIds.includes(w.id));

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate =
        !allVisibleSelected && filteredWorkers.some((w) => selectedIds.includes(w.id));
    }
  }, [allVisibleSelected, filteredWorkers, selectedIds]);

  return (
    <AppWrapper>
      <div>
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{t("title")}</h1>
            <p className="text-muted-foreground">{t("subtitle")}</p>
          </div>
          <Link
            href="/workers/new"
            className="flex items-center gap-2 bg-accent text-accent-foreground px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
          >
            <AiOutlinePlus className="text-xl" />
            <span>{t("new")}</span>
          </Link>
        </div>

        {/* Filters */}
        <div className="bg-card border border-border rounded-lg p-4 mb-6">
          <div className="flex flex-wrap items-end gap-4">
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
              {loadingCenters ? (
                <div className="w-full px-4 py-2 border border-input bg-background rounded-lg text-sm text-muted-foreground">
                  {tc("loading")}
                </div>
              ) : (
                <select
                  id="center"
                  value={selectedCenterId}
                  onChange={(e) => handleCenterFilterChange(e.target.value)}
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
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          {/* Batch actions */}
          <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-border">
            <label htmlFor="bulk-action" className="text-sm font-medium text-foreground">
              {t("bulkActions")}
            </label>
            <select
              id="bulk-action"
              value={bulkAction}
              onChange={(e) => setBulkAction(e.target.value)}
              disabled={bulkLoading || selectedIds.length === 0}
              className="px-4 py-2 border border-input bg-background rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
            >
              <option value="">{t("bulkActionsPlaceholder")}</option>
              <option value="assign">{t("bulkActionAssign")}</option>
              <option value="clear">{t("bulkActionClear")}</option>
            </select>
            <button
              onClick={handleApplyBulkAction}
              disabled={bulkLoading || selectedIds.length === 0 || !bulkAction}
              className="bg-accent text-accent-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {t("bulkApply")}
            </button>
            {selectedIds.length > 0 && (
              <span className="text-sm text-muted-foreground">
                {t("bulkSelectedCount", { count: selectedIds.length })}
              </span>
            )}
          </div>
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto mb-4"></div>
              <p className="text-muted-foreground">{t("loading")}</p>
            </div>
          ) : filteredWorkers.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-muted-foreground mb-4">{hasActiveFilters ? t("emptyFiltered") : t("empty")}</p>
              {!hasActiveFilters && (
                <Link
                  href="/workers/new"
                  className="inline-flex items-center gap-2 text-accent hover:underline"
                >
                  <AiOutlinePlus />
                  <span>{t("createFirst")}</span>
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-10">
                      <input
                        ref={selectAllRef}
                        type="checkbox"
                        checked={allVisibleSelected}
                        onChange={toggleSelectAllVisible}
                        aria-label={t("selectAllAria")}
                        className="w-4 h-4 text-accent border-input rounded focus:ring-2 focus:ring-accent"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {tc("dni")}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {tc("name")}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {tc("email")}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {tc("phone")}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {t("centerColumn")}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {t("smsColumn")}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {t("registeredAt")}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {tc("actions")}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {filteredWorkers.map((worker) => (
                    <tr key={worker.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(worker.id)}
                          onChange={() => toggleWorkerSelection(worker.id)}
                          aria-label={t("selectWorkerAria", { name: `${worker.first_name} ${worker.last_name}` })}
                          className="w-4 h-4 text-accent border-input rounded focus:ring-2 focus:ring-accent"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                        {worker.id_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                        {worker.first_name} {worker.last_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {worker.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {worker.phone_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {getWorkerCentersLabel(worker)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {(worker.sms_config?.sms_enabled ?? true) ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            {tc("active")}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                            {tc("inactive")}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {new Date(worker.created_at).toLocaleDateString(locale)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setAssigningWorker(worker)}
                            className="text-accent hover:text-accent/80 p-2"
                            title={t("assignCenter")}
                          >
                            <AiOutlineShop className="text-xl" />
                          </button>
                          <Link
                            href={`/workers/${worker.id}/edit`}
                            className="text-accent hover:text-accent/80 p-2"
                            title={tc("edit")}
                          >
                            <AiOutlineEdit className="text-xl" />
                          </Link>
                          <button
                            onClick={() => handleDelete(worker.id, `${worker.first_name} ${worker.last_name}`)}
                            disabled={deletingId === worker.id}
                            className="text-destructive hover:text-destructive/80 p-2 disabled:opacity-50"
                            title={tc("delete")}
                          >
                            <AiOutlineDelete className="text-xl" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Assign to work center modal */}
      {assigningWorker && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setAssigningWorker(null)}
        >
          <div
            className="bg-card border border-border rounded-lg p-6 w-full max-w-md"
            role="dialog"
            aria-modal="true"
            aria-labelledby="assign-center-title"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => { if (e.key === "Escape") setAssigningWorker(null); }}
            tabIndex={-1}
            ref={assignModalRef}
          >
            <h3 id="assign-center-title" className="text-lg font-semibold text-foreground mb-4">
              {t("assignCenterTitle", { name: `${assigningWorker.first_name} ${assigningWorker.last_name}` })}
            </h3>

            <div className="space-y-4">
              {assigningWorker.company_ids.map((companyId) => {
                const companyName = assigningWorker.company_names[assigningWorker.company_ids.indexOf(companyId)] || "";
                const companyCenters = centers.filter((c) => c.company_id === companyId);
                const currentValue = assigningWorker.work_center_assignments?.[companyId] || "";
                return (
                  <div key={companyId}>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      {companyName}
                    </label>
                    <select
                      value={currentValue}
                      onChange={(e) => handleAssign(assigningWorker, companyId, e.target.value)}
                      disabled={assigningCompanyId === companyId}
                      className="w-full px-4 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
                    >
                      <option value="">{t("noCenter")}</option>
                      {companyCenters.map((center) => (
                        <option key={center.id} value={center.id}>
                          {center.name}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setAssigningWorker(null)}
                className="flex-1 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
              >
                {tc("close")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk assign to work center modal */}
      {bulkAssignOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => { if (!bulkLoading) setBulkAssignOpen(false); }}
        >
          <div
            className="bg-card border border-border rounded-lg p-6 w-full max-w-md"
            role="dialog"
            aria-modal="true"
            aria-labelledby="bulk-assign-center-title"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => { if (e.key === "Escape" && !bulkLoading) setBulkAssignOpen(false); }}
            tabIndex={-1}
            ref={bulkModalRef}
          >
            <h3 id="bulk-assign-center-title" className="text-lg font-semibold text-foreground mb-4">
              {t("bulkAssignTitle", { count: selectedIds.length })}
            </h3>

            <div className="space-y-4">
              <div>
                <label htmlFor="bulk-center" className="block text-sm font-medium text-foreground mb-2">
                  {t("bulkCenterLabel")}
                </label>
                <select
                  id="bulk-center"
                  value={bulkAssignCenterId}
                  onChange={(e) => setBulkAssignCenterId(e.target.value)}
                  disabled={bulkLoading}
                  className="w-full px-4 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
                >
                  <option value="">{t("bulkCenterPlaceholder")}</option>
                  {centerOptions.map((center) => (
                    <option key={center.id} value={center.id}>
                      {center.name}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-muted-foreground">{t("bulkAssignNote")}</p>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setBulkAssignOpen(false)}
                disabled={bulkLoading}
                className="flex-1 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {tc("cancel")}
              </button>
              <button
                type="button"
                onClick={handleBulkAssign}
                disabled={bulkLoading || !bulkAssignCenterId}
                className="flex-1 px-4 py-2 bg-accent text-accent-foreground rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {bulkLoading ? t("bulkAssigning") : t("bulkAssignConfirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppWrapper>
  );
}