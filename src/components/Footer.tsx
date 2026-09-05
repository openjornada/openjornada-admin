"use client";

import { useTranslations } from "next-intl";
import { appConfig } from "@/lib/config";

export default function Footer() {
  const t = useTranslations("footer");
  return (
    <footer className="py-4 px-6 border-t border-border bg-card">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-muted-foreground">
        <p>{t("rights", { year: new Date().getFullYear(), appName: appConfig.appName })}</p>
        <div className="flex items-center gap-4">
          <a
            href="https://www.openjornada.es/legal/privacidad"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            {t("privacy")}
          </a>
          <span>·</span>
          <a
            href="https://www.openjornada.es/legal/aviso-legal"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            {t("legalNotice")}
          </a>
          <span>·</span>
          <span>{t("license")}</span>
        </div>
      </div>
    </footer>
  );
}
