"use client";

import { useState, useEffect } from "react";
import AppWrapper from "@/components/AppWrapper";
import Link from "next/link";
import { apiClient, type PauseType } from "@/lib/api-client";
import toast from "react-hot-toast";
import { AiOutlinePlus, AiOutlineEdit, AiOutlineDelete, AiOutlinePauseCircle } from "react-icons/ai";

export default function PauseTypesPage() {
  const [pauseTypes, setPauseTypes] = useState<PauseType[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadPauseTypes();
  }, []);

  const loadPauseTypes = async () => {
    try {
      const data = await apiClient.getPauseTypes();
      setPauseTypes(data);
    } catch (error) {
      console.error("Error loading pause types:", error);
      toast.error("Error al cargar los tipos de pausa");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string, usageCount: number) => {
    if (usageCount > 0) {
      if (!confirm(
        `¿Está seguro de eliminar el tipo de pausa "${name}"?\n\n` +
        `Este tipo ha sido usado en ${usageCount} registro(s). ` +
        `Los registros existentes no se eliminarán, pero este tipo ya no estará disponible para nuevas pausas.`
      )) {
        return;
      }
    } else {
      if (!confirm(`¿Está seguro de eliminar el tipo de pausa "${name}"?`)) {
        return;
      }
    }

    setDeletingId(id);

    try {
      await apiClient.deletePauseType(id);
      toast.success("Tipo de pausa eliminado correctamente");
      loadPauseTypes();
    } catch (error) {
      console.error("Error deleting pause type:", error);
      const message = (error as { response?: { data?: { detail?: string } } }).response?.data?.detail || "Error al eliminar el tipo de pausa";
      toast.error(message);
    } finally {
      setDeletingId(null);
    }
  };

  const getTypeLabel = (type: string) => {
    return type === "inside_shift" ? "Dentro de jornada" : "Fuera de jornada";
  };

  const getTypeBadgeClass = (type: string) => {
    return type === "inside_shift"
      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      : "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
  };

  return (
    <AppWrapper>
      <div>
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <AiOutlinePauseCircle />
              Tipos de Pausa
            </h1>
            <p className="text-muted-foreground">Gestiona los tipos de pausa disponibles para los trabajadores</p>
          </div>
          <Link
            href="/pause-types/new"
            className="flex items-center gap-2 bg-accent text-accent-foreground px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
          >
            <AiOutlinePlus className="text-xl" />
            <span>Nuevo Tipo de Pausa</span>
          </Link>
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto mb-4"></div>
              <p className="text-muted-foreground">Cargando tipos de pausa...</p>
            </div>
          ) : pauseTypes.length === 0 ? (
            <div className="p-8 text-center">
              <AiOutlinePauseCircle className="text-6xl text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">No hay tipos de pausa registrados</p>
              <Link
                href="/pause-types/new"
                className="inline-flex items-center gap-2 text-accent hover:underline"
              >
                <AiOutlinePlus />
                <span>Crear primer tipo de pausa</span>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Nombre
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Empresas
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Uso
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {pauseTypes.map((pauseType) => (
                    <tr key={pauseType.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-4 text-sm">
                        <div>
                          <div className="font-medium text-foreground">{pauseType.name}</div>
                          {pauseType.description && (
                            <div className="text-muted-foreground text-xs mt-1">{pauseType.description}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeBadgeClass(pauseType.type)}`}>
                          {getTypeLabel(pauseType.type)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        <div className="max-w-xs truncate" title={pauseType.company_names.join(", ")}>
                          {pauseType.company_names.join(", ")}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {pauseType.usage_count} registro{pauseType.usage_count !== 1 ? "s" : ""}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/pause-types/${pauseType.id}/edit`}
                            className="text-accent hover:text-accent/80 p-2"
                            title="Editar"
                          >
                            <AiOutlineEdit className="text-xl" />
                          </Link>
                          <button
                            onClick={() => handleDelete(pauseType.id, pauseType.name, pauseType.usage_count)}
                            disabled={deletingId === pauseType.id}
                            className="text-destructive hover:text-destructive/80 p-2 disabled:opacity-50"
                            title="Eliminar"
                          >
                            <AiOutlineDelete className="text-xl" />
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

        {/* Summary */}
        {pauseTypes.length > 0 && (
          <div className="mt-4 text-sm text-muted-foreground">
            Total: {pauseTypes.length} tipo{pauseTypes.length !== 1 ? "s" : ""} de pausa
          </div>
        )}
      </div>
    </AppWrapper>
  );
}
