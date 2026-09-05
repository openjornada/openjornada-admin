"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { apiClient, type Company } from "@/lib/api-client";

interface EnabledCompanySelectProps {
  value: string;
  onChange: (companyId: string) => void;
  disabled?: boolean;
  label?: string;
}

/**
 * Company selector restricted to companies with the absence management
 * module active (`absence_management_enabled=true`). There is no global
 * "active company" concept in the admin panel today, so every screen that
 * needs a `company_id` (list, calendar, policy settings) picks it locally,
 * following the same pattern already used in `ReportFilters`.
 */
export default function EnabledCompanySelect({ value, onChange, disabled, label }: EnabledCompanySelectProps) {
  const t = useTranslations("absences");
  const tc = useTranslations("common");
  const labelOr = label ?? tc("company");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: migrar a hook de datos (fetch-on-mount)
    apiClient
      .getCompanies()
      .then((data) => {
        const enabled = data.filter((c) => c.absence_management_enabled);
        setCompanies(enabled);
        if (enabled.length > 0 && !value) {
          onChange(enabled[0].id);
        }
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!loading && companies.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        {t("noEnabledCompany")}{" "}
        <Link href="/companies" className="text-accent hover:underline">
          {t("enableInCompany")}
        </Link>
        .
      </div>
    );
  }

  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1">{labelOr}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || loading}
        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
      >
        {loading && <option value="">{tc("loading")}</option>}
        {companies.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </div>
  );
}
