"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import AppWrapper from "@/components/AppWrapper";
import Link from "next/link";
import { apiClient, type Company } from "@/lib/api-client";
import toast from "react-hot-toast";
import { getApiErrorMessage } from "@/lib/error-messages";
import { AiOutlineArrowLeft } from "react-icons/ai";

export default function NewWorkerPage() {
  const t = useTranslations("workers");
  const tc = useTranslations("common");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone_number: "",
    id_number: "",
    password: "",
    default_timezone: "Europe/Madrid",
  });

  const [sendWelcomeEmail, setSendWelcomeEmail] = useState(false);

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
      toast.error(getApiErrorMessage(error, t("companiesLoadError")));
    } finally {
      setLoadingCompanies(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const toggleCompany = (companyId: string) => {
    setSelectedCompanies((prev) =>
      prev.includes(companyId)
        ? prev.filter((id) => id !== companyId)
        : [...prev, companyId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.first_name || !formData.last_name || !formData.email || !formData.id_number || !formData.password) {
      toast.error(t("requiredFields"));
      return;
    }

    if (selectedCompanies.length === 0) {
      toast.error(t("needCompany"));
      return;
    }

    setLoading(true);

    try {
      await apiClient.createWorker({
        ...formData,
        company_ids: selectedCompanies,
        send_welcome_email: sendWelcomeEmail,
      });
      toast.success(t("created"));
      router.push("/workers");
    } catch (error) {
      console.error("Error creating worker:", error);
      toast.error(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppWrapper>
      <div>
        {/* Header */}
        <div className="mb-6">
          <Link href="/workers" className="inline-flex items-center gap-2 text-accent hover:underline mb-4">
            <AiOutlineArrowLeft />
            <span>{t("backToList")}</span>
          </Link>
          <h1 className="text-3xl font-bold text-foreground">{t("createTitle")}</h1>
          <p className="text-muted-foreground">{t("createSubtitle")}</p>
        </div>

        {/* Form */}
        <div className="bg-card border border-border rounded-lg p-6 max-w-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="first_name" className="block text-sm font-medium text-foreground mb-2">
                  {t("firstName")} <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  id="first_name"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                  required
                />
              </div>

              <div>
                <label htmlFor="last_name" className="block text-sm font-medium text-foreground mb-2">
                  {t("lastName")} <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  id="last_name"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="id_number" className="block text-sm font-medium text-foreground mb-2">
                {tc("dniNie")} <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                id="id_number"
                name="id_number"
                value={formData.id_number}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder={t("idNumberPlaceholder")}
                required
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                {tc("email")} <span className="text-destructive">*</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder={t("emailPlaceholder")}
                required
              />
            </div>

            <div>
              <label htmlFor="phone_number" className="block text-sm font-medium text-foreground mb-2">
                {tc("phone")}
              </label>
              <input
                type="tel"
                id="phone_number"
                name="phone_number"
                value={formData.phone_number}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="+34 600 000 000"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
                {t("password")} <span className="text-destructive">*</span>
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder={t("passwordPlaceholder")}
                required
                minLength={8}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t("passwordHelp")}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                {t("companies")} <span className="text-destructive">*</span>
              </label>
              {loadingCompanies ? (
                <div className="text-sm text-muted-foreground">{t("companiesLoading")}</div>
              ) : companies.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  {t("companiesEmpty")}{" "}
                  <Link href="/companies/new" className="text-accent hover:underline">
                    {t("companiesEmptyCreate")}
                  </Link>
                </div>
              ) : (
                <>
                  <div className="border border-input bg-background rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                    {companies.map((company) => (
                      <label
                        key={company.id}
                        className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-2 rounded transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedCompanies.includes(company.id)}
                          onChange={() => toggleCompany(company.id)}
                          className="w-4 h-4 text-accent border-input rounded focus:ring-2 focus:ring-accent"
                        />
                        <span className="text-sm text-foreground">{company.name}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("companiesHelp", { count: selectedCompanies.length })}
                  </p>
                </>
              )}
            </div>

            <div>
              <label htmlFor="default_timezone" className="block text-sm font-medium text-foreground mb-2">
                {t("timezone")}
              </label>
              <select
                id="default_timezone"
                name="default_timezone"
                value={formData.default_timezone}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="Europe/Madrid">{t("tzMadrid")}</option>
                <option value="Atlantic/Canary">{t("tzCanary")}</option>
                <option value="UTC">UTC</option>
              </select>
            </div>

            <div>
              <input
                type="checkbox"
                id="send_welcome_email"
                checked={sendWelcomeEmail}
                onChange={() => setSendWelcomeEmail(!sendWelcomeEmail)}
                className="w-4 h-4 text-accent border-input rounded focus:ring-2 focus:ring-accent"
              />
              <label htmlFor="send_welcome_email" className="ml-2 text-sm text-foreground">
                {t("sendWelcome")}
              </label>
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
                href="/workers"
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
