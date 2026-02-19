"use client";

import React from "react";
import { AiOutlineFileText, AiOutlineFileExcel, AiOutlineFilePdf } from "react-icons/ai";

interface ExportButtonsProps {
  onExport: (format: "csv" | "xlsx" | "pdf") => void;
  disabled?: boolean;
  loading?: boolean;
}

export default function ExportButtons({ onExport, disabled = false, loading = false }: ExportButtonsProps) {
  const buttons = [
    { format: "csv" as const, label: "CSV", icon: <AiOutlineFileText className="text-lg" /> },
    { format: "xlsx" as const, label: "Excel", icon: <AiOutlineFileExcel className="text-lg" /> },
    { format: "pdf" as const, label: "PDF", icon: <AiOutlineFilePdf className="text-lg" /> },
  ];

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground mr-1">Exportar:</span>
      {buttons.map((btn) => (
        <button
          key={btn.format}
          onClick={() => onExport(btn.format)}
          disabled={disabled || loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-accent/5 hover:border-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-foreground"
          title={`Exportar como ${btn.label}`}
        >
          {btn.icon}
          <span>{btn.label}</span>
        </button>
      ))}
    </div>
  );
}
