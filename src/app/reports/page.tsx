"use client";

import { useTranslations } from "next-intl";
import AppWrapper from "@/components/AppWrapper";
import Link from "next/link";
import {
  AiOutlineUser,
  AiOutlineBank,
  AiOutlineEdit,
} from "react-icons/ai";

export default function ReportsPage() {
  const t = useTranslations("reports");
  const reportLinks = [
    {
      href: "/reports/workers",
      icon: <AiOutlineUser className="text-2xl text-accent" />,
      title: t("workerReportTitle"),
      description: t("workerReportDesc"),
    },
    {
      href: "/reports/companies",
      icon: <AiOutlineBank className="text-2xl text-accent" />,
      title: t("companyReportTitle"),
      description: t("companyReportDesc"),
    },
{
      href: "/reports/signatures",
      icon: <AiOutlineEdit className="text-2xl text-accent" />,
      title: t("signaturesTitle"),
      description: t("signaturesDesc"),
    },
  ];

  return (
    <AppWrapper>
      <div>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {t("hubTitle")}
          </h1>
          <p className="text-muted-foreground">
            {t("hubSubtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {reportLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-start gap-4 p-6 bg-card border border-border rounded-lg hover:bg-accent/5 hover:border-accent transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                {link.icon}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-1">
                  {link.title}
                </h2>
                <p className="text-sm text-muted-foreground">{link.description}</p>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-8 bg-accent/5 border border-accent/20 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {t("complianceTitle")}
          </h3>
          <p className="text-muted-foreground text-sm">
            {t("complianceBody")}
          </p>
        </div>
      </div>
    </AppWrapper>
  );
}
