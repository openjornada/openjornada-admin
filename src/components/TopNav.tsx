"use client";

import React, { useEffect, useRef, useState } from "react";
import { AiOutlineUser, AiOutlineBell } from "react-icons/ai";
import { useTranslations } from "next-intl";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/RealtimeProvider";
import { formatToLocalTime } from "@/utils/dateFormatters";
import LanguageSelector from "@/components/LanguageSelector";
import type { NotificationItem } from "@/lib/api-client";

// Human-readable line for a notification; falls back to the raw type for
// event kinds without a dedicated renderer yet.
function describeNotification(
  notification: NotificationItem,
  recordTypeLabel: (type: string) => string,
  fichajeFallback: string
): string {
  const p = notification.payload as {
    worker_name?: string;
    record_type?: string;
    company_name?: string;
  };
  if (notification.type === "fichaje.created") {
    const recordType = p.record_type ? recordTypeLabel(p.record_type) : "";
    const parts = [p.worker_name || fichajeFallback, recordType, p.company_name].filter(Boolean);
    return parts.join(" — ");
  }
  return notification.type;
}

export default function TopNav() {
  const t = useTranslations("topnav");
  const tr = useTranslations("common.recordTypes");
  const { user } = useAuth();
  const { unreadCount, notifications, markRead, refreshNotifications } = useNotifications();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const recordTypeLabel = (type: string) =>
    tr.has(type) ? tr(type) : type;

  // Close the dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const toggleDropdown = () => {
    const next = !open;
    setOpen(next);
    // Pull the unread list from the API on EVERY open: the backend is the source
    // of truth, so this self-heals badge/list drift when notifications were read
    // in another tab (whose SSE events this tab never saw).
    if (next) {
      void refreshNotifications();
    }
  };

  return (
    <div className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
      <div>
        {/* Breadcrumb or page title could go here */}
      </div>

      <div className="flex items-center gap-4">
        {/* Language selector */}
        <LanguageSelector />

        {/* Notifications */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={toggleDropdown}
            aria-label={t("notificationsAria")}
            aria-haspopup="true"
            aria-expanded={open}
            className="relative p-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <AiOutlineBell className="text-xl" />
            {/* Notification badge */}
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-destructive text-destructive-foreground text-[10px] font-semibold rounded-full">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          {open && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <p className="text-sm font-medium text-foreground">{t("notifications")}</p>
                {notifications.length > 0 && (
                  <button
                    onClick={() => void markRead(notifications.map((n) => n.id))}
                    className="text-xs text-accent hover:underline"
                  >
                    {t("markAllRead")}
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-border">
                {notifications.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-muted-foreground text-center">
                    {t("noUnread")}
                  </p>
                ) : (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className="flex items-start justify-between gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm text-foreground truncate">
                          {describeNotification(notification, recordTypeLabel, t("fichajeFallback"))}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatToLocalTime(notification.created_at)}
                        </p>
                      </div>
                      <button
                        onClick={() => void markRead([notification.id])}
                        className="shrink-0 text-xs text-accent hover:underline"
                      >
                        {t("markRead")}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User profile */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-medium text-foreground">
              {user?.username || t("defaultUser")}
            </p>
            <p className="text-xs text-muted-foreground">{t("adminRole")}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
            <AiOutlineUser className="text-xl text-accent-foreground" />
          </div>
        </div>
      </div>
    </div>
  );
}
