"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import AppWrapper from "@/components/AppWrapper";
import Link from "next/link";
import { apiClient, type Worker, type Company, type SmsMessage, type SmsCredits } from "@/lib/api-client";
import toast from "react-hot-toast";
import { AiOutlineArrowLeft, AiOutlineMessage } from "react-icons/ai";
import SmsHistoryTable from "@/components/sms/SmsHistoryTable";

export default function EditWorkerPage() {
  const router = useRouter();
  const params = useParams();
  const workerId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone_number: "",
    id_number: "",
    password: "", // Optional, only if changing password
  });

  // SMS state
  const [smsEnabled, setSmsEnabled] = useState(true);
  const [recentSmsMessages, setRecentSmsMessages] = useState<SmsMessage[]>([]);
  const [loadingSms, setLoadingSms] = useState(true);
  const [smsCredits, setSmsCredits] = useState<SmsCredits | null>(null);
  const [showSmsModal, setShowSmsModal] = useState(false);
  const [smsText, setSmsText] = useState("");
  const [sendingSms, setSendingSms] = useState(false);

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

  const loadWorker = async () => {
    try {
      const worker: Worker = await apiClient.getWorker(workerId);
      setFormData({
        first_name: worker.first_name,
        last_name: worker.last_name,
        email: worker.email,
        phone_number: worker.phone_number,
        id_number: worker.id_number,
        password: "",
      });
      setSelectedCompanies(worker.company_ids || []);
      setSmsEnabled(worker.sms_config?.sms_enabled ?? true);
    } catch (error) {
      console.error("Error loading worker:", error);
      toast.error("Error al cargar el trabajador");
      router.push("/workers");
    } finally {
      setLoading(false);
    }
  };

  const loadSmsHistory = async () => {
    setLoadingSms(true);
    try {
      const data = await apiClient.getSmsHistory({ worker_id: workerId, limit: 5 });
      setRecentSmsMessages(data.messages);
    } catch (error) {
      console.error("Error loading SMS history:", error);
      // Non-critical, don't show toast
    } finally {
      setLoadingSms(false);
    }
  };

  const loadSmsCredits = async () => {
    try {
      const data = await apiClient.getSmsCredits();
      setSmsCredits(data);
    } catch (error) {
      console.error("Error loading SMS credits:", error);
    }
  };

  const handleSendSms = async () => {
    if (!smsText.trim()) return;
    setSendingSms(true);
    try {
      const result = await apiClient.sendWorkerSms(workerId, { message: smsText.trim() });
      if (result.success) {
        toast.success("SMS enviado correctamente");
        setShowSmsModal(false);
        setSmsText("");
        loadSmsHistory();
      } else {
        toast.error(result.error_message || "Error al enviar el SMS");
      }
    } catch (error) {
      console.error("Error sending SMS:", error);
      const message = (error as { response?: { data?: { detail?: string } } }).response?.data?.detail || "Error al enviar el SMS";
      toast.error(message);
    } finally {
      setSendingSms(false);
    }
  };

  useEffect(() => {
    loadCompanies();
    loadWorker();
    loadSmsHistory();
    loadSmsCredits();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workerId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const toggleCompany = (companyId: string) => {
    setSelectedCompanies((prev) =>
      prev.includes(companyId)
        ? prev.filter((id) => id !== companyId)
        : [...prev, companyId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.first_name || !formData.last_name || !formData.email || !formData.id_number) {
      toast.error("Por favor complete todos los campos obligatorios");
      return;
    }

    if (selectedCompanies.length === 0) {
      toast.error("Debe seleccionar al menos una empresa");
      return;
    }

    setSaving(true);

    try {
      // Only send password if it was changed
      const updateData = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone_number: formData.phone_number,
        id_number: formData.id_number,
        company_ids: selectedCompanies,
        sms_enabled: smsEnabled,
        ...(formData.password && { password: formData.password }),
      };

      await apiClient.updateWorker(workerId, updateData);
      toast.success("Trabajador actualizado correctamente");
      router.push("/workers");
    } catch (error) {
      console.error("Error updating worker:", error);
      const message = (error as { response?: { data?: { detail?: string } } }).response?.data?.detail || "Error al actualizar el trabajador";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppWrapper>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
            <p className="text-muted-foreground">Cargando trabajador...</p>
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
          <Link href="/workers" className="inline-flex items-center gap-2 text-accent hover:underline mb-4">
            <AiOutlineArrowLeft />
            <span>Volver a trabajadores</span>
          </Link>
          <h1 className="text-3xl font-bold text-foreground">Editar Trabajador</h1>
          <p className="text-muted-foreground">Modifica la información del trabajador</p>
        </div>

        {/* Form */}
        <div className="bg-card border border-border rounded-lg p-6 max-w-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="first_name" className="block text-sm font-medium text-foreground mb-2">
                  Nombre <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  id="first_name"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                  required
                />
              </div>

              <div>
                <label htmlFor="last_name" className="block text-sm font-medium text-foreground mb-2">
                  Apellidos <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  id="last_name"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="id_number" className="block text-sm font-medium text-foreground mb-2">
                DNI/NIE <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                id="id_number"
                name="id_number"
                value={formData.id_number}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                required
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                Email <span className="text-destructive">*</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                required
              />
            </div>

            <div>
              <label htmlFor="phone_number" className="block text-sm font-medium text-foreground mb-2">
                Teléfono
              </label>
              <input
                type="tel"
                id="phone_number"
                name="phone_number"
                value={formData.phone_number}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Empresas <span className="text-destructive">*</span>
              </label>
              {loadingCompanies ? (
                <div className="text-sm text-muted-foreground">Cargando empresas...</div>
              ) : companies.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No hay empresas disponibles.{" "}
                  <Link href="/companies/new" className="text-accent hover:underline">
                    Crear una empresa primero
                  </Link>
                </div>
              ) : (
                <>
                  <div className="border border-input bg-background rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                    {companies.map((company) => (
                      <label
                        key={company.id}
                        className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-2 rounded transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedCompanies.includes(company.id)}
                          onChange={() => toggleCompany(company.id)}
                          className="w-4 h-4 text-accent border-input rounded focus:ring-2 focus:ring-accent"
                        />
                        <span className="text-sm text-foreground">{company.name}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Selecciona al menos una empresa. Seleccionadas: {selectedCompanies.length}
                  </p>
                </>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
                Nueva Contraseña (opcional)
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="Dejar vacío para mantener la actual"
                minLength={8}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Solo ingrese una contraseña si desea cambiarla
              </p>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-accent text-accent-foreground py-2 px-4 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Guardando..." : "Guardar Cambios"}
              </button>
              <Link
                href="/workers"
                className="flex-1 bg-secondary text-secondary-foreground py-2 px-4 rounded-lg font-medium hover:opacity-90 transition-opacity text-center"
              >
                Cancelar
              </Link>
            </div>
          </form>
        </div>

        {/* SMS Card */}
        <div className="bg-card border border-border rounded-lg p-6 max-w-2xl mt-6">
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <AiOutlineMessage className="text-accent" />
            Recordatorios SMS
          </h2>

          <div className="space-y-4">
            {/* Toggle */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="sms_enabled"
                checked={smsEnabled}
                onChange={(e) => setSmsEnabled(e.target.checked)}
                className="w-5 h-5 rounded border-input text-accent focus:ring-accent"
                disabled={saving}
              />
              <label htmlFor="sms_enabled" className="text-sm font-medium text-foreground">
                Activar recordatorios SMS para este trabajador
              </label>
            </div>

            <p className="text-xs text-muted-foreground">
              Se utilizará el número de teléfono del trabajador para enviar los SMS.
              Si no tiene teléfono, no se enviarán recordatorios.
            </p>

            {/* Send SMS button */}
            {smsCredits?.unlimited && formData.phone_number && (
              <button
                type="button"
                onClick={() => setShowSmsModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity text-sm"
              >
                <AiOutlineMessage />
                Enviar SMS
              </button>
            )}

            {/* Recent SMS mini-table */}
            <div className="border-t border-border pt-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Últimos mensajes SMS</h3>
              <div className="border border-border rounded-lg overflow-hidden">
                {loadingSms ? (
                  <div className="p-6 text-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent mx-auto mb-2"></div>
                    <p className="text-sm text-muted-foreground">Cargando...</p>
                  </div>
                ) : (
                  <SmsHistoryTable
                    messages={recentSmsMessages}
                    compact={true}
                    workerId={workerId}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SMS Send Modal */}
      {showSmsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Enviar SMS a {formData.first_name} {formData.last_name}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Teléfono destino
                </label>
                <p className="text-sm text-foreground">{formData.phone_number}</p>
              </div>

              <div>
                <label htmlFor="sms_text" className="block text-sm font-medium text-foreground mb-1">
                  Mensaje
                </label>
                <textarea
                  id="sms_text"
                  value={smsText}
                  onChange={(e) => setSmsText(e.target.value)}
                  maxLength={480}
                  rows={4}
                  className="w-full px-4 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                  placeholder="Escribe el mensaje SMS..."
                  disabled={sendingSms}
                />
                <p className="text-xs text-muted-foreground mt-1 text-right">
                  {smsText.length}/480
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => { setShowSmsModal(false); setSmsText(""); }}
                disabled={sendingSms}
                className="flex-1 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSendSms}
                disabled={!smsText.trim() || sendingSms}
                className="flex-1 px-4 py-2 bg-accent text-accent-foreground rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sendingSms ? "Enviando..." : "Enviar SMS"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppWrapper>
  );
}
