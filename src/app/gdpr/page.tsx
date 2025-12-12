"use client";

import { useState, useEffect } from "react";
import AppWrapper from "@/components/AppWrapper";
import { apiClient } from "@/lib/api-client";
import type { Worker } from "@/lib/api-client";
import toast from "react-hot-toast";
import { AiOutlineDownload, AiOutlineDelete, AiOutlineSearch, AiOutlineSafety } from "react-icons/ai";

export default function GDPRPage() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [exporting, setExporting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");

  useEffect(() => {
    fetchWorkers();
  }, []);

  const fetchWorkers = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getWorkers();
      setWorkers(data);
    } catch (error) {
      console.error("Error fetching workers:", error);
      toast.error("Error al cargar los trabajadores");
    } finally {
      setLoading(false);
    }
  };

  const getWorkerFullName = (worker: Worker) =>
    `${worker.first_name} ${worker.last_name}`.trim();

  const filteredWorkers = workers.filter(
    (worker) =>
      getWorkerFullName(worker).toLowerCase().includes(searchTerm.toLowerCase()) ||
      worker.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExportData = async () => {
    if (!selectedWorker) return;

    setExporting(true);
    try {
      const data = await apiClient.exportWorkerGDPRData(selectedWorker.id);

      // Create and download JSON file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `gdpr_export_${getWorkerFullName(selectedWorker).replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Datos exportados correctamente");
    } catch (error) {
      console.error("Error exporting data:", error);
      toast.error("Error al exportar los datos");
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteData = async () => {
    if (!selectedWorker || !deleteReason.trim()) {
      toast.error("Debe indicar el motivo de la eliminación");
      return;
    }

    try {
      await apiClient.deleteWorkerGDPRData(selectedWorker.id, deleteReason);
      toast.success("Datos anonimizados correctamente");
      setShowDeleteConfirm(false);
      setDeleteReason("");
      setSelectedWorker(null);
      fetchWorkers();
    } catch (error) {
      console.error("Error deleting data:", error);
      const message = (error as { response?: { data?: { detail?: string } } }).response?.data?.detail ||
        "Error al eliminar los datos";
      toast.error(message);
    }
  };

  return (
    <AppWrapper>
      <div>
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <AiOutlineSafety className="text-3xl text-accent" />
            <h1 className="text-3xl font-bold text-foreground">Gestión RGPD</h1>
          </div>
          <p className="text-muted-foreground">
            Gestiona los derechos de protección de datos de los trabajadores (ARCO)
          </p>
        </div>

        {/* Info Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">Información importante</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• <strong>Derecho de acceso:</strong> Los trabajadores pueden solicitar una copia de sus datos.</li>
            <li>• <strong>Derecho de portabilidad:</strong> Exporta los datos en formato legible por máquina.</li>
            <li>• <strong>Derecho de supresión:</strong> Los registros de jornada deben conservarse 4 años (Art. 34.9 ET).</li>
            <li>• <strong>Anonimización:</strong> Se pueden anonimizar datos pasado el plazo legal de conservación.</li>
          </ul>
        </div>

        {/* Search */}
        <div className="bg-card border border-border rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Buscar trabajador</h2>
          <div className="relative">
            <AiOutlineSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por nombre o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          {/* Workers List */}
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto"></div>
            </div>
          ) : filteredWorkers.length > 0 ? (
            <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
              {filteredWorkers.map((worker) => (
                <button
                  key={worker.id}
                  onClick={() => setSelectedWorker(worker)}
                  className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                    selectedWorker?.id === worker.id
                      ? "border-accent bg-accent/10"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  <div className="font-medium">{getWorkerFullName(worker)}</div>
                  <div className="text-sm text-muted-foreground">{worker.email}</div>
                </button>
              ))}
            </div>
          ) : searchTerm ? (
            <p className="text-center text-muted-foreground py-8">
              No se encontraron trabajadores
            </p>
          ) : null}
        </div>

        {/* Actions */}
        {selectedWorker && (
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">
              Acciones para: <span className="text-accent">{getWorkerFullName(selectedWorker)}</span>
            </h2>

            <div className="grid gap-4 md:grid-cols-2">
              {/* Export Data */}
              <div className="border border-border rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <AiOutlineDownload className="text-2xl text-green-600" />
                  <div>
                    <h3 className="font-medium">Exportar datos</h3>
                    <p className="text-sm text-muted-foreground">Derecho de acceso y portabilidad</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Descarga todos los datos personales y registros de jornada del trabajador en formato JSON.
                </p>
                <button
                  onClick={handleExportData}
                  disabled={exporting}
                  className="w-full bg-green-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {exporting ? "Exportando..." : "Exportar datos (JSON)"}
                </button>
              </div>

              {/* Delete/Anonymize Data */}
              <div className="border border-border rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <AiOutlineDelete className="text-2xl text-red-600" />
                  <div>
                    <h3 className="font-medium">Anonimizar datos</h3>
                    <p className="text-sm text-muted-foreground">Derecho de supresión</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Anonimiza los datos personales. Los registros de jornada se conservan de forma anónima.
                </p>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full bg-red-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-red-700 transition-colors"
                >
                  Anonimizar datos
                </button>
              </div>
            </div>

            {/* Warning about retention */}
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Nota legal:</strong> Según el artículo 34.9 del Estatuto de los Trabajadores,
                los registros de jornada deben conservarse durante 4 años. La anonimización solo elimina
                los datos personales identificativos, pero mantiene los registros de forma anónima para
                cumplir con esta obligación legal.
              </p>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && selectedWorker && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold mb-4 text-destructive">
                Confirmar anonimización
              </h3>
              <p className="text-muted-foreground mb-4">
                ¿Estás seguro de que deseas anonimizar los datos de <strong>{getWorkerFullName(selectedWorker)}</strong>?
                Esta acción no se puede deshacer.
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Motivo de la anonimización <span className="text-destructive">*</span>
                </label>
                <textarea
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  placeholder="Ej: Solicitud del trabajador, fin de relación laboral..."
                  className="w-full px-4 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                  rows={3}
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteReason("");
                  }}
                  className="flex-1 py-2 px-4 border border-border rounded-lg hover:bg-muted transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteData}
                  disabled={!deleteReason.trim()}
                  className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppWrapper>
  );
}
