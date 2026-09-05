"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AiOutlineCreditCard } from "react-icons/ai";
import { apiClient } from "@/lib/api-client";
import type { SubscriptionStatus } from "@/lib/api-client";
import { formatToLocalTime } from "@/utils/dateFormatters";
import toast from "react-hot-toast";

const STATUS_LABEL_KEYS: Record<string, { key: "statusUpToDate" | "statusPastDue" | "statusExpired"; className: string }> = {
  active: { key: "statusUpToDate", className: "text-green-600 dark:text-green-400" },
  trialing: { key: "statusUpToDate", className: "text-green-600 dark:text-green-400" },
  past_due: { key: "statusPastDue", className: "text-yellow-600 dark:text-yellow-400" },
  canceled: { key: "statusExpired", className: "text-red-600 dark:text-red-400" },
  unpaid: { key: "statusExpired", className: "text-red-600 dark:text-red-400" },
  incomplete_expired: { key: "statusExpired", className: "text-red-600 dark:text-red-400" },
};

const MODE_LABEL_KEYS: Record<string, "modeLive" | "modeDemo"> = {
  live: "modeLive",
  demo: "modeDemo",
};

export default function SubscriptionSettings() {
  const t = useTranslations("subscription");
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
      toast.error(t("portalError"));
    } finally {
      setOpeningPortal(false);
    }
  };

  if (loading || !status || !status.enabled) {
    return null;
  }

  const statusInfo = status.status ? STATUS_LABEL_KEYS[status.status] : undefined;

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
        <AiOutlineCreditCard className="text-accent" />
        {t("title")}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <p className="text-sm text-muted-foreground">{t("status")}</p>
          <p className={`text-base font-medium ${statusInfo?.className || "text-foreground"}`}>
            {statusInfo ? t(statusInfo.key) : status.status || "-"}
          </p>
        </div>

        {status.current_period_end && (
          <div>
            <p className="text-sm text-muted-foreground">{t("renewalDate")}</p>
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
            <p className="text-sm text-muted-foreground">{t("daysRemaining")}</p>
            <p className="text-base font-medium text-foreground">{status.days_remaining}</p>
          </div>
        )}

        {status.mode && (
          <div>
            <p className="text-sm text-muted-foreground">{t("mode")}</p>
            <p className="text-base font-medium text-foreground">{MODE_LABEL_KEYS[status.mode] ? t(MODE_LABEL_KEYS[status.mode]) : status.mode}</p>
          </div>
        )}
      </div>

      <button
        onClick={handleManageSubscription}
        disabled={openingPortal}
        className="bg-accent text-accent-foreground py-2 px-6 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {openingPortal ? t("opening") : t("manageStripe")}
      </button>
    </div>
  );
}
