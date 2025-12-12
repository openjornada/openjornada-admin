"use client";

import { useState, useEffect } from "react";
import AppWrapper from "@/components/AppWrapper";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import toast from "react-hot-toast";
import { AiOutlinePlus, AiOutlineEdit, AiOutlineDelete } from "react-icons/ai";

interface Worker {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  id_number: string;
  created_at: string;
}

export default function WorkersPage() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadWorkers();
  }, []);

  const loadWorkers = async () => {
    try {
      const data = await apiClient.getWorkers();
      setWorkers(data);
    } catch (error) {
      console.error("Error loading workers:", error);
      toast.error("Error al cargar los trabajadores");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Está seguro de eliminar al trabajador ${name}?`)) {
      return;
    }

    setDeletingId(id);

    try {
      await apiClient.deleteWorker(id);
      toast.success("Trabajador eliminado correctamente");
      loadWorkers();
    } catch (error) {
      console.error("Error deleting worker:", error);
      toast.error("Error al eliminar el trabajador");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <AppWrapper>
      <div>
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Trabajadores</h1>
            <p className="text-muted-foreground">Gestiona los trabajadores del sistema</p>
          </div>
          <Link
            href="/workers/new"
            className="flex items-center gap-2 bg-accent text-accent-foreground px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
          >
            <AiOutlinePlus className="text-xl" />
            <span>Nuevo Trabajador</span>
          </Link>
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto mb-4"></div>
              <p className="text-muted-foreground">Cargando trabajadores...</p>
            </div>
          ) : workers.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-muted-foreground mb-4">No hay trabajadores registrados</p>
              <Link
                href="/workers/new"
                className="inline-flex items-center gap-2 text-accent hover:underline"
              >
                <AiOutlinePlus />
                <span>Crear primer trabajador</span>
              </Link>
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
                      Nombre
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Teléfono
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Fecha de Registro
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {workers.map((worker) => (
                    <tr key={worker.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                        {worker.id_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                        {worker.first_name} {worker.last_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {worker.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {worker.phone_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {new Date(worker.created_at).toLocaleDateString("es-ES")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/workers/${worker.id}/edit`}
                            className="text-accent hover:text-accent/80 p-2"
                            title="Editar"
                          >
                            <AiOutlineEdit className="text-xl" />
                          </Link>
                          <button
                            onClick={() => handleDelete(worker.id, `${worker.first_name} ${worker.last_name}`)}
                            disabled={deletingId === worker.id}
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
      </div>
    </AppWrapper>
  );
}
