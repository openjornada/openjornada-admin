"use client";

interface SmsCreditsBadgeProps {
  balance: number;
  currency?: string;
  unlimited?: boolean;
}

export default function SmsCreditsBadge({ balance, currency = "EUR", unlimited }: SmsCreditsBadgeProps) {
  if (unlimited) {
    return (
      <span
        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      >
        Ilimitado
      </span>
    );
  }

  let className = "";
  let label = "";

  if (balance < 5) {
    className = "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    label = balance <= 0 ? "Sin créditos" : `${balance.toFixed(2)} ${currency}`;
  } else if (balance < 20) {
    className = "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    label = `${balance.toFixed(2)} ${currency}`;
  } else {
    className = "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    label = `${balance.toFixed(2)} ${currency}`;
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}
    >
      {label}
    </span>
  );
}
