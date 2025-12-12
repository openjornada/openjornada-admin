"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AppWrapper from "@/components/AppWrapper";
import Link from "next/link";
import { apiClient, type Company } from "@/lib/api-client";
import toast from "react-hot-toast";
import { AiOutlineArrowLeft, AiOutlinePauseCircle } from "react-icons/ai";

export default function NewPauseTypePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [companies, setCompanies] = useState<Company[]>([]);

  const [name, setName] = useState("");
  const [type, setType] = useState<"inside_shift" | "outside_shift">("inside_shift");
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([]);
  const [description, setDescription] = useState("");

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
      setLoadingCompanies(false);
    }
  };

  const handleCompanyToggle = (companyId: string) => {
    setSelectedCompanyIds((prev) =>
      prev.includes(companyId)
        ? prev.filter((id) => id !== companyId)
        : [...prev, companyId]
    );
  };

  const handleSelectAll = () => {
    if (selectedCompanyIds.length === companies.length) {
      setSelectedCompanyIds([]);
    } else {
      setSelectedCompanyIds(companies.map((c) => c.id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!name.trim()) {
      toast.error("El nombre del tipo de pausa es obligatorio");
      return;
    }

    if (name.trim().length < 2) {
      toast.error("El nombre debe tener al menos 2 caracteres");
      return;
    }

    if (selectedCompanyIds.length === 0) {
      toast.error("Debe seleccionar al menos una empresa");
      return;
    }

    setLoading(true);

    try {
      await apiClient.createPauseType({
        name: name.trim(),
        type,
        company_ids: selectedCompanyIds,
        description: description.trim() || undefined,
      });
      toast.success("Tipo de pausa creado correctamente");
      router.push("/pause-types");
    } catch (error) {
      console.error("Error creating pause type:", error);
      const message = (error as { response?: { data?: { detail?: string } } }).response?.data?.detail || "Error al crear el tipo de pausa";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppWrapper>
      <div>
        {/* Header */}
        <div className="mb-6">
          <Link href="/pause-types" className="inline-flex items-center gap-2 text-accent hover:underline mb-4">
            <AiOutlineArrowLeft />
            <span>Volver a tipos de pausa</span>
          </Link>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <AiOutlinePauseCircle />
            Nuevo Tipo de Pausa
          </h1>
          <p className="text-muted-foreground">Crea un nuevo tipo de pausa para los trabajadores</p>
        </div>

        {/* Form */}
        <div className="bg-card border border-border rounded-lg p-6 max-w-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
                Nombre <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="Ej: Almuerzo, Café, Reunión"
                required
                minLength={2}
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Nombre identificativo del tipo de pausa (2-100 caracteres)
              </p>
            </div>

            {/* Type */}
            <div>
              <label htmlFor="type" className="block text-sm font-medium text-foreground mb-2">
                Tipo <span className="text-destructive">*</span>
              </label>
              <select
                id="type"
                name="type"
                value={type}
                onChange={(e) => setType(e.target.value as "inside_shift" | "outside_shift")}
                className="w-full px-4 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                required
              >
                <option value="inside_shift">Dentro de jornada (cuenta como tiempo trabajado)</option>
                <option value="outside_shift">Fuera de jornada (no cuenta como tiempo trabajado)</option>
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                {type === "inside_shift"
                  ? "⏱️ Las pausas dentro de jornada cuentan como tiempo trabajado (ej: reuniones, pausas legales)"
                  : "⏸️ Las pausas fuera de jornada NO cuentan como tiempo trabajado (ej: almuerzo personal, descansos adicionales)"}
              </p>
            </div>

            {/* Companies */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Empresas <span className="text-destructive">*</span>
              </label>
              {loadingCompanies ? (
                <div className="p-4 text-center text-muted-foreground">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent mx-auto mb-2"></div>
                  Cargando empresas...
                </div>
              ) : companies.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  No hay empresas disponibles. Crea una empresa primero.
                </div>
              ) : (
                <div className="border border-input rounded-lg bg-background p-4 max-h-64 overflow-y-auto">
                  <div className="mb-3 pb-3 border-b border-border">
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="text-sm text-accent hover:underline"
                    >
                      {selectedCompanyIds.length === companies.length
                        ? "Deseleccionar todas"
                        : "Seleccionar todas"}
                    </button>
                  </div>
                  <div className="space-y-2">
                    {companies.map((company) => (
                      <label
                        key={company.id}
                        className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-2 rounded"
                      >
                        <input
                          type="checkbox"
                          checked={selectedCompanyIds.includes(company.id)}
                          onChange={() => handleCompanyToggle(company.id)}
                          className="h-4 w-4 rounded border-input text-accent focus:ring-2 focus:ring-accent"
                        />
                        <span className="text-sm text-foreground">{company.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Selecciona las empresas que podrán usar este tipo de pausa
              </p>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-foreground mb-2">
                Descripción (opcional)
              </label>
              <textarea
                id="description"
                name="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="Describe cuándo se debe usar este tipo de pausa"
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Información adicional sobre este tipo de pausa (máximo 500 caracteres)
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={loading || loadingCompanies || companies.length === 0}
                className="flex-1 bg-accent text-accent-foreground py-2 px-4 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Creando..." : "Crear Tipo de Pausa"}
              </button>
              <Link
                href="/pause-types"
                className="flex-1 bg-secondary text-secondary-foreground py-2 px-4 rounded-lg font-medium hover:opacity-90 transition-opacity text-center"
              >
                Cancelar
              </Link>
            </div>
          </form>
        </div>
      </div>
    </AppWrapper>
  );
}
