"use client";

import { useState } from "react";
import AppWrapper from "@/components/AppWrapper";
import Link from "next/link";
import { apiClient, CompanyMonthlySummary } from "@/lib/api-client";
import ReportFilters from "@/components/reports/ReportFilters";
import StatCard from "@/components/reports/StatCard";
import { getMonthName } from "@/utils/dateFormatters";
import { formatToLocalTime } from "@/utils/dateFormatters";
import { AiOutlineArrowLeft, AiOutlineUser, AiOutlineCheck, AiOutlineClockCircle } from "react-icons/ai";
import toast from "react-hot-toast";

export default function SignaturesPage() {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<CompanyMonthlySummary | null>(null);

  const handleFilter = async (f: { company_id: string; year: number; month: number }) => {
    setLoading(true);
    setReport(null);
    try {
      const data = await apiClient.getCompanyMonthlyReport(f);
      setReport(data);
    } catch {
      toast.error("Error al cargar el estado de firmas");
    } finally {
      setLoading(false);
    }
  };

  const signedCount = report?.workers.filter((w) => w.signature_status === "signed").length || 0;
  const pendingCount = report?.workers.filter((w) => w.signature_status !== "signed").length || 0;

  return (
    <AppWrapper>
      <div>
        <div className="mb-6">
          <Link href="/reports" className="text-accent hover:underline text-sm flex items-center gap-1 mb-3">
            <AiOutlineArrowLeft /> Volver a Informes
          </Link>
          <h1 className="text-3xl font-bold text-foreground mb-2">Firmas Mensuales</h1>
          <p className="text-muted-foreground">Estado de las firmas mensuales de los trabajadores</p>
        </div>

        <ReportFilters onFilter={handleFilter} loading={loading} />

        {report && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">
                {report.company_name} — {getMonthName(report.month)} {report.year}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <StatCard
                title="Total Trabajadores"
                value={report.total_workers}
                icon={<AiOutlineUser className="text-xl text-accent" />}
              />
              <StatCard
                title="Firmados"
                value={signedCount}
                variant="success"
                icon={<AiOutlineCheck className="text-xl" />}
              />
              <StatCard
                title="Pendientes"
                value={pendingCount}
                variant={pendingCount > 0 ? "warning" : "default"}
                icon={<AiOutlineClockCircle className="text-xl" />}
              />
            </div>

            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Trabajador</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">DNI</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Estado</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Fecha de Firma</th>
                  </tr>
                </thead>
                <tbody>
                  {report.workers.map((w) => (
                    <tr key={w.worker_id} className="border-b border-border last:border-0 hover:bg-muted/10">
                      <td className="px-4 py-3 text-sm text-foreground font-medium">{w.worker_name}</td>
                      <td className="px-4 py-3 text-sm text-foreground">{w.worker_id_number}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-0.5 text-xs rounded-full ${
                          w.signature_status === "signed"
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                        }`}>
                          {w.signature_status === "signed" ? "Firmado" : "Pendiente"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground">
                        {w.signed_at ? formatToLocalTime(w.signed_at) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {report.workers.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No hay trabajadores con registros en este periodo</p>
              )}
            </div>
          </>
        )}

        {!report && !loading && (
          <div className="text-center py-12 text-muted-foreground">
            Selecciona los filtros y pulsa &quot;Generar Informe&quot; para ver el estado de firmas
          </div>
        )}

        {loading && (
          <div className="text-center py-12 text-muted-foreground">
            Cargando estado de firmas...
          </div>
        )}
      </div>
    </AppWrapper>
  );
}
