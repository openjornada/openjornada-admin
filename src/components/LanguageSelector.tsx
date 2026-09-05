"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { AiOutlineGlobal } from "react-icons/ai";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";
import { getApiErrorMessage } from "@/lib/error-messages";
import {
  locales,
  negotiateLocale,
  writeLocaleCookie,
  clearLocaleCookie,
  type Locale,
} from "@/i18n/config";

/**
 * Header language selector. Persists the choice via PATCH /api/users/me,
 * mirrors it into the NEXT_LOCALE cookie and refreshes the RSC tree so the
 * whole UI switches immediately. The "Automatic" option clears the stored
 * preference (language=null) and falls back to browser detection.
 *
 * With scope="cookie" (unauthenticated views, e.g. login) there is no profile
 * to persist to: the selection only writes/clears the NEXT_LOCALE cookie.
 */
export default function LanguageSelector({
  scope = "profile",
}: {
  scope?: "profile" | "cookie";
}) {
  const t = useTranslations("topnav");
  const tc = useTranslations("common.language");
  const locale = useLocale();
  const router = useRouter();
  const { updateLanguage } = useAuth();

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const change = async (next: Locale | null) => {
    setOpen(false);
    if (saving) return;
    setSaving(true);
    try {
      if (scope === "cookie") {
        if (next) {
          writeLocaleCookie(next);
        } else {
          clearLocaleCookie();
        }
        router.refresh();
        return;
      }
      await updateLanguage(next);
      // Effective language after the change: explicit choice, or browser
      // detection when the preference was cleared.
      const effective = next ?? negotiateLocale(typeof navigator !== "undefined" ? navigator.language : null);
      writeLocaleCookie(effective);
      router.refresh();
    } catch (error) {
      console.error("Error updating language:", error);
      toast.error(getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        aria-label={t("languageMenu")}
        aria-haspopup="true"
        aria-expanded={open}
        disabled={saving}
        className="flex items-center gap-1.5 p-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
      >
        <AiOutlineGlobal className="text-xl" />
        <span className="uppercase">{locale}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden py-1">
          <p className="px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {t("languageMenu")}
          </p>
          {locales.map((code) => (
            <button
              key={code}
              onClick={() => void change(code)}
              className={`w-full text-left px-4 py-2 text-sm transition-colors hover:bg-muted/50 ${
                code === locale ? "text-accent font-medium" : "text-foreground"
              }`}
            >
              {tc(code)}
              {code === locale && " ✓"}
            </button>
          ))}
          <div className="border-t border-border mt-1">
            <button
              onClick={() => void change(null)}
              className="w-full text-left px-4 py-2 text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
            >
              {t("languageAuto")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
