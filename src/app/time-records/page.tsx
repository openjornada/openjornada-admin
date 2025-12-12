"use client";

import { useState, useEffect } from "react";
import AppWrapper from "@/components/AppWrapper";
import { apiClient, type TimeRecord, type Company } from "@/lib/api-client";
import toast from "react-hot-toast";
import { AiOutlineClockCircle, AiOutlineDownload } from "react-icons/ai";
import * as XLSX from "xlsx";
import { formatToLocalTime } from "@/utils/dateFormatters";

// Helper function to get current month date range
const getCurrentMonthRange = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0'); // +1 porque getMonth() es 0-indexed
  const day = String(now.getDate()).padStart(2, '0');

  return {
    start: `${year}-${month}-01`,
    end: `${year}-${month}-${day}`
  };
};

export default function TimeRecordsPage() {
  const [records, setRecords] = useState<TimeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");

  // Initialize with current month range
  const monthRange = getCurrentMonthRange();
  const [startDate, setStartDate] = useState(monthRange.start);
  const [endDate, setEndDate] = useState(monthRange.end);
  const [filtering, setFiltering] = useState(false);

  useEffect(() => {
    // Load records with default month range on initial mount only
    loadRecords({ start_date: monthRange.start, end_date: monthRange.end });
    loadCompanies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadCompanies = async () => {
    try {
      const data = await apiClient.getCompanies();
      setCompanies(data);
    } catch (error) {
      console.error("Error loading companies:", error);
      toast.error("Error al cargar las empresas");
    } finally {
      setLoadingCompanies(false);
    }
  };

  const loadRecords = async (filters?: { start_date?: string; end_date?: string; company_id?: string; worker_name?: string }) => {
    setFiltering(true);
    try {
      const data = await apiClient.getTimeRecords(filters);
      setRecords(data);
    } catch (error) {
      console.error("Error loading time records:", error);
      toast.error("Error al cargar los registros");
    } finally {
      setLoading(false);
      setFiltering(false);
    }
  };

  const handleFilter = () => {
    const filters: { start_date?: string; end_date?: string; company_id?: string; worker_name?: string } = {};
    if (startDate) filters.start_date = startDate;
    if (endDate) filters.end_date = endDate;
    if (selectedCompanyId) filters.company_id = selectedCompanyId;
    if (searchTerm) filters.worker_name = searchTerm;
    loadRecords(filters);
  };

  const handleClearFilters = () => {
    const monthRange = getCurrentMonthRange();
    setStartDate(monthRange.start);
    setEndDate(monthRange.end);
    setSearchTerm("");
    setSelectedCompanyId("");
    loadRecords({ start_date: monthRange.start, end_date: monthRange.end });
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return "-";
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  // Records are now filtered on the backend
  const filteredRecords = records;

  const getRecordTypeLabel = (type: string) => {
    switch (type) {
      case "entry":
        return "Entrada";
      case "exit":
        return "Salida";
      case "pause_start":
        return "Inicio Pausa";
      case "pause_end":
        return "Fin Pausa";
      default:
        return type;
    }
  };

  // Export to Excel function
  const handleExportToExcel = () => {
    if (filteredRecords.length === 0) {
      toast.error("No hay registros para exportar");
      return;
    }

    try {
      // Prepare data for Excel
      const dataToExport = filteredRecords.map((record) => ({
        DNI: record.worker_id_number,
        Trabajador: record.worker_name,
        Empresa: record.company_name || "N/A",
        Tipo: getRecordTypeLabel(record.record_type),
        "Tipo de Pausa": record.pause_type_name || "-",
        "Pausa Cuenta como Trabajo": record.pause_counts_as_work !== undefined
          ? (record.pause_counts_as_work ? "Sí" : "No")
          : "-",
        "Fecha y Hora": formatToLocalTime(record.timestamp),
        "Duración": formatDuration(record.duration_minutes),
      }));

      // Create workbook and worksheet
      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Registros de Jornada");

      // Generate filename with current date
      const today = new Date().toISOString().split("T")[0];
      const filename = `registros_jornada_${today}.xlsx`;

      // Download file
      XLSX.writeFile(workbook, filename);

      toast.success(`Exportados ${filteredRecords.length} registros a Excel`);
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      toast.error("Error al exportar a Excel");
    }
  };

  return (
    <AppWrapper>
      <div>
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <AiOutlineClockCircle />
            Registros de Jornada
          </h1>
          <p className="text-muted-foreground">Visualiza todos los registros de entrada y salida</p>
        </div>

        {/* Filters */}
        <div className="bg-card border border-border rounded-lg p-4 mb-6">
          <div className="space-y-4">
            {/* Search by worker name */}
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-foreground mb-2">
                Buscar por trabajador
              </label>
              <input
                type="text"
                id="search"
                placeholder="Buscar por nombre o apellidos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            {/* Date and company filters */}
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex-1 min-w-[200px]">
                <label htmlFor="start_date" className="block text-sm font-medium text-foreground mb-2">
                  Fecha de inicio
                </label>
                <input
                  type="date"
                  id="start_date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              <div className="flex-1 min-w-[200px]">
                <label htmlFor="end_date" className="block text-sm font-medium text-foreground mb-2">
                  Fecha de fin
                </label>
                <input
                  type="date"
                  id="end_date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              <div className="flex-1 min-w-[200px]">
                <label htmlFor="company" className="block text-sm font-medium text-foreground mb-2">
                  Empresa
                </label>
                {loadingCompanies ? (
                  <div className="w-full px-4 py-2 border border-input bg-background rounded-lg text-sm text-muted-foreground">
                    Cargando...
                  </div>
                ) : (
                  <select
                    id="company"
                    value={selectedCompanyId}
                    onChange={(e) => setSelectedCompanyId(e.target.value)}
                    className="w-full px-4 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    <option value="">Todas las empresas</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <button
                onClick={handleFilter}
                disabled={filtering}
                className="bg-accent text-accent-foreground px-6 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {filtering ? "Filtrando..." : "Filtrar"}
              </button>

              <button
                onClick={handleClearFilters}
                className="bg-secondary text-secondary-foreground px-6 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity"
              >
                Limpiar
              </button>
            </div>

            {/* Export button */}
            <div className="flex justify-end pt-2 border-t border-border">
              <button
                onClick={handleExportToExcel}
                disabled={loading || filteredRecords.length === 0}
                className="bg-green-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <AiOutlineDownload className="text-lg" />
                Exportar a Excel ({filteredRecords.length} registros)
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto mb-4"></div>
              <p className="text-muted-foreground">Cargando registros...</p>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="p-8 text-center">
              <AiOutlineClockCircle className="text-6xl text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {(searchTerm || selectedCompanyId) ? "No se encontraron registros que coincidan con los filtros aplicados" : "No hay registros para mostrar"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      DNI
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Trabajador
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Empresa
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Detalle
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Fecha y Hora
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Duración
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {filteredRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                        {record.worker_id_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                        {record.worker_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {record.company_name || "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            record.record_type === "entry"
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                              : record.record_type === "exit"
                              ? "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                              : record.record_type === "pause_start"
                              ? "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
                              : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                          }`}
                        >
                          {getRecordTypeLabel(record.record_type)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {record.pause_type_name ? (
                          <div>
                            <div className="font-medium text-foreground">{record.pause_type_name}</div>
                            <div className="text-xs">
                              {record.pause_counts_as_work ? (
                                <span className="text-green-600 dark:text-green-400">⏱️ Cuenta como trabajo</span>
                              ) : (
                                <span className="text-orange-600 dark:text-orange-400">⏸️ Fuera de jornada</span>
                              )}
                            </div>
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                        {formatToLocalTime(record.timestamp)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {formatDuration(record.duration_minutes)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Summary */}
        {filteredRecords.length > 0 && (
          <div className="mt-4 text-sm text-muted-foreground">
            Mostrando {filteredRecords.length} registro{filteredRecords.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>
    </AppWrapper>
  );
}
