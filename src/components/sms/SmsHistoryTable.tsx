"use client";

import Link from "next/link";
import { AiOutlineMessage } from "react-icons/ai";
import SmsStatusBadge from "./SmsStatusBadge";
import type { SmsMessage } from "@/lib/api-client";

interface SmsHistoryTableProps {
  messages: SmsMessage[];
  loading?: boolean;
  compact?: boolean;
  workerId?: string;
}

export default function SmsHistoryTable({ messages, loading = false, compact = false }: SmsHistoryTableProps) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto mb-4"></div>
        <p className="text-muted-foreground">Cargando mensajes...</p>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="p-8 text-center">
        <AiOutlineMessage className="text-5xl text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No hay mensajes SMS para mostrar</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-muted">
          <tr>
            {!compact && (
              <>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Trabajador
                </th>
              </>
            )}
            {compact && (
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Fecha
              </th>
            )}
            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Teléfono
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Estado
            </th>
            {!compact && (
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Coste
              </th>
            )}
          </tr>
        </thead>
        <tbody className="bg-card divide-y divide-border">
          {messages.map((msg) => (
            <tr key={msg.id} className="hover:bg-muted/50 transition-colors">
              {!compact && (
                <>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                    {msg.sent_at ? formatDate(msg.sent_at) : "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                    <div>{msg.worker_name}</div>
                    <div className="text-xs text-muted-foreground">{msg.worker_id_number}</div>
                  </td>
                </>
              )}
              {compact && (
                <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                  {msg.sent_at ? formatDate(msg.sent_at) : "-"}
                </td>
              )}
              <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                {msg.phone_number}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                <SmsStatusBadge status={msg.status} />
                {msg.error_message && (
                  <p className="text-xs text-destructive mt-1">{msg.error_message}</p>
                )}
              </td>
              {!compact && (
                <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                  {msg.cost != null ? `${msg.cost.toFixed(4)} €` : "-"}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {compact && (
        <div className="px-6 py-3 border-t border-border">
          <Link href="/sms/history" className="text-sm text-accent hover:underline">
            Ver historial completo →
          </Link>
        </div>
      )}
    </div>
  );
}
