"use client";

import { useState, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import AppWrapper from "@/components/AppWrapper";
import Link from "next/link";
import { apiClient, type Worker } from "@/lib/api-client";
import toast from "react-hot-toast";
import { getApiErrorMessage } from "@/lib/error-messages";
import { AiOutlinePlus, AiOutlineEdit, AiOutlineDelete } from "react-icons/ai";

export default function WorkersPage() {
  const t = useTranslations("workers");
  const tc = useTranslations("common");
  const locale = useLocale();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    // TODO: migrar a hook de datos (fetch-on-mount)
    // eslint-disable-next-line react-hooks/immutability
    loadWorkers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadWorkers = async () => {
    try {
      const data = await apiClient.getWorkers();
      setWorkers(data);
    } catch (error) {
      console.error("Error loading workers:", error);
      toast.error(getApiErrorMessage(error, t("loadError")));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(t("confirmDelete", { name }))) {
      return;
    }

    setDeletingId(id);

    try {
      await apiClient.deleteWorker(id);
      toast.success(t("deleted"));
      loadWorkers();
    } catch (error) {
      console.error("Error deleting worker:", error);
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

        {/* Table */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto mb-4"></div>
              <p className="text-muted-foreground">{t("loading")}</p>
            </div>
          ) : workers.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-muted-foreground mb-4">{t("empty")}</p>
              <Link
                href="/workers/new"
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
                  {workers.map((worker) => (
                    <tr key={worker.id} className="hover:bg-muted/50 transition-colors">
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
    </AppWrapper>
  );
}
