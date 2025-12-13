"use client";

import { useState, useEffect } from "react";
import AppWrapper from "@/components/AppWrapper";
import { apiClient } from "@/lib/api-client";
import type { Backup, BackupListResponse } from "@/lib/api-client";
import toast from "react-hot-toast";
import {
  AiOutlineCloudDownload,
  AiOutlineDelete,
  AiOutlineReload,
  AiOutlineCloudServer,
  AiOutlinePlus,
  AiOutlineSchedule,
  AiOutlineWarning
} from "react-icons/ai";

export default function BackupsPage() {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [totalSize, setTotalSize] = useState("0 B");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [scheduleStatus, setScheduleStatus] = useState<{ scheduled: boolean; next_run: string | null } | null>(null);

  // Modal states
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<Backup | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchBackups();
    fetchScheduleStatus();
  }, []);

  const fetchBackups = async () => {
    try {
      setLoading(true);
      const data: BackupListResponse = await apiClient.getBackups();
      setBackups(data.backups);
      setTotalSize(data.total_size_human);
    } catch (error) {
      console.error("Error fetching backups:", error);
      toast.error("Error al cargar los backups");
    } finally {
      setLoading(false);
    }
  };

  const fetchScheduleStatus = async () => {
    try {
      const status = await apiClient.getBackupScheduleStatus();
      setScheduleStatus(status);
    } catch (error) {
      console.error("Error fetching schedule status:", error);
    }
  };

  const handleCreateBackup = async () => {
    setCreating(true);
    try {
      const backup = await apiClient.triggerBackup();
      toast.success("Backup iniciado correctamente");
      // Refresh list after a short delay
      setTimeout(() => {
        fetchBackups();
      }, 2000);
    } catch (error) {
      console.error("Error creating backup:", error);
      const message = (error as { response?: { data?: { detail?: string } } }).response?.data?.detail ||
        "Error al crear el backup";
      toast.error(message);
    } finally {
      setCreating(false);
    }
  };

  const handleDownload = async (backup: Backup) => {
    try {
      const result = await apiClient.getBackupDownloadUrl(backup.id);

      if (result.storage_type === "local" || result.storage_type === "sftp") {
        // For local and SFTP storage, use authenticated blob download
        // because the download endpoint requires JWT authentication
        await apiClient.downloadBackup(backup.id, backup.filename);
      } else {
        // For S3, use the pre-signed URL (no auth needed)
        window.open(result.download_url, "_blank");
      }
      toast.success("Descarga iniciada");
    } catch (error) {
      console.error("Error downloading backup:", error);
      const message = (error as { response?: { data?: { detail?: string } } }).response?.data?.detail ||
        "Error al descargar el backup";
      toast.error(message);
    }
  };

  const handleRestore = async () => {
    if (!selectedBackup) return;

    setRestoring(true);
    try {
      const result = await apiClient.restoreBackup(selectedBackup.id);
      toast.success(result.message);
      if (result.pre_restore_backup_id) {
        toast.success(`Backup de seguridad creado: ${result.pre_restore_backup_id}`, { duration: 5000 });
      }
      setShowRestoreConfirm(false);
      setSelectedBackup(null);
      fetchBackups();
    } catch (error) {
      console.error("Error restoring backup:", error);
      const message = (error as { response?: { data?: { detail?: string } } }).response?.data?.detail ||
        "Error al restaurar el backup";
      toast.error(message);
    } finally {
      setRestoring(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedBackup) return;

    setDeleting(true);
    try {
      await apiClient.deleteBackup(selectedBackup.id);
      toast.success("Backup eliminado correctamente");
      setShowDeleteConfirm(false);
      setSelectedBackup(null);
      fetchBackups();
    } catch (error) {
      console.error("Error deleting backup:", error);
      const message = (error as { response?: { data?: { detail?: string } } }).response?.data?.detail ||
        "Error al eliminar el backup";
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">Completado</span>;
      case "in_progress":
        return <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">En progreso</span>;
      case "failed":
        return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">Fallido</span>;
      default:
        return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  const getTriggerBadge = (trigger: string) => {
    switch (trigger) {
      case "scheduled":
        return <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800">Programado</span>;
      case "manual":
        return <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">Manual</span>;
      case "pre_restore":
        return <span className="px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-800">Pre-Restore</span>;
      default:
        return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">{trigger}</span>;
    }
  };

  const getStorageTypeBadge = (storageType: string) => {
    switch (storageType) {
      case "s3":
        return <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">S3</span>;
      case "sftp":
        return <span className="px-2 py-1 text-xs rounded-full bg-indigo-100 text-indigo-800">SFTP</span>;
      case "local":
        return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">Local</span>;
      default:
        return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">{storageType}</span>;
    }
  };

  return (
    <AppWrapper>
      <div>
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <AiOutlineCloudServer className="text-3xl text-accent" />
              <h1 className="text-3xl font-bold text-foreground">Backups</h1>
            </div>
            <button
              onClick={handleCreateBackup}
              disabled={creating}
              className="flex items-center gap-2 bg-accent text-accent-foreground px-4 py-2 rounded-lg font-medium hover:bg-accent/90 transition-colors disabled:opacity-50"
            >
              <AiOutlinePlus className="text-lg" />
              {creating ? "Creando..." : "Crear backup"}
            </button>
          </div>
          <p className="text-muted-foreground">
            Gestiona las copias de seguridad de la base de datos
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-sm text-muted-foreground mb-1">Total de backups</div>
            <div className="text-2xl font-bold">{backups.length}</div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-sm text-muted-foreground mb-1">Espacio total</div>
            <div className="text-2xl font-bold">{totalSize}</div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <AiOutlineSchedule />
              Próximo backup
            </div>
            <div className="text-lg font-semibold">
              {scheduleStatus?.scheduled && scheduleStatus.next_run
                ? formatDate(scheduleStatus.next_run)
                : <span className="text-muted-foreground">No programado</span>
              }
            </div>
          </div>
        </div>

        {/* Backups Table */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Cargando backups...</p>
            </div>
          ) : backups.length === 0 ? (
            <div className="text-center py-12">
              <AiOutlineCloudServer className="text-4xl text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No hay backups disponibles</p>
              <p className="text-sm text-muted-foreground mt-2">
                Crea tu primer backup o configura backups automáticos en Configuración
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Fecha</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Archivo</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Tamaño</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Storage</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Estado</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Tipo</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {backups.map((backup) => (
                    <tr key={backup.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 text-sm">
                        {formatDate(backup.created_at)}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-xs">
                        {backup.filename}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {backup.size_human}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {getStorageTypeBadge(backup.storage_type)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {getStatusBadge(backup.status)}
                        {backup.error_message && (
                          <div className="text-xs text-red-600 mt-1">{backup.error_message}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {getTriggerBadge(backup.trigger)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        <div className="flex items-center justify-end gap-2">
                          {backup.status === "completed" && (
                            <>
                              <button
                                onClick={() => handleDownload(backup)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Descargar"
                              >
                                <AiOutlineCloudDownload className="text-lg" />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedBackup(backup);
                                  setShowRestoreConfirm(true);
                                }}
                                className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                                title="Restaurar"
                              >
                                <AiOutlineReload className="text-lg" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => {
                              setSelectedBackup(backup);
                              setShowDeleteConfirm(true);
                            }}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Eliminar"
                          >
                            <AiOutlineDelete className="text-lg" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Info Card */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">Información sobre backups</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Los backups incluyen todas las colecciones de la base de datos MongoDB.</li>
            <li>• Antes de cada restauración se crea automáticamente un backup de seguridad.</li>
            <li>• Configura los backups automáticos en la sección de <a href="/settings" className="underline">Configuración</a>.</li>
            <li>• Los backups antiguos se eliminan automáticamente según la retención configurada.</li>
          </ul>
        </div>

        {/* Restore Confirmation Modal */}
        {showRestoreConfirm && selectedBackup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full">
              <div className="flex items-center gap-3 text-orange-600 mb-4">
                <AiOutlineWarning className="text-2xl" />
                <h3 className="text-lg font-semibold">Confirmar restauración</h3>
              </div>
              <div className="space-y-4 mb-6">
                <p className="text-muted-foreground">
                  ¿Estás seguro de que deseas restaurar la base de datos desde este backup?
                </p>
                <div className="bg-muted/50 p-3 rounded-lg">
                  <div className="text-sm">
                    <strong>Archivo:</strong> {selectedBackup.filename}
                  </div>
                  <div className="text-sm">
                    <strong>Fecha:</strong> {formatDate(selectedBackup.created_at)}
                  </div>
                  <div className="text-sm">
                    <strong>Tamaño:</strong> {selectedBackup.size_human}
                  </div>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Advertencia:</strong> Esta operación reemplazará TODOS los datos actuales de la base de datos.
                    Se creará automáticamente un backup de seguridad antes de la restauración.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowRestoreConfirm(false);
                    setSelectedBackup(null);
                  }}
                  className="flex-1 py-2 px-4 border border-border rounded-lg hover:bg-muted transition-colors"
                  disabled={restoring}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleRestore}
                  disabled={restoring}
                  className="flex-1 bg-orange-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-orange-700 transition-colors disabled:opacity-50"
                >
                  {restoring ? "Restaurando..." : "Restaurar"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && selectedBackup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold mb-4 text-destructive">
                Confirmar eliminación
              </h3>
              <p className="text-muted-foreground mb-4">
                ¿Estás seguro de que deseas eliminar este backup? Esta acción no se puede deshacer.
              </p>
              <div className="bg-muted/50 p-3 rounded-lg mb-4">
                <div className="text-sm">
                  <strong>Archivo:</strong> {selectedBackup.filename}
                </div>
                <div className="text-sm">
                  <strong>Fecha:</strong> {formatDate(selectedBackup.created_at)}
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setSelectedBackup(null);
                  }}
                  className="flex-1 py-2 px-4 border border-border rounded-lg hover:bg-muted transition-colors"
                  disabled={deleting}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {deleting ? "Eliminando..." : "Eliminar"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppWrapper>
  );
}
