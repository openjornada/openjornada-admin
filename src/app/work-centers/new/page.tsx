"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import AppWrapper from "@/components/AppWrapper";
import Link from "next/link";
import { apiClient, type Company } from "@/lib/api-client";
import toast from "react-hot-toast";
import { getApiErrorMessage } from "@/lib/error-messages";
import { AiOutlineArrowLeft, AiOutlineShop } from "react-icons/ai";

export default function NewWorkCenterPage() {
  const t = useTranslations("workCenters");
  const tc = useTranslations("common");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [address, setAddress] = useState("");
  const [companyId, setCompanyId] = useState("");

  useEffect(() => {
    // TODO: migrar a hook de datos (fetch-on-mount)
    // eslint-disable-next-line react-hooks/immutability
    loadCompanies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!name.trim()) {
      toast.error(t("nameRequired"));
      return;
    }

    if (!companyId) {
      toast.error(t("companyRequired"));
      return;
    }

    setLoading(true);

    try {
      await apiClient.createWorkCenter({
        name: name.trim(),
        code: code.trim() || undefined,
        address: address.trim() || undefined,
        company_id: companyId,
      });
      toast.success(t("created"));
      router.push("/work-centers");
    } catch (error) {
      console.error("Error creating work center:", error);
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
          <Link href="/work-centers" className="inline-flex items-center gap-2 text-accent hover:underline mb-4">
            <AiOutlineArrowLeft />
            <span>{t("backToList")}</span>
          </Link>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <AiOutlineShop />
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
              <label htmlFor="company_id" className="block text-sm font-medium text-foreground mb-2">
                {tc("company")} <span className="text-destructive">*</span>
              </label>
              {loadingCompanies ? (
                <div className="w-full px-4 py-2 border border-input bg-background rounded-lg text-sm text-muted-foreground">
                  {tc("loading")}
                </div>
              ) : companies.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  {t("companiesEmpty")}{" "}
                  <Link href="/companies/new" className="text-accent hover:underline">
                    {t("companiesEmptyCreate")}
                  </Link>
                </div>
              ) : (
                <select
                  id="company_id"
                  name="company_id"
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                  className="w-full px-4 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                  disabled={loading}
                >
                  <option value="">{t("selectCompany")}</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {t("companyHelp")}
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