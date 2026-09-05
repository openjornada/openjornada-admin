"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import AppWrapper from "@/components/AppWrapper";
import Link from "next/link";
import { apiClient, type Company, type SupportedLocale } from "@/lib/api-client";
import { locales } from "@/i18n/config";
import toast from "react-hot-toast";
import { getApiErrorMessage } from "@/lib/error-messages";
import { AiOutlineArrowLeft, AiOutlineBank } from "react-icons/ai";

export default function EditCompanyPage() {
  const t = useTranslations("companies");
  const tc = useTranslations("common");
  const tl = useTranslations("common.language");
  const router = useRouter();
  const params = useParams();
  const companyId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [absenceManagementEnabled, setAbsenceManagementEnabled] = useState(false);
  // Company notification language: independent of the admin's UI language.
  const [notificationLanguage, setNotificationLanguage] = useState<SupportedLocale>("es");

  const loadCompany = async () => {
    try {
      const company: Company = await apiClient.getCompany(companyId);
      setName(company.name);
      setAbsenceManagementEnabled(company.absence_management_enabled);
      setNotificationLanguage(company.notification_language ?? "es");
    } catch (error) {
      console.error("Error loading company:", error);
      toast.error(getApiErrorMessage(error, t("loadOneError")));
      router.push("/companies");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // TODO: migrar a hook de datos (fetch-on-mount)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadCompany();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!name.trim()) {
      toast.error(t("nameRequired"));
      return;
    }

    if (name.trim().length < 2) {
      toast.error(t("nameMin"));
      return;
    }

    setSaving(true);

    try {
      await apiClient.updateCompany(companyId, {
        name: name.trim(),
        absence_management_enabled: absenceManagementEnabled,
        notification_language: notificationLanguage,
      });
      toast.success(t("saved"));
      router.push("/companies");
    } catch (error) {
      console.error("Error updating company:", error);
      toast.error(getApiErrorMessage(error, t("saveError")));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppWrapper>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
            <p className="text-muted-foreground">{t("loading")}</p>
          </div>
        </div>
      </AppWrapper>
    );
  }

  return (
    <AppWrapper>
      <div>
        {/* Header */}
        <div className="mb-6">
          <Link href="/companies" className="inline-flex items-center gap-2 text-accent hover:underline mb-4">
            <AiOutlineArrowLeft />
            <span>{t("backToList")}</span>
          </Link>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <AiOutlineBank />
            {t("editTitle")}
          </h1>
          <p className="text-muted-foreground">{t("editSubtitle")}</p>
        </div>

        {/* Form */}
        <div className="bg-card border border-border rounded-lg p-6 max-w-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
                {t("nameLabel")} <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder={t("namePlaceholder")}
                required
                minLength={2}
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground mt-1">{t("nameHelp")}</p>
            </div>

            {/* Notification language (per-company, independent of admin UI language) */}
            <div>
              <label htmlFor="notification_language" className="block text-sm font-medium text-foreground mb-2">
                {t("notifLangLabel")} <span className="text-destructive">*</span>
              </label>
              <select
                id="notification_language"
                name="notification_language"
                value={notificationLanguage}
                onChange={(e) => setNotificationLanguage(e.target.value as SupportedLocale)}
                className="w-full max-w-xs px-4 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                disabled={saving}
              >
                {locales.map((code) => (
                  <option key={code} value={code}>
                    {tl(code)}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-1">{t("notifLangHelp")}</p>
            </div>

            <div className="flex items-center gap-3 pt-2 border-t border-border">
              <input
                type="checkbox"
                id="absence_management_enabled"
                checked={absenceManagementEnabled}
                onChange={(e) => setAbsenceManagementEnabled(e.target.checked)}
                className="w-5 h-5 rounded border-input text-accent focus:ring-accent"
              />
              <label htmlFor="absence_management_enabled" className="text-sm font-medium text-foreground">
                {t("absenceModule")}
              </label>
            </div>
            <p className="text-xs text-muted-foreground -mt-4">{t("absenceModuleHelp")}</p>

            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-accent text-accent-foreground py-2 px-4 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? tc("saving") : t("saveChanges")}
              </button>
              <Link
                href="/companies"
                className="flex-1 bg-secondary text-secondary-foreground py-2 px-4 rounded-lg font-medium hover:opacity-90 transition-opacity text-center"
              >
                {tc("cancel")}
              </Link>
            </div>
          </form>
        </div>
      </div>
    </AppWrapper>
  );
}
