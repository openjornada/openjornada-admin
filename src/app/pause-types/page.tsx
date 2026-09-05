"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import AppWrapper from "@/components/AppWrapper";
import Link from "next/link";
import { apiClient, type PauseType } from "@/lib/api-client";
import toast from "react-hot-toast";
import { getApiErrorMessage } from "@/lib/error-messages";
import { AiOutlinePlus, AiOutlineEdit, AiOutlineDelete, AiOutlinePauseCircle } from "react-icons/ai";

export default function PauseTypesPage() {
  const t = useTranslations("pauseTypes");
  const tc = useTranslations("common");
  const [pauseTypes, setPauseTypes] = useState<PauseType[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    // TODO: migrar a hook de datos (fetch-on-mount)
    // eslint-disable-next-line react-hooks/immutability
    loadPauseTypes();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadPauseTypes = async () => {
    try {
      const data = await apiClient.getPauseTypes();
      setPauseTypes(data);
    } catch (error) {
      console.error("Error loading pause types:", error);
      toast.error(getApiErrorMessage(error, t("loadError")));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string, usageCount: number) => {
    if (usageCount > 0) {
      if (!confirm(t("confirmDeleteUsed", { name, count: usageCount }))) {
        return;
      }
    } else {
      if (!confirm(t("confirmDeleteSimple", { name }))) {
        return;
      }
    }

    setDeletingId(id);

    try {
      await apiClient.deletePauseType(id);
      toast.success(t("deleted"));
      loadPauseTypes();
    } catch (error) {
      console.error("Error deleting pause type:", error);
      toast.error(getApiErrorMessage(error, t("deleteError")));
    } finally {
      setDeletingId(null);
    }
  };

  const getTypeLabel = (type: string) => {
    return type === "inside_shift" ? t("insideShift") : t("outsideShift");
  };

  const getTypeBadgeClass = (type: string) => {
    return type === "inside_shift"
      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      : "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
  };

  return (
    <AppWrapper>
      <div>
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <AiOutlinePauseCircle />
              {t("title")}
            </h1>
            <p className="text-muted-foreground">{t("subtitle")}</p>
          </div>
          <Link
            href="/pause-types/new"
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
          ) : pauseTypes.length === 0 ? (
            <div className="p-8 text-center">
              <AiOutlinePauseCircle className="text-6xl text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">{t("empty")}</p>
              <Link
                href="/pause-types/new"
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
                      {tc("type")}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {t("companiesCol")}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {t("usageCol")}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {tc("actions")}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {pauseTypes.map((pauseType) => (
                    <tr key={pauseType.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-4 text-sm">
                        <div>
                          <div className="font-medium text-foreground">{pauseType.name}</div>
                          {pauseType.description && (
                            <div className="text-muted-foreground text-xs mt-1">{pauseType.description}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeBadgeClass(pauseType.type)}`}>
                          {getTypeLabel(pauseType.type)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        <div className="max-w-xs truncate" title={pauseType.company_names.join(", ")}>
                          {pauseType.company_names.join(", ")}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {t("usageCount", { count: pauseType.usage_count })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/pause-types/${pauseType.id}/edit`}
                            className="text-accent hover:text-accent/80 p-2"
                            title={tc("edit")}
                          >
                            <AiOutlineEdit className="text-xl" />
                          </Link>
                          <button
                            onClick={() => handleDelete(pauseType.id, pauseType.name, pauseType.usage_count)}
                            disabled={deletingId === pauseType.id}
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
        {pauseTypes.length > 0 && (
          <div className="mt-4 text-sm text-muted-foreground">
            {t("totalTypes", { count: pauseTypes.length })}
          </div>
        )}
      </div>
    </AppWrapper>
  );
}
