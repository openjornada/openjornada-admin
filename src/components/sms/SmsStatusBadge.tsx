"use client";

interface SmsStatusBadgeProps {
  status: string;
}

const statusConfig = {
  pending: {
    label: "Pendiente",
    className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  },
  sent: {
    label: "Enviado",
    className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  },
  delivered: {
    label: "Entregado",
    className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  },
  failed: {
    label: "Fallido",
    className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  },
};

export default function SmsStatusBadge({ status }: SmsStatusBadgeProps) {
  const config = statusConfig[status as keyof typeof statusConfig];

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
      {config.label}
    </span>
  );
}
