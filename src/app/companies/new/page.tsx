"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import AppWrapper from "@/components/AppWrapper";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import toast from "react-hot-toast";
import { getApiErrorMessage } from "@/lib/error-messages";
import { AiOutlineArrowLeft, AiOutlineBank } from "react-icons/ai";

export default function NewCompanyPage() {
  const t = useTranslations("companies");
  const tc = useTranslations("common");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");

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

    setLoading(true);

    try {
      await apiClient.createCompany({ name: name.trim() });
      toast.success(t("created"));
      router.push("/companies");
    } catch (error) {
      console.error("Error creating company:", error);
      toast.error(getApiErrorMessage(error, t("createError")));
    } finally {
      setLoading(false);
    }
  };

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
            {t("createTitle")}
          </h1>
          <p className="text-muted-foreground">{t("createSubtitle")}</p>
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
              <p className="text-xs text-muted-foreground mt-1">
                {t("nameHelp")}
              </p>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-accent text-accent-foreground py-2 px-4 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? t("creating") : t("createSubmit")}
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
