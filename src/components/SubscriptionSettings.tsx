"use client";

import { useEffect, useState } from "react";
import { AiOutlineCreditCard } from "react-icons/ai";
import { apiClient } from "@/lib/api-client";
import type { SubscriptionStatus } from "@/lib/api-client";
import { formatToLocalTime } from "@/utils/dateFormatters";
import toast from "react-hot-toast";

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  active: { label: "Al día", className: "text-green-600 dark:text-green-400" },
  trialing: { label: "Al día", className: "text-green-600 dark:text-green-400" },
  past_due: { label: "Pago pendiente", className: "text-yellow-600 dark:text-yellow-400" },
  canceled: { label: "Caducada", className: "text-red-600 dark:text-red-400" },
  unpaid: { label: "Caducada", className: "text-red-600 dark:text-red-400" },
  incomplete_expired: { label: "Caducada", className: "text-red-600 dark:text-red-400" },
};

const MODE_LABELS: Record<string, string> = {
  live: "Producción",
  demo: "Demo",
};

export default function SubscriptionSettings() {
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [openingPortal, setOpeningPortal] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getSubscriptionStatus();
      setStatus(data);
    } catch (error) {
      console.error("Error fetching subscription status:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setOpeningPortal(true);
    try {
      const { url } = await apiClient.getSubscriptionPortalUrl();
      window.open(url, "_blank");
    } catch (error) {
      console.error("Error opening subscription portal:", error);
      toast.error("Error al abrir la gestión de la suscripción");
    } finally {
      setOpeningPortal(false);
    }
  };

  if (loading || !status || !status.enabled) {
    return null;
  }

  const statusInfo = status.status ? STATUS_LABELS[status.status] : undefined;

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
        <AiOutlineCreditCard className="text-accent" />
        Suscripción
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <p className="text-sm text-muted-foreground">Estado</p>
          <p className={`text-base font-medium ${statusInfo?.className || "text-foreground"}`}>
            {statusInfo?.label || status.status || "-"}
          </p>
        </div>

        {status.current_period_end && (
          <div>
            <p className="text-sm text-muted-foreground">Fecha de renovación</p>
            <p className="text-base font-medium text-foreground">
              {formatToLocalTime(status.current_period_end, {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: undefined,
                minute: undefined,
              })}
            </p>
          </div>
        )}

        {typeof status.days_remaining === "number" && (
          <div>
            <p className="text-sm text-muted-foreground">Días restantes</p>
            <p className="text-base font-medium text-foreground">{status.days_remaining}</p>
          </div>
        )}

        {status.mode && (
          <div>
            <p className="text-sm text-muted-foreground">Modo</p>
            <p className="text-base font-medium text-foreground">{MODE_LABELS[status.mode] || status.mode}</p>
          </div>
        )}
      </div>

      <button
        onClick={handleManageSubscription}
        disabled={openingPortal}
        className="bg-accent text-accent-foreground py-2 px-6 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {openingPortal ? "Abriendo..." : "Gestionar en Stripe"}
      </button>
    </div>
  );
}
