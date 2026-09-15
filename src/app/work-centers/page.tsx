"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import AppWrapper from "@/components/AppWrapper";
import Link from "next/link";
import { apiClient, type WorkCenter, type Company } from "@/lib/api-client";
import toast from "react-hot-toast";
import { getApiErrorMessage } from "@/lib/error-messages";
import { AiOutlinePlus, AiOutlineEdit, AiOutlineDelete, AiOutlineShop } from "react-icons/ai";

export default function WorkCentersPage() {
  const t = useTranslations("workCenters");
  const tc = useTranslations("common");
  const [workCenters, setWorkCenters] = useState<WorkCenter[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    // TODO: migrar a hook de datos (fetch-on-mount)
    // eslint-disable-next-line react-hooks/immutability
    loadWorkCenters();
    // eslint-disable-next-line react-hooks/immutability
    loadCompanies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadWorkCenters = async (companyId?: string) => {
    try {
      const data = await apiClient.getWorkCenters(companyId ? { company_id: companyId } : undefined);
      setWorkCenters(data);
    } catch (error) {
      console.error("Error loading work centers:", error);
      toast.error(getApiErrorMessage(error, t("loadError")));
    } finally {
      setLoading(false);
    }
  };

  const loadCompanies = async () => {
    try {
      const data = await apiClient.getCompanies();
      setCompanies(data);
    } catch (error) {
      console.error("Error loading companies:", error);
      toast.error(getApiErrorMessage(error, t("companyLoadError")));
    } finally {
      setLoadingCompanies(false);
    }
  };

  const handleCompanyFilter = (companyId: string) => {
    setSelectedCompanyId(companyId);
    loadWorkCenters(companyId || undefined);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(t("confirmDelete", { name }))) {
      return;
    }

    setDeletingId(id);

    try {
      await apiClient.deleteWorkCenter(id);
      toast.success(t("deleted"));
      loadWorkCenters(selectedCompanyId || undefined);
    } catch (error) {
      console.error("Error deleting work center:", error);
      toast.error(getApiErrorMessage(error, t("deleteError")));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <AppWrapper>
      <div>
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <AiOutlineShop />
              {t("title")}
            </h1>
            <p className="text-muted-foreground">{t("subtitle")}</p>
          </div>
          <Link
            href="/work-centers/new"
            className="flex items-center gap-2 bg-accent text-accent-foreground px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
          >
            <AiOutlinePlus className="text-xl" />
            <span>{t("new")}</span>
          </Link>
        </div>

        {/* Company filter */}
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
                  onChange={(e) => handleCompanyFilter(e.target.value)}
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
          </div>
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto mb-4"></div>
              <p className="text-muted-foreground">{t("loading")}</p>
            </div>
          ) : workCenters.length === 0 ? (
            <div className="p-8 text-center">
              <AiOutlineShop className="text-6xl text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">{t("empty")}</p>
              <Link
                href="/work-centers/new"
                className="inline-flex items-center gap-2 text-accent hover:underline"
              >
                <AiOutlinePlus />
                <span>{t("createFirst")}</span>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {tc("name")}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {t("codeCol")}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {t("addressCol")}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {tc("company")}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {tc("actions")}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {workCenters.map((workCenter) => (
                    <tr key={workCenter.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                        {workCenter.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {workCenter.code || "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {workCenter.address || "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {workCenter.company_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/work-centers/${workCenter.id}/edit`}
                            className="text-accent hover:text-accent/80 p-2"
                            title={tc("edit")}
                          >
                            <AiOutlineEdit className="text-xl" />
                          </Link>
                          <button
                            onClick={() => handleDelete(workCenter.id, workCenter.name)}
                            disabled={deletingId === workCenter.id}
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

        {/* Summary */}
        {workCenters.length > 0 && (
          <div className="mt-4 text-sm text-muted-foreground">
            {t("totalCount", { count: workCenters.length })}
          </div>
        )}
      </div>
    </AppWrapper>
  );
}