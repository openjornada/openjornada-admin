"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import AppWrapper from "@/components/AppWrapper";
import { apiClient } from "@/lib/api-client";
import type { SmsMessage, Worker } from "@/lib/api-client";
import toast from "react-hot-toast";
import { AiOutlineMessage, AiOutlineDelete } from "react-icons/ai";
import SmsHistoryTable from "@/components/sms/SmsHistoryTable";
import { getCurrentMonthRange } from "@/lib/sms-utils";

const PAGE_SIZE = 25;

function SmsHistoryContent() {
  const searchParams = useSearchParams();

  const [messages, setMessages] = useState<SmsMessage[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filtering, setFiltering] = useState(false);
  const [workers, setWorkers] = useState<Worker[]>([]);

  const [startDate, setStartDate] = useState(() => getCurrentMonthRange().start);
  const [endDate, setEndDate] = useState(() => getCurrentMonthRange().end);
  const [selectedWorkerId, setSelectedWorkerId] = useState("");
  const [selectedStatus, setSelectedStatus] = useState(searchParams.get("status") ?? "");
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [clearConfirmed, setClearConfirmed] = useState(false);

  const clearModalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showClearModal) clearModalRef.current?.focus();
  }, [showClearModal]);

  useEffect(() => {
    loadWorkers();
    loadMessages(0, { status: searchParams.get("status") ?? "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadWorkers = async () => {
    try {
      const data = await apiClient.getWorkers();
      setWorkers(data);
    } catch (error) {
      console.error("Error loading workers:", error);
    }
  };

  const buildParams = (
    currentPage: number,
    overrides?: { startDate?: string; endDate?: string; workerId?: string; status?: string }
  ) => {
    const sd = overrides?.startDate ?? startDate;
    const ed = overrides?.endDate ?? endDate;
    const wid = overrides?.workerId ?? selectedWorkerId;
    const st = overrides?.status ?? selectedStatus;
    const params: Record<string, string | number> = {
      skip: currentPage * PAGE_SIZE,
      limit: PAGE_SIZE,
    };
    if (sd) params.start_date = sd;
    if (ed) params.end_date = ed;
    if (wid) params.worker_id = wid;
    if (st) params.status = st;
    return params;
  };

  const loadMessages = async (
    currentPage: number,
    overrides?: { startDate?: string; endDate?: string; workerId?: string; status?: string }
  ) => {
    if (currentPage === 0) setLoading(true);
    else setFiltering(true);

    try {
      const data = await apiClient.getSmsHistory(buildParams(currentPage, overrides));
      setMessages(data.messages);
      setTotal(data.total);
      setPage(currentPage);
    } catch (error) {
      console.error("Error loading SMS history:", error);
      toast.error("Error al cargar el historial de SMS");
    } finally {
      setLoading(false);
      setFiltering(false);
    }
  };

  const handleFilter = () => {
    loadMessages(0);
  };

  const handleClearFilters = () => {
    const range = getCurrentMonthRange();
    setStartDate(range.start);
    setEndDate(range.end);
    setSelectedWorkerId("");
    setSelectedStatus("");
    loadMessages(0, { startDate: range.start, endDate: range.end, workerId: "", status: "" });
  };

  const handleClearHistory = async () => {
    setClearing(true);
    try {
      const result = await apiClient.clearSmsHistory();
      toast.success(`Historial eliminado (${result.deleted} mensajes)`);
      setShowClearModal(false);
      setClearConfirmed(false);
      loadMessages(0);
    } catch (error) {
      console.error("Error clearing SMS history:", error);
      toast.error("Error al limpiar el historial de SMS");
    } finally {
      setClearing(false);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <AiOutlineMessage />
          Historial SMS
        </h1>
        <p className="text-muted-foreground">Registro de todos los mensajes SMS enviados</p>
      </div>

      {/* Clear history button */}
      {!loading && total > 0 && (
        <div className="mb-6">
          <button
            onClick={() => setShowClearModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-destructive text-destructive-foreground rounded-lg font-medium hover:opacity-90 transition-opacity text-sm"
          >
            <AiOutlineDelete />
            Limpiar historial
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-card border border-border rounded-lg p-4 mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[180px]">
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

          <div className="flex-1 min-w-[180px]">
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
            <label htmlFor="worker" className="block text-sm font-medium text-foreground mb-2">
              Trabajador
            </label>
            <select
              id="worker"
              value={selectedWorkerId}
              onChange={(e) => setSelectedWorkerId(e.target.value)}
              className="w-full px-4 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="">Todos los trabajadores</option>
              {workers.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.first_name} {w.last_name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-[160px]">
            <label htmlFor="status" className="block text-sm font-medium text-foreground mb-2">
              Estado
            </label>
            <select
              id="status"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-4 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="">Todos los estados</option>
              <option value="pending">Pendiente</option>
              <option value="sent">Enviado</option>
              <option value="delivered">Entregado</option>
              <option value="failed">Fallido</option>
            </select>
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
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <SmsHistoryTable messages={messages} loading={loading} compact={false} />
      </div>

      {/* Pagination & summary */}
      {!loading && total > 0 && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Mostrando {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, total)} de {total} mensajes
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => loadMessages(page - 1)}
              disabled={page === 0 || filtering}
              className="px-3 py-1 border border-border rounded-lg hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Anterior
            </button>
            <span className="px-3 py-1">
              Página {page + 1} de {totalPages}
            </span>
            <button
              onClick={() => loadMessages(page + 1)}
              disabled={page >= totalPages - 1 || filtering}
              className="px-3 py-1 border border-border rounded-lg hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {/* Clear history confirmation modal */}
      {showClearModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => { if (!clearing) { setShowClearModal(false); setClearConfirmed(false); } }}
        >
          <div
            className="bg-card border border-border rounded-lg p-6 w-full max-w-md"
            role="dialog"
            aria-modal="true"
            aria-labelledby="clear-modal-title"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => { if (e.key === "Escape" && !clearing) { setShowClearModal(false); setClearConfirmed(false); } }}
            tabIndex={-1}
            ref={clearModalRef}
          >
            <h3 id="clear-modal-title" className="text-lg font-semibold text-foreground mb-2">
              Limpiar historial SMS
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Se eliminarán <strong className="text-foreground">todos</strong> los mensajes del historial
              de SMS, independientemente de los filtros activos. Esta acción no se puede deshacer.
            </p>
            <label className="flex items-start gap-2 mb-6 cursor-pointer">
              <input
                type="checkbox"
                checked={clearConfirmed}
                onChange={(e) => setClearConfirmed(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-input"
                disabled={clearing}
              />
              <span className="text-sm text-foreground">
                Entiendo que esta acción eliminará todo el historial y no se puede deshacer.
              </span>
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setShowClearModal(false); setClearConfirmed(false); }}
                disabled={clearing}
                className="flex-1 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleClearHistory}
                disabled={clearing || !clearConfirmed}
                className="flex-1 px-4 py-2 bg-destructive text-destructive-foreground rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {clearing ? "Eliminando..." : "Eliminar todo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SmsHistoryPage() {
  return (
    <AppWrapper>
      <Suspense
        fallback={
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto mb-4"></div>
            <p className="text-muted-foreground">Cargando historial...</p>
          </div>
        }
      >
        <SmsHistoryContent />
      </Suspense>
    </AppWrapper>
  );
}
