"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import AppWrapper from "@/components/AppWrapper";
import Link from "next/link";
import { apiClient, type WorkCenter } from "@/lib/api-client";
import toast from "react-hot-toast";
import { getApiErrorMessage } from "@/lib/error-messages";
import { AiOutlineArrowLeft, AiOutlineShop } from "react-icons/ai";

export default function EditWorkCenterPage() {
  const t = useTranslations("workCenters");
  const tc = useTranslations("common");
  const router = useRouter();
  const params = useParams();
  const workCenterId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [address, setAddress] = useState("");
  const [companyName, setCompanyName] = useState("");

  const loadWorkCenter = async () => {
    try {
      const workCenter: WorkCenter = await apiClient.getWorkCenter(workCenterId);
      setName(workCenter.name);
      setCode(workCenter.code || "");
      setAddress(workCenter.address || "");
      setCompanyName(workCenter.company_name);
    } catch (error) {
      console.error("Error loading work center:", error);
      toast.error(getApiErrorMessage(error, t("loadOneError")));
      router.push("/work-centers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // TODO: migrar a hook de datos (fetch-on-mount)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadWorkCenter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workCenterId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!name.trim()) {
      toast.error(t("nameRequired"));
      return;
    }

    setSaving(true);

    try {
      await apiClient.updateWorkCenter(workCenterId, {
        name: name.trim(),
        code: code.trim() || null,
        address: address.trim() || null,
      });
      toast.success(t("saved"));
      router.push("/work-centers");
    } catch (error) {
      console.error("Error updating work center:", error);
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
          <Link href="/work-centers" className="inline-flex items-center gap-2 text-accent hover:underline mb-4">
            <AiOutlineArrowLeft />
            <span>{t("backToList")}</span>
          </Link>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <AiOutlineShop />
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
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t("nameHelp")}
              </p>
            </div>

            <div>
              <label htmlFor="code" className="block text-sm font-medium text-foreground mb-2">
                {t("codeLabel")}
              </label>
              <input
                type="text"
                id="code"
                name="code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-4 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder={t("codePlaceholder")}
                maxLength={50}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t("codeHelp")}
              </p>
            </div>

            <div>
              <label htmlFor="address" className="block text-sm font-medium text-foreground mb-2">
                {t("addressLabel")}
              </label>
              <input
                type="text"
                id="address"
                name="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-4 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder={t("addressPlaceholder")}
                maxLength={300}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t("addressHelp")}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                {tc("company")}
              </label>
              <div className="w-full px-4 py-2 border border-input bg-muted rounded-lg text-sm text-muted-foreground">
                {companyName}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {t("companyImmutable")}
              </p>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-accent text-accent-foreground py-2 px-4 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? tc("saving") : t("saveChanges")}
              </button>
              <Link
                href="/work-centers"
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