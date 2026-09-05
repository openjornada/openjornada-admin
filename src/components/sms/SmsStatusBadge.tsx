"use client";

import { useTranslations } from "next-intl";

interface SmsStatusBadgeProps {
  status: string;
}

const statusConfig: Record<string, { className: string }> = {
  pending: {
    className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  },
  sent: {
    className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  },
  delivered: {
    className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  },
  failed: {
    className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  },
};

export default function SmsStatusBadge({ status }: SmsStatusBadgeProps) {
  const t = useTranslations("common.smsStatus");
  const config = statusConfig[status];

  if (!config) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
        {status}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}
    >
      {t(status)}
    </span>
  );
}
