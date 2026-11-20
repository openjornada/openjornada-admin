"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { Roster } from "@/lib/api-client";

interface PublishDialogProps {
  roster: Roster;
  publishing: boolean;
  /** Set when publish returned 409 even though this roster listed no warnings. */
  requireAck?: boolean;
  error?: string | null;
  onConfirm: (opts: { acknowledge_warnings: boolean; notify: boolean }) => void;
  onClose: () => void;
}

export default function PublishDialog({ roster, publishing, requireAck = false, error, onConfirm, onClose }: PublishDialogProps) {
  const t = useTranslations("shifts");
  const tc = useTranslations("common");
  const [acknowledged, setAcknowledged] = useState(false);
  const [notify, setNotify] = useState(true);
  const names = new Map(roster.workers.map((w) => [w.id, `${w.first_name} ${w.last_name}`]));
  const hasWarnings = roster.warnings.length > 0;
  const mustAck = hasWarnings || requireAck;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-label={t("publishTitle")}>
      <div className="bg-card border border-border rounded-lg p-6 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold text-foreground">{t("publishTitle")}</h2>
        <p className="text-sm text-foreground">
          {t("publishSummary", { count: roster.pending_changes, start: roster.start_date, end: roster.end_date })}
        </p>
        <p className="text-sm text-muted-foreground">{t("publishWholeCompany")}</p>

        {hasWarnings && (
          <div>
            <p className="text-sm font-medium text-foreground mb-1">{t("publishWarnings", { count: roster.warnings.length })}</p>
            <ul className="text-sm space-y-1 max-h-48 overflow-y-auto">
              {roster.warnings.map((w, i) => (
                <li key={i} className="text-amber-700">
                  {names.get(w.worker_id) ?? w.worker_id} · {w.date} · {t.has(`warning.${w.code}`) ? t(`warning.${w.code}`) : w.message}
                </li>
              ))}
            </ul>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        {mustAck && (
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} />
            {t("acknowledgeWarnings")}
          </label>
        )}

        <label className="flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
          {t("notifyByEmail")}
        </label>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 border border-border rounded-lg hover:bg-muted">
            {tc("cancel")}
          </button>
          <button
            type="button"
            onClick={() => onConfirm({ acknowledge_warnings: acknowledged, notify })}
            disabled={publishing || (mustAck && !acknowledged)}
            className="px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:opacity-90 disabled:opacity-50"
          >
            {t("publishConfirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
