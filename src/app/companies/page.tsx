"use client";

import { useState, useEffect } from "react";
import AppWrapper from "@/components/AppWrapper";
import Link from "next/link";
import { apiClient, type Company } from "@/lib/api-client";
import toast from "react-hot-toast";
import { AiOutlinePlus, AiOutlineEdit, AiOutlineDelete, AiOutlineBank } from "react-icons/ai";

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    try {
      const data = await apiClient.getCompanies();
      setCompanies(data);
    } catch (error) {
      console.error("Error loading companies:", error);
      toast.error("Error al cargar las empresas");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Está seguro de eliminar la empresa "${name}"?\n\nNota: Esto no eliminará los trabajadores asociados.`)) {
      return;
    }

    setDeletingId(id);

    try {
      await apiClient.deleteCompany(id);
      toast.success("Empresa eliminada correctamente");
      loadCompanies();
    } catch (error) {
      console.error("Error deleting company:", error);
      const message = (error as { response?: { data?: { detail?: string } } }).response?.data?.detail || "Error al eliminar la empresa";
      toast.error(message);
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <AppWrapper>
      <div>
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <AiOutlineBank />
              Empresas
            </h1>
            <p className="text-muted-foreground">Gestiona las empresas del sistema</p>
          </div>
          <Link
            href="/companies/new"
            className="flex items-center gap-2 bg-accent text-accent-foreground px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
          >
            <AiOutlinePlus className="text-xl" />
            <span>Nueva Empresa</span>
          </Link>
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto mb-4"></div>
              <p className="text-muted-foreground">Cargando empresas...</p>
            </div>
          ) : companies.length === 0 ? (
            <div className="p-8 text-center">
              <AiOutlineBank className="text-6xl text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">No hay empresas registradas</p>
              <Link
                href="/companies/new"
                className="inline-flex items-center gap-2 text-accent hover:underline"
              >
                <AiOutlinePlus />
                <span>Crear primera empresa</span>
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
                      Fecha de Creación
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {companies.map((company) => (
                    <tr key={company.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                        {company.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {formatDate(company.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/companies/${company.id}/edit`}
                            className="text-accent hover:text-accent/80 p-2"
                            title="Editar"
                          >
                            <AiOutlineEdit className="text-xl" />
                          </Link>
                          <button
                            onClick={() => handleDelete(company.id, company.name)}
                            disabled={deletingId === company.id}
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
        {companies.length > 0 && (
          <div className="mt-4 text-sm text-muted-foreground">
            Total: {companies.length} empresa{companies.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>
    </AppWrapper>
  );
}
