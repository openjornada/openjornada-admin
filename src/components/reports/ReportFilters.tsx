"use client";

import React, { useState, useEffect } from "react";
import { apiClient, Company, Worker } from "@/lib/api-client";
import { getMonthName } from "@/utils/dateFormatters";

interface ReportFiltersProps {
  onFilter: (filters: {
    company_id: string;
    year: number;
    month: number;
    timezone?: string;
  }) => void;
  showWorkerFilter?: boolean;
  onWorkerChange?: (workerId: string | null) => void;
  loading?: boolean;
}

export default function ReportFilters({
  onFilter,
  showWorkerFilter = false,
  onWorkerChange,
  loading = false,
}: ReportFiltersProps) {
  const now = new Date();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [companyId, setCompanyId] = useState("");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [workerId, setWorkerId] = useState<string>("");
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    loadCompanies();
  }, []);

  useEffect(() => {
    if (showWorkerFilter && companyId) {
      loadWorkers();
    }
  }, [companyId, showWorkerFilter]);

  const loadCompanies = async () => {
    try {
      const data = await apiClient.getCompanies();
      setCompanies(data);
      if (data.length > 0) {
        setCompanyId(data[0].id);
      }
    } catch (error) {
      console.error("Error loading companies:", error);
    } finally {
      setLoadingData(false);
    }
  };

  const loadWorkers = async () => {
    try {
      const data = await apiClient.getWorkers();
      const filtered = data.filter((w: Worker) =>
        w.company_ids?.includes(companyId)
      );
      setWorkers(filtered);
    } catch (error) {
      console.error("Error loading workers:", error);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) return;
    onFilter({ company_id: companyId, year, month });
    if (onWorkerChange) {
      onWorkerChange(workerId || null);
    }
  };

  const currentYear = now.getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => currentYear - 5 + i);

  return (
    <form onSubmit={handleSubmit} className="bg-card border border-border rounded-lg p-4 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Empresa
          </label>
          <select
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
            disabled={loadingData}
          >
            <option value="">Seleccionar empresa</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Año
          </label>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Mes
          </label>
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>{getMonthName(m)}</option>
            ))}
          </select>
        </div>

        {showWorkerFilter && (
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Trabajador
            </label>
            <select
              value={workerId}
              onChange={(e) => setWorkerId(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="">Todos</option>
              {workers.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name || `${w.first_name} ${w.last_name}`} ({w.id_number})
                </option>
              ))}
            </select>
          </div>
        )}

        <div className={showWorkerFilter ? "lg:col-span-4" : ""}>
          <button
            type="submit"
            disabled={!companyId || loading}
            className="w-full md:w-auto px-6 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {loading ? "Cargando..." : "Generar Informe"}
          </button>
        </div>
      </div>
    </form>
  );
}
