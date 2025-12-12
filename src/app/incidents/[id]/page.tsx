"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import AppWrapper from "@/components/AppWrapper";
import Link from "next/link";
import { apiClient, Incident } from "@/lib/api-client";
import toast from "react-hot-toast";
import { AiOutlineArrowLeft, AiOutlineAlert } from "react-icons/ai";

const statusLabels = {
  pending: "Pendiente",
  in_review: "En revisión",
  resolved: "Resuelta"
};

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  in_review: "bg-blue-100 text-blue-800 border-blue-200",
  resolved: "bg-green-100 text-green-800 border-green-200"
};

export default function IncidentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const incidentId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [incident, setIncident] = useState<Incident | null>(null);
  const [formData, setFormData] = useState({
    status: "",
    admin_notes: "",
  });

  const loadIncident = async () => {
    try {
      const data = await apiClient.getIncident(incidentId);
      setIncident(data);
      setFormData({
        status: data.status,
        admin_notes: data.admin_notes || "",
      });
    } catch (error) {
      console.error("Error loading incident:", error);
      toast.error("Error al cargar la incidencia");
      router.push("/incidents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIncident();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incidentId]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setSaving(true);

    try {
      const updatedIncident = await apiClient.updateIncident(incidentId, {
        status: formData.status,
        admin_notes: formData.admin_notes,
      });

      setIncident(updatedIncident);
      toast.success("Incidencia actualizada correctamente");

      // Refresh incident data to get latest timestamps
      await loadIncident();
    } catch (error) {
      console.error("Error updating incident:", error);
      const message = (error as { response?: { data?: { detail?: string } } }).response?.data?.detail || "Error al actualizar la incidencia";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("es-ES", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  if (loading) {
    return (
      <AppWrapper>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
            <p className="text-muted-foreground">Cargando incidencia...</p>
          </div>
        </div>
      </AppWrapper>
    );
  }

  if (!incident) {
    return (
      <AppWrapper>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AiOutlineAlert className="text-6xl text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">No se encontró la incidencia</p>
            <Link href="/incidents" className="text-accent hover:underline">
              Volver a incidencias
            </Link>
          </div>
        </div>
      </AppWrapper>
    );
  }

  return (
    <AppWrapper>
      <div>
        {/* Header */}
        <div className="mb-6">
          <Link href="/incidents" className="inline-flex items-center gap-2 text-accent hover:underline mb-4">
            <AiOutlineArrowLeft />
            <span>Volver a incidencias</span>
          </Link>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <AiOutlineAlert />
            Detalle de Incidencia
          </h1>
          <p className="text-muted-foreground">Revisa y gestiona la incidencia reportada</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Incident Information Card */}
          <div className="lg:col-span-2 space-y-6">
            {/* Worker Info */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">Información del Trabajador</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Nombre completo
                  </label>
                  <p className="text-foreground font-medium">{incident.worker_name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    DNI/NIE
                  </label>
                  <p className="text-foreground font-medium">{incident.worker_id_number}</p>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Email
                  </label>
                  <p className="text-foreground font-medium">{incident.worker_email}</p>
                </div>
              </div>
            </div>

            {/* Incident Details */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">Detalles de la Incidencia</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Estado actual
                  </label>
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${
                      statusColors[incident.status]
                    }`}
                  >
                    {statusLabels[incident.status]}
                  </span>
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Descripción
                  </label>
                  <div className="bg-muted/30 rounded-lg p-4 text-foreground whitespace-pre-wrap">
                    {incident.description}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                      Fecha de creación
                    </label>
                    <p className="text-foreground">{formatDateTime(incident.created_at)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                      Última actualización
                    </label>
                    <p className="text-foreground">{formatDateTime(incident.updated_at)}</p>
                  </div>
                </div>

                {incident.resolved_at && (
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                      Fecha de resolución
                    </label>
                    <p className="text-foreground">{formatDateTime(incident.resolved_at)}</p>
                  </div>
                )}

                {incident.admin_notes && (
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                      Notas del administrador
                    </label>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-foreground whitespace-pre-wrap">
                      {incident.admin_notes}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Update Form */}
          <div className="lg:col-span-1">
            <div className="bg-card border border-border rounded-lg p-6 sticky top-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">Actualizar Incidencia</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-foreground mb-2">
                    Estado <span className="text-destructive">*</span>
                  </label>
                  <select
                    id="status"
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                    required
                  >
                    <option value="pending">Pendiente</option>
                    <option value="in_review">En revisión</option>
                    <option value="resolved">Resuelta</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="admin_notes" className="block text-sm font-medium text-foreground mb-2">
                    Notas del administrador
                  </label>
                  <textarea
                    id="admin_notes"
                    name="admin_notes"
                    value={formData.admin_notes}
                    onChange={handleChange}
                    rows={6}
                    className="w-full px-4 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                    placeholder="Añade notas internas sobre esta incidencia..."
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Estas notas son visibles solo para administradores
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full bg-accent text-accent-foreground py-2 px-4 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? "Guardando..." : "Guardar Cambios"}
                  </button>
                </div>
              </form>

              <div className="mt-4 pt-4 border-t border-border">
                <Link
                  href="/incidents"
                  className="block w-full bg-secondary text-secondary-foreground py-2 px-4 rounded-lg font-medium hover:opacity-90 transition-opacity text-center"
                >
                  Volver al listado
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppWrapper>
  );
}
