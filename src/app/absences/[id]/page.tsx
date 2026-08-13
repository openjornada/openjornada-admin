"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import AppWrapper from "@/components/AppWrapper";
import Link from "next/link";
import { apiClient, Absence } from "@/lib/api-client";
import toast from "react-hot-toast";
import { AiOutlineArrowLeft, AiOutlineCalendar, AiOutlinePaperClip } from "react-icons/ai";
import { formatToLocalTime } from "@/utils/dateFormatters";

const statusLabels: Record<string, string> = {
  pending: "Pendiente",
  accepted: "Aceptada",
  rejected: "Rechazada",
  cancelled: "Cancelada",
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  accepted: "bg-green-100 text-green-800 border-green-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
  cancelled: "bg-gray-100 text-gray-800 border-gray-200",
};

const dayPortionLabels: Record<string, string> = {
  full: "Día completo",
  morning: "Mañana",
  afternoon: "Tarde",
};

export default function AbsenceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const absenceId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [absence, setAbsence] = useState<Absence | null>(null);
  const [formData, setFormData] = useState({
    status: "",
    admin_internal_notes: "",
    admin_public_comment: "",
  });

  const loadAbsence = async () => {
    try {
      const data = await apiClient.getAbsence(absenceId);
      setAbsence(data);
      setFormData({
        status: "rejected", // Por defecto rechazar; el admin cambia a aceptar si es válida
        admin_internal_notes: "",
        admin_public_comment: "",
      });
    } catch (error) {
      console.error("Error loading absence:", error);
      toast.error("Error al cargar la ausencia");
      router.push("/absences");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // TODO: migrar a hook de datos (fetch-on-mount)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAbsence();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [absenceId]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleDownloadAttachment = async () => {
    if (!absence?.attachment_id) return;
    setDownloading(true);
    try {
      await apiClient.downloadAbsenceAttachment(absence.attachment_id);
    } catch (error) {
      console.error("Error downloading attachment:", error);
      toast.error("Error al descargar el justificante");
    } finally {
      setDownloading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (absence?.status !== "pending") {
      toast.error("Esta solicitud ya ha sido procesada");
      return;
    }

    setSaving(true);

    try {
      const updated = await apiClient.updateAbsence(absenceId, {
        status: formData.status as "accepted" | "rejected",
        admin_internal_notes: formData.admin_internal_notes,
        admin_public_comment: formData.admin_public_comment,
      });

      setAbsence(updated);
      toast.success("Ausencia actualizada correctamente");

      setTimeout(() => {
        router.push("/absences");
      }, 1000);
    } catch (error) {
      console.error("Error updating absence:", error);
      const message = (error as { response?: { data?: { detail?: string } } }).response?.data?.detail || "Error al actualizar la ausencia";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const blockingErrors = absence?.validation_errors?.filter((e) => e.blocking) || [];
  const warnings = absence?.validation_errors?.filter((e) => !e.blocking) || [];
  const canApprove = absence?.status === "pending" && blockingErrors.length === 0;
  const isPending = absence?.status === "pending";

  if (loading) {
    return (
      <AppWrapper>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
            <p className="text-muted-foreground">Cargando ausencia...</p>
          </div>
        </div>
      </AppWrapper>
    );
  }

  if (!absence) {
    return (
      <AppWrapper>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AiOutlineCalendar className="text-6xl text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">No se encontró la ausencia</p>
            <Link href="/absences" className="text-accent hover:underline">
              Volver a ausencias
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
          <Link href="/absences" className="inline-flex items-center gap-2 text-accent hover:underline mb-4">
            <AiOutlineArrowLeft />
            <span>Volver a ausencias</span>
          </Link>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <AiOutlineCalendar />
            Detalle de Ausencia
          </h1>
          <p className="text-muted-foreground">Revisa y gestiona la solicitud de ausencia</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Worker Info */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">Información del Trabajador</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Nombre completo</label>
                  <p className="text-foreground font-medium">
                    {absence.worker_first_name} {absence.worker_last_name}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Email</label>
                  <p className="text-foreground font-medium">{absence.worker_email}</p>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Empresa</label>
                  <p className="text-foreground font-medium">{absence.company_name}</p>
                </div>
              </div>
            </div>

            {/* Request Details */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">Detalles de la Solicitud</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Estado actual</label>
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${statusColors[absence.status]}`}
                    >
                      {statusLabels[absence.status]}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Tipo de ausencia</label>
                    <p className="text-foreground font-medium">{absence.absence_type_name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Fechas</label>
                    <p className="text-foreground font-medium">
                      {absence.start_date} — {absence.end_date}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Días computados</label>
                    <p className="text-foreground font-medium">
                      {absence.days_computed} {absence.deducts_balance ? "(descuenta saldo)" : "(no descuenta saldo)"}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Jornada</label>
                    <p className="text-foreground font-medium">
                      {dayPortionLabels[absence.day_portion]}
                      {absence.start_time && absence.end_time ? ` (${absence.start_time} - ${absence.end_time})` : ""}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Solicitud creada</label>
                    <p className="text-foreground font-medium">{formatToLocalTime(absence.created_at)}</p>
                  </div>
                </div>

                {absence.worker_comment && (
                  <div className="border-t border-border pt-4">
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Comentario del trabajador</label>
                    <div className="bg-muted/30 rounded-lg p-4 text-foreground whitespace-pre-wrap">
                      {absence.worker_comment}
                    </div>
                  </div>
                )}

                {absence.attachment_id && (
                  <div className="border-t border-border pt-4">
                    <label className="block text-sm font-medium text-muted-foreground mb-2">Justificante</label>
                    <button
                      onClick={handleDownloadAttachment}
                      disabled={downloading}
                      className="inline-flex items-center gap-2 text-accent hover:underline font-medium disabled:opacity-50"
                    >
                      <AiOutlinePaperClip />
                      {downloading ? "Descargando..." : "Descargar justificante"}
                    </button>
                  </div>
                )}

                {isPending && blockingErrors.length > 0 && (
                  <div className="border-t border-border pt-4">
                    <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                      <span className="text-red-500">⚠️</span>
                      Errores de Validación
                    </h3>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <ul className="list-disc list-inside space-y-2">
                        {blockingErrors.map((issue, index) => (
                          <li key={index} className="text-red-800 text-sm">
                            {issue.message}
                          </li>
                        ))}
                      </ul>
                      <p className="text-red-700 text-sm mt-3 font-medium">
                        Esta solicitud NO puede ser aceptada debido a los errores de validación. Solo puedes rechazarla.
                      </p>
                    </div>
                  </div>
                )}

                {isPending && warnings.length > 0 && (
                  <div className="border-t border-border pt-4">
                    <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                      <span className="text-yellow-500">⚠️</span>
                      Avisos
                    </h3>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <ul className="list-disc list-inside space-y-2">
                        {warnings.map((issue, index) => (
                          <li key={index} className="text-yellow-800 text-sm">
                            {issue.message}
                          </li>
                        ))}
                      </ul>
                      <p className="text-yellow-700 text-sm mt-3">
                        Estos avisos no bloquean la aprobación, pero conviene revisarlos.
                      </p>
                    </div>
                  </div>
                )}

                {isPending && blockingErrors.length === 0 && warnings.length === 0 && (
                  <div className="border-t border-border pt-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <p className="text-green-800 text-sm font-medium">✓ La solicitud es válida y puede ser aprobada</p>
                    </div>
                  </div>
                )}

                {absence.reviewed_at && (
                  <>
                    <div className="border-t border-border pt-4">
                      <h3 className="text-lg font-semibold text-foreground mb-4">Revisión de Administrador</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-muted-foreground mb-1">Revisado por</label>
                          <p className="text-foreground font-medium">{absence.reviewed_by_admin_email}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-muted-foreground mb-1">Fecha de revisión</label>
                          <p className="text-foreground font-medium">{formatToLocalTime(absence.reviewed_at)}</p>
                        </div>
                      </div>
                    </div>

                    {absence.admin_public_comment && (
                      <div className="border-t border-border pt-4">
                        <label className="block text-sm font-medium text-muted-foreground mb-1">
                          Comentario del administrador (visible para el trabajador)
                        </label>
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-foreground whitespace-pre-wrap">
                          {absence.admin_public_comment}
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
                {isPending ? "Procesar Solicitud" : "Detalles de Revisión"}
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
                      className="w-full px-4 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                      required
                    >
                      {canApprove && <option value="accepted">Aceptar Ausencia</option>}
                      <option value="rejected">Rechazar Solicitud</option>
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
                    <p className="text-xs text-muted-foreground mt-1">Solo visible para administradores</p>
                  </div>

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
                      placeholder="Comentario opcional. Se enviará al trabajador por email..."
                    />
                    <p className="text-xs text-muted-foreground mt-1">Se enviará al trabajador por email</p>
                  </div>

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
                    <label className="block text-sm font-medium text-muted-foreground mb-2">Estado Final</label>
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${statusColors[absence.status]}`}
                    >
                      {statusLabels[absence.status]}
                    </span>
                  </div>

                  {absence.reviewed_at && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-2">Fecha de Revisión</label>
                        <p className="text-foreground text-sm">{formatToLocalTime(absence.reviewed_at)}</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-2">Revisado por</label>
                        <p className="text-foreground text-sm">{absence.reviewed_by_admin_email}</p>
                      </div>

                      {absence.admin_internal_notes && (
                        <div>
                          <label className="block text-sm font-medium text-muted-foreground mb-2">Notas internas</label>
                          <div className="bg-muted/30 rounded-lg p-3 text-foreground text-sm whitespace-pre-wrap">
                            {absence.admin_internal_notes}
                          </div>
                        </div>
                      )}

                      {absence.admin_public_comment && (
                        <div>
                          <label className="block text-sm font-medium text-muted-foreground mb-2">Comentario público</label>
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-foreground text-sm whitespace-pre-wrap">
                            {absence.admin_public_comment}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-border">
                <Link
                  href="/absences"
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
