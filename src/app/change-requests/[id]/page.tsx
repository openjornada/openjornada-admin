"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import AppWrapper from "@/components/AppWrapper";
import Link from "next/link";
import { apiClient, ChangeRequest } from "@/lib/api-client";
import toast from "react-hot-toast";
import { AiOutlineArrowLeft, AiOutlineClockCircle } from "react-icons/ai";
import { formatToLocalTime } from "@/utils/dateFormatters";

const statusLabels = {
  pending: "Pendiente",
  accepted: "Aceptada",
  rejected: "Rechazada"
};

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  accepted: "bg-green-100 text-green-800 border-green-200",
  rejected: "bg-red-100 text-red-800 border-red-200"
};

const recordTypeLabels = {
  entry: "Entrada",
  exit: "Salida"
};

export default function ChangeRequestDetailPage() {
  const router = useRouter();
  const params = useParams();
  const changeRequestId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changeRequest, setChangeRequest] = useState<ChangeRequest | null>(null);
  const [formData, setFormData] = useState({
    status: "",
    admin_internal_notes: "",
    admin_public_comment: "",
  });

  const loadChangeRequest = async () => {
    try {
      const data = await apiClient.getChangeRequest(changeRequestId);
      setChangeRequest(data);
      setFormData({
        status: "rejected",  // Default to rejected, user can change to accepted if valid
        admin_internal_notes: "",
        admin_public_comment: "",
      });
    } catch (error) {
      console.error("Error loading change request:", error);
      toast.error("Error al cargar la petición de cambio");
      router.push("/change-requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChangeRequest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [changeRequestId]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (changeRequest?.status !== "pending") {
      toast.error("Esta petición ya ha sido procesada");
      return;
    }

    setSaving(true);

    try {
      const updatedRequest = await apiClient.updateChangeRequest(changeRequestId, {
        status: formData.status as "accepted" | "rejected",
        admin_internal_notes: formData.admin_internal_notes,
        admin_public_comment: formData.admin_public_comment,
      });

      setChangeRequest(updatedRequest);
      toast.success("Petición actualizada correctamente");

      // Redirect to change requests list after 1 second
      setTimeout(() => {
        router.push("/change-requests");
      }, 1000);
    } catch (error) {
      console.error("Error updating change request:", error);
      const message = (error as { response?: { data?: { detail?: string } } }).response?.data?.detail || "Error al actualizar la petición de cambio";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const canApprove = changeRequest?.status === "pending" && (!changeRequest.validation_errors || changeRequest.validation_errors.length === 0);
  const isPending = changeRequest?.status === "pending";

  if (loading) {
    return (
      <AppWrapper>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
            <p className="text-muted-foreground">Cargando petición de cambio...</p>
          </div>
        </div>
      </AppWrapper>
    );
  }

  if (!changeRequest) {
    return (
      <AppWrapper>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AiOutlineClockCircle className="text-6xl text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">No se encontró la petición de cambio</p>
            <Link href="/change-requests" className="text-accent hover:underline">
              Volver a peticiones de cambio
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
          <Link href="/change-requests" className="inline-flex items-center gap-2 text-accent hover:underline mb-4">
            <AiOutlineArrowLeft />
            <span>Volver a peticiones de cambio</span>
          </Link>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <AiOutlineClockCircle />
            Detalle de Petición de Cambio
          </h1>
          <p className="text-muted-foreground">Revisa y gestiona la petición de cambio de registro</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Request Information Card */}
          <div className="lg:col-span-2 space-y-6">
            {/* Worker Info */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">Información del Trabajador</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Nombre completo
                  </label>
                  <p className="text-foreground font-medium">{changeRequest.worker_name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    DNI/NIE
                  </label>
                  <p className="text-foreground font-medium">{changeRequest.worker_id_number}</p>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Email
                  </label>
                  <p className="text-foreground font-medium">{changeRequest.worker_email}</p>
                </div>
              </div>
            </div>

            {/* Request Details */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">Detalles de la Petición</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                      Estado actual
                    </label>
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${
                        statusColors[changeRequest.status]
                      }`}
                    >
                      {statusLabels[changeRequest.status]}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                      Empresa
                    </label>
                    <p className="text-foreground font-medium">{changeRequest.company_name}</p>
                  </div>
                </div>

                <div className="border-t border-border pt-4">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Registro Original</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">
                        Tipo de registro
                      </label>
                      <p className="text-foreground font-medium">{recordTypeLabels[changeRequest.original_type]}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">
                        Fecha y hora original
                      </label>
                      <p className="text-foreground font-medium">{formatToLocalTime(changeRequest.original_timestamp)}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">
                        Creado el
                      </label>
                      <p className="text-foreground font-medium">{formatToLocalTime(changeRequest.original_created_at)}</p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-border pt-4">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Cambio Solicitado</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">
                        Nueva fecha y hora
                      </label>
                      <p className="text-foreground font-medium">{formatToLocalTime(changeRequest.new_timestamp)}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">
                        Solicitud creada
                      </label>
                      <p className="text-foreground font-medium">{formatToLocalTime(changeRequest.created_at)}</p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-border pt-4">
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Motivo del cambio
                  </label>
                  <div className="bg-muted/30 rounded-lg p-4 text-foreground whitespace-pre-wrap">
                    {changeRequest.reason}
                  </div>
                </div>

                {isPending && changeRequest.validation_errors && changeRequest.validation_errors.length > 0 && (
                  <div className="border-t border-border pt-4">
                    <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                      <span className="text-red-500">⚠️</span>
                      Errores de Validación
                    </h3>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <ul className="list-disc list-inside space-y-2">
                        {changeRequest.validation_errors.map((error, index) => (
                          <li key={index} className="text-red-800 text-sm">
                            {error}
                          </li>
                        ))}
                      </ul>
                      <p className="text-red-700 text-sm mt-3 font-medium">
                        Esta petición NO puede ser aceptada debido a los errores de validación. Solo puedes rechazarla.
                      </p>
                    </div>
                  </div>
                )}

                {isPending && (!changeRequest.validation_errors || changeRequest.validation_errors.length === 0) && (
                  <div className="border-t border-border pt-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <p className="text-green-800 text-sm font-medium">
                        ✓ El cambio solicitado es válido y puede ser aprobado
                      </p>
                    </div>
                  </div>
                )}

                {changeRequest.reviewed_at && (
                  <>
                    <div className="border-t border-border pt-4">
                      <h3 className="text-lg font-semibold text-foreground mb-4">Revisión de Administrador</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-muted-foreground mb-1">
                            Revisado por
                          </label>
                          <p className="text-foreground font-medium">{changeRequest.reviewed_by_admin_email}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-muted-foreground mb-1">
                            Fecha de revisión
                          </label>
                          <p className="text-foreground font-medium">{formatToLocalTime(changeRequest.reviewed_at)}</p>
                        </div>
                      </div>
                    </div>

                    {changeRequest.admin_public_comment && (
                      <div className="border-t border-border pt-4">
                        <label className="block text-sm font-medium text-muted-foreground mb-1">
                          Comentario del administrador (visible para el trabajador)
                        </label>
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-foreground whitespace-pre-wrap">
                          {changeRequest.admin_public_comment}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Update Form */}
          <div className="lg:col-span-1">
            <div className="bg-card border border-border rounded-lg p-6 sticky top-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">
                {isPending ? "Procesar Petición" : "Detalles de Revisión"}
              </h2>

              {isPending ? (
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
                      disabled={!canApprove && formData.status === "accepted"}
                      className="w-full px-4 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50 disabled:cursor-not-allowed"
                      required
                    >
                      {canApprove && <option value="accepted">Aceptar Cambio</option>}
                      <option value="rejected">Rechazar Petición</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="admin_internal_notes" className="block text-sm font-medium text-foreground mb-2">
                      Notas internas
                    </label>
                    <textarea
                      id="admin_internal_notes"
                      name="admin_internal_notes"
                      value={formData.admin_internal_notes}
                      onChange={handleChange}
                      rows={4}
                      className="w-full px-4 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                      placeholder="Notas privadas solo para administradores..."
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Solo visible para administradores
                    </p>
                  </div>

                  {formData.status === "rejected" && (
                    <div>
                      <label htmlFor="admin_public_comment" className="block text-sm font-medium text-foreground mb-2">
                        Comentario para el trabajador
                      </label>
                      <textarea
                        id="admin_public_comment"
                        name="admin_public_comment"
                        value={formData.admin_public_comment}
                        onChange={handleChange}
                        rows={4}
                        className="w-full px-4 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                        placeholder="Explica por qué se rechaza (opcional). Se enviará al trabajador por email..."
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Se enviará al trabajador por email
                      </p>
                    </div>
                  )}

                  <div className="pt-2 space-y-2">
                    <button
                      type="submit"
                      disabled={saving || !formData.status}
                      className="w-full bg-accent text-accent-foreground py-2 px-4 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? "Guardando..." : "Guardar y Procesar"}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">
                      Estado Final
                    </label>
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${
                        statusColors[changeRequest.status]
                      }`}
                    >
                      {statusLabels[changeRequest.status]}
                    </span>
                  </div>

                  {changeRequest.reviewed_at && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-2">
                          Fecha de Revisión
                        </label>
                        <p className="text-foreground text-sm">{formatToLocalTime(changeRequest.reviewed_at)}</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-2">
                          Revisado por
                        </label>
                        <p className="text-foreground text-sm">{changeRequest.reviewed_by_admin_email}</p>
                      </div>
                    </>
                  )}
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-border">
                <Link
                  href="/change-requests"
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
