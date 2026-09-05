"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import AppWrapper from "@/components/AppWrapper";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { appConfig } from "@/lib/config";
import { AiOutlineUser, AiOutlineClockCircle, AiOutlinePlus, AiOutlineEdit, AiOutlineExclamationCircle, AiOutlineBarChart, AiOutlineMessage, AiOutlineCalendar } from "react-icons/ai";

export default function Home() {
  const t = useTranslations("dashboard");
  const [stats, setStats] = useState({
    totalWorkers: 0,
    totalRecords: 0,
    pendingChangeRequests: 0,
    smsSentToday: 0,
    smsFailedToday: 0,
    loading: true,
  });
  const [pendingAbsences, setPendingAbsences] = useState(0);
  const [absenceLoading, setAbsenceLoading] = useState(false);

  useEffect(() => {
    // TODO: migrar a hook de datos (fetch-on-mount)
    // eslint-disable-next-line react-hooks/immutability
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [workers, records, pendingRequests, smsStatsResult] = await Promise.allSettled([
        apiClient.getWorkers(),
        apiClient.getTimeRecords(),
        apiClient.getChangeRequests({ status: "pending" }),
        apiClient.getSmsStats(),
      ]);

      setStats({
        totalWorkers: workers.status === "fulfilled" ? workers.value.length : 0,
        totalRecords: records.status === "fulfilled" ? records.value.length : 0,
        pendingChangeRequests: pendingRequests.status === "fulfilled" ? pendingRequests.value.length : 0,
        smsSentToday: smsStatsResult.status === "fulfilled" ? smsStatsResult.value.sent_today : 0,
        smsFailedToday: smsStatsResult.status === "fulfilled" ? smsStatsResult.value.failed_today : 0,
        loading: false,
      });
    } catch (error) {
      console.error("Error loading stats:", error);
      setStats({
        totalWorkers: 0,
        totalRecords: 0,
        pendingChangeRequests: 0,
        smsSentToday: 0,
        smsFailedToday: 0,
        loading: false,
      });
    }
  };

  useEffect(() => {
    const loadPendingAbsences = async () => {
      setAbsenceLoading(true);
      try {
        const companies = await apiClient.getCompanies();
        const enabledCompanies = companies.filter((c) => c.absence_management_enabled);
        const results = await Promise.allSettled(
          enabledCompanies.map((c) => apiClient.getAbsences({ company_id: c.id, status: "pending" })),
        );
        const total = results.reduce((sum, r) => sum + (r.status === "fulfilled" ? r.value.length : 0), 0);
        setPendingAbsences(total);
      } catch {
        setPendingAbsences(0);
      } finally {
        setAbsenceLoading(false);
      }
    };
    loadPendingAbsences();
  }, []);

  return (
    <AppWrapper>
      <div>
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {t("welcome", { appName: appConfig.appName })}
          </h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">{t("totalWorkers")}</p>
                <p className="text-3xl font-bold text-foreground">
                  {stats.loading ? "..." : stats.totalWorkers}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                <AiOutlineUser className="text-2xl text-accent" />
              </div>
            </div>
            <Link
              href="/workers"
              className="text-sm text-accent hover:underline"
            >
              {t("viewAllWorkers")}
            </Link>
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">{t("totalRecords")}</p>
                <p className="text-3xl font-bold text-foreground">
                  {stats.loading ? "..." : stats.totalRecords}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                <AiOutlineClockCircle className="text-2xl text-accent" />
              </div>
            </div>
            <Link
              href="/time-records"
              className="text-sm text-accent hover:underline"
            >
              {t("viewAllRecords")}
            </Link>
          </div>

          <div className={`bg-card border rounded-lg p-6 ${stats.pendingChangeRequests > 0 ? 'border-yellow-400 bg-yellow-50/50 dark:bg-yellow-900/10' : 'border-border'}`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">{t("pendingChangeRequests")}</p>
                <p className={`text-3xl font-bold ${stats.pendingChangeRequests > 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-foreground'}`}>
                  {stats.loading ? "..." : stats.pendingChangeRequests}
                </p>
              </div>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${stats.pendingChangeRequests > 0 ? 'bg-yellow-100 dark:bg-yellow-900/30' : 'bg-accent/10'}`}>
                <AiOutlineExclamationCircle className={`text-2xl ${stats.pendingChangeRequests > 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-accent'}`} />
              </div>
            </div>
            <Link
              href="/change-requests"
              className={`text-sm hover:underline ${stats.pendingChangeRequests > 0 ? 'text-yellow-600 dark:text-yellow-400 font-medium' : 'text-accent'}`}
            >
              {stats.pendingChangeRequests > 0 ? t("reviewPendingRequests") : t("viewChangeRequests")}
            </Link>
          </div>

          <div className={`bg-card border rounded-lg p-6 ${pendingAbsences > 0 ? 'border-yellow-400 bg-yellow-50/50 dark:bg-yellow-900/10' : 'border-border'}`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">{t("pendingAbsences")}</p>
                <p className={`text-3xl font-bold ${pendingAbsences > 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-foreground'}`}>
                  {absenceLoading || stats.loading ? "..." : pendingAbsences}
                </p>
              </div>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${pendingAbsences > 0 ? 'bg-yellow-100 dark:bg-yellow-900/30' : 'bg-accent/10'}`}>
                <AiOutlineCalendar className={`text-2xl ${pendingAbsences > 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-accent'}`} />
              </div>
            </div>
            <Link
              href="/absences"
              className={`text-sm hover:underline ${pendingAbsences > 0 ? 'text-yellow-600 dark:text-yellow-400 font-medium' : 'text-accent'}`}
            >
              {pendingAbsences > 0 ? t("reviewPendingAbsences") : t("viewAbsences")}
            </Link>
          </div>

          {/* SMS stat card */}
          <div className={`bg-card border rounded-lg p-6 ${stats.smsFailedToday > 0 ? 'border-red-400 bg-red-50/50 dark:bg-red-900/10' : 'border-border'}`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">{t("smsSentToday")}</p>
                <p className={`text-3xl font-bold ${stats.smsFailedToday > 0 ? 'text-destructive' : 'text-foreground'}`}>
                  {stats.loading ? "..." : stats.smsSentToday}
                </p>
                {!stats.loading && stats.smsFailedToday > 0 && (
                  <p className="text-xs text-destructive mt-1">
                    {t("smsFailedCount", { count: stats.smsFailedToday })}
                  </p>
                )}
              </div>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${stats.smsFailedToday > 0 ? 'bg-red-100 dark:bg-red-900/30' : 'bg-accent/10'}`}>
                <AiOutlineMessage className={`text-2xl ${stats.smsFailedToday > 0 ? 'text-destructive' : 'text-accent'}`} />
              </div>
            </div>
            <Link
              href="/sms/history"
              className={`text-sm hover:underline ${stats.smsFailedToday > 0 ? 'text-destructive font-medium' : 'text-accent'}`}
            >
              {stats.smsFailedToday > 0 ? t("viewFailedSms") : t("viewSmsHistory")}
            </Link>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-xl font-bold text-foreground mb-4">{t("quickActions")}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              href="/workers/new"
              className="flex items-center gap-3 p-4 border border-border rounded-lg hover:bg-accent/5 hover:border-accent transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                <AiOutlinePlus className="text-xl text-accent" />
              </div>
              <div>
                <p className="font-medium text-foreground">{t("newWorker")}</p>
                <p className="text-sm text-muted-foreground">{t("newWorkerDesc")}</p>
              </div>
            </Link>

            <Link
              href="/workers"
              className="flex items-center gap-3 p-4 border border-border rounded-lg hover:bg-accent/5 hover:border-accent transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                <AiOutlineUser className="text-xl text-accent" />
              </div>
              <div>
                <p className="font-medium text-foreground">{t("manageWorkers")}</p>
                <p className="text-sm text-muted-foreground">{t("manageWorkersDesc")}</p>
              </div>
            </Link>

            <Link
              href="/time-records"
              className="flex items-center gap-3 p-4 border border-border rounded-lg hover:bg-accent/5 hover:border-accent transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                <AiOutlineClockCircle className="text-xl text-accent" />
              </div>
              <div>
                <p className="font-medium text-foreground">{t("timeRecords")}</p>
                <p className="text-sm text-muted-foreground">{t("timeRecordsDesc")}</p>
              </div>
            </Link>

            <Link
              href="/change-requests"
              className={`flex items-center gap-3 p-4 border rounded-lg transition-colors ${
                stats.pendingChangeRequests > 0
                  ? 'border-yellow-400 bg-yellow-50/50 dark:bg-yellow-900/10 hover:bg-yellow-100/50 dark:hover:bg-yellow-900/20'
                  : 'border-border hover:bg-accent/5 hover:border-accent'
              }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                stats.pendingChangeRequests > 0 ? 'bg-yellow-100 dark:bg-yellow-900/30' : 'bg-accent/10'
              }`}>
                <AiOutlineEdit className={`text-xl ${stats.pendingChangeRequests > 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-accent'}`} />
              </div>
              <div>
                <p className={`font-medium ${stats.pendingChangeRequests > 0 ? 'text-yellow-700 dark:text-yellow-400' : 'text-foreground'}`}>
                  {t("changeRequests")}
                  {stats.pendingChangeRequests > 0 && (
                    <span className="ml-2 px-2 py-0.5 text-xs bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 rounded-full">
                      {stats.pendingChangeRequests}
                    </span>
                  )}
                </p>
                <p className="text-sm text-muted-foreground">
                  {stats.pendingChangeRequests > 0 ? t("changeRequestsPendingDesc") : t("changeRequestsDesc")}
                </p>
              </div>
            </Link>

            <Link
              href="/reports"
              className="flex items-center gap-3 p-4 border border-border rounded-lg hover:bg-accent/5 hover:border-accent transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                <AiOutlineBarChart className="text-xl text-accent" />
              </div>
              <div>
                <p className="font-medium text-foreground">{t("reports")}</p>
                <p className="text-sm text-muted-foreground">{t("reportsDesc")}</p>
              </div>
            </Link>

            <Link
              href="/absences"
              className={`flex items-center gap-3 p-4 border rounded-lg transition-colors ${
                pendingAbsences > 0
                  ? 'border-yellow-400 bg-yellow-50/50 dark:bg-yellow-900/10 hover:bg-yellow-100/50 dark:hover:bg-yellow-900/20'
                  : 'border-border hover:bg-accent/5 hover:border-accent'
              }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                pendingAbsences > 0 ? 'bg-yellow-100 dark:bg-yellow-900/30' : 'bg-accent/10'
              }`}>
                <AiOutlineCalendar className={`text-xl ${pendingAbsences > 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-accent'}`} />
              </div>
              <div>
                <p className={`font-medium ${pendingAbsences > 0 ? 'text-yellow-700 dark:text-yellow-400' : 'text-foreground'}`}>
                  {t("absences")}
                  {pendingAbsences > 0 && (
                    <span className="ml-2 px-2 py-0.5 text-xs bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 rounded-full">
                      {pendingAbsences}
                    </span>
                  )}
                </p>
                <p className="text-sm text-muted-foreground">
                  {pendingAbsences > 0 ? t("absencesPendingDesc") : t("absencesDesc")}
                </p>
              </div>
            </Link>

            <Link
              href="/absences/calendar"
              className="flex items-center gap-3 p-4 border border-border rounded-lg hover:bg-accent/5 hover:border-accent transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                <AiOutlineCalendar className="text-xl text-accent" />
              </div>
              <div>
                <p className="font-medium text-foreground">{t("teamCalendar")}</p>
                <p className="text-sm text-muted-foreground">{t("teamCalendarDesc")}</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-8 bg-accent/5 border border-accent/20 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {t("aboutTitle", { appName: appConfig.appName })}
          </h3>
          <p className="text-muted-foreground mb-4">
            {t("aboutBody", { appName: appConfig.appName })}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="font-medium text-foreground mb-1">{t("featureOpenSource")}</p>
              <p className="text-muted-foreground">{t("featureOpenSourceDesc")}</p>
            </div>
            <div>
              <p className="font-medium text-foreground mb-1">{t("featureSelfHosted")}</p>
              <p className="text-muted-foreground">{t("featureSelfHostedDesc")}</p>
            </div>
            <div>
              <p className="font-medium text-foreground mb-1">{t("featureCompliance")}</p>
              <p className="text-muted-foreground">{t("featureComplianceDesc")}</p>
            </div>
            <div>
              <p className="font-medium text-foreground mb-1">{t("featureChangeRequests")}</p>
              <p className="text-muted-foreground">{t("featureChangeRequestsDesc")}</p>
            </div>
          </div>
        </div>
      </div>
    </AppWrapper>
  );
}
