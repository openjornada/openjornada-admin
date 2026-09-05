"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AiOutlineWarning, AiOutlineCloseCircle } from "react-icons/ai";
import { apiClient } from "@/lib/api-client";
import type { SubscriptionStatus } from "@/lib/api-client";
import toast from "react-hot-toast";

export default function SubscriptionBanner() {
  const t = useTranslations("subscription");
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [openingPortal, setOpeningPortal] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const data = await apiClient.getSubscriptionStatus();
      setStatus(data);
    } catch (error) {
      console.error("Error fetching subscription status:", error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const data = await apiClient.getSubscriptionStatus(true);
      setStatus(data);
      if (data.status === "active" || data.status === "trialing") {
        toast.success(t("activated"));
      }
    } catch (error) {
      console.error("Error refreshing subscription status:", error);
      toast.error(t("refreshError"));
    } finally {
      setRefreshing(false);
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

  if (!status || !status.enabled) {
    return null;
  }

  if (status.status === "past_due") {
    return (
      <div className="flex items-center gap-3 px-6 py-3 bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800">
        <AiOutlineWarning className="text-yellow-600 dark:text-yellow-400 text-xl flex-shrink-0" />
        <p className="text-sm text-yellow-800 dark:text-yellow-300 flex-1">
          <span className="font-semibold">{t("bannerPastDueTitle")}</span> {t("bannerPastDueBody")}
        </p>
        <button
          onClick={handleManageSubscription}
          disabled={openingPortal}
          className="text-sm font-medium text-yellow-800 dark:text-yellow-300 underline hover:no-underline disabled:opacity-50"
        >
          {t("manage")}
        </button>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="text-sm font-medium bg-yellow-600 text-white py-1 px-3 rounded-md hover:opacity-90 disabled:opacity-50"
        >
          {refreshing ? t("refreshing") : t("refresh")}
        </button>
      </div>
    );
  }

  if (status.status === "canceled" || status.status === "unpaid") {
    return (
      <div className="flex items-center gap-3 px-6 py-3 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
        <AiOutlineCloseCircle className="text-red-600 dark:text-red-400 text-xl flex-shrink-0" />
        <p className="text-sm text-red-800 dark:text-red-300 flex-1">
          <span className="font-semibold">{t("bannerExpiredTitle")}</span> — {t("bannerExpiredBody")}
        </p>
        <button
          onClick={handleManageSubscription}
          disabled={openingPortal}
          className="text-sm font-medium text-red-800 dark:text-red-300 underline hover:no-underline disabled:opacity-50"
        >
          {t("manage")}
        </button>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="text-sm font-medium bg-red-600 text-white py-1 px-3 rounded-md hover:opacity-90 disabled:opacity-50"
        >
          {refreshing ? t("refreshing") : t("refresh")}
        </button>
      </div>
    );
  }

  return null;
}
