"use client";

import React from "react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  variant?: "default" | "warning" | "success";
}

export default function StatCard({ title, value, subtitle, icon, variant = "default" }: StatCardProps) {
  const variantStyles = {
    default: "bg-card border-border",
    warning: "bg-yellow-50/50 dark:bg-yellow-900/10 border-yellow-400",
    success: "bg-green-50/50 dark:bg-green-900/10 border-green-400",
  };

  const valueStyles = {
    default: "text-foreground",
    warning: "text-yellow-600 dark:text-yellow-400",
    success: "text-green-600 dark:text-green-400",
  };

  return (
    <div className={`border rounded-lg p-6 ${variantStyles[variant]}`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-muted-foreground">{title}</p>
        {icon && (
          <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
            {icon}
          </div>
        )}
      </div>
      <p className={`text-3xl font-bold ${valueStyles[variant]}`}>{value}</p>
      {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
    </div>
  );
}
