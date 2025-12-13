"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { AiOutlineHome, AiOutlineUser, AiOutlineClockCircle, AiOutlineAlert, AiOutlineSetting, AiOutlineBank, AiOutlinePauseCircle, AiOutlineSafety, AiOutlineCloudServer } from "react-icons/ai";
import { BiLogOutCircle as BiLogOut } from "react-icons/bi";
import { appConfig } from "@/lib/config";

export default function Sidebar() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    return pathname === path || pathname?.startsWith(path + "/");
  };

  return (
    <nav className="fixed top-0 left-0 h-full w-64 bg-sidebar border-r border-sidebar-border">
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="px-6 py-5 border-b border-sidebar-border">
          <Link href="/" className="block">
            {appConfig.appLogo && appConfig.appLogo !== "/logo.png" ? (
              <div className="flex items-center gap-3">
                <Image
                  src={appConfig.appLogo}
                  alt={appConfig.appName}
                  width={32}
                  height={32}
                  className="object-contain"
                />
                <div>
                  <h1 className="text-lg font-bold text-sidebar-foreground">
                    {appConfig.appName}
                  </h1>
                  <p className="text-xs text-sidebar-foreground/60">Admin Panel</p>
                </div>
              </div>
            ) : (
              <div>
                <h1 className="text-xl font-bold text-sidebar-foreground">
                  {appConfig.appName}
                </h1>
                <p className="text-xs text-sidebar-foreground/60">Admin Panel</p>
              </div>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-6">
          <ul className="space-y-2 px-3">
            <li>
              <Link
                href="/"
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  isActive("/") && pathname === "/"
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                }`}
              >
                <AiOutlineHome className="text-xl" />
                <span>Dashboard</span>
              </Link>
            </li>

            <li>
              <Link
                href="/workers"
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  isActive("/workers")
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                }`}
              >
                <AiOutlineUser className="text-xl" />
                <span>Trabajadores</span>
              </Link>
            </li>

            <li>
              <Link
                href="/companies"
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  isActive("/companies")
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                }`}
              >
                <AiOutlineBank className="text-xl" />
                <span>Empresas</span>
              </Link>
            </li>

            <li>
              <Link
                href="/time-records"
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  isActive("/time-records")
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                }`}
              >
                <AiOutlineClockCircle className="text-xl" />
                <span>Registros de Jornada</span>
              </Link>
            </li>

            <li>
              <Link
                href="/pause-types"
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  isActive("/pause-types")
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                }`}
              >
                <AiOutlinePauseCircle className="text-xl" />
                <span>Tipos de Pausa</span>
              </Link>
            </li>

            <li>
              <Link
                href="/incidents"
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  isActive("/incidents")
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                }`}
              >
                <AiOutlineAlert className="text-xl" />
                <span>Incidencias</span>
              </Link>
            </li>

            <li>
              <Link
                href="/change-requests"
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  isActive("/change-requests")
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                }`}
              >
                <AiOutlineClockCircle className="text-xl" />
                <span>Peticiones de Cambio</span>
              </Link>
            </li>

            <li>
              <Link
                href="/gdpr"
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  isActive("/gdpr")
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                }`}
              >
                <AiOutlineSafety className="text-xl" />
                <span>Gestión RGPD</span>
              </Link>
            </li>

            <li>
              <Link
                href="/backups"
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  isActive("/backups")
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                }`}
              >
                <AiOutlineCloudServer className="text-xl" />
                <span>Backups</span>
              </Link>
            </li>

            <li>
              <Link
                href="/settings"
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  isActive("/settings")
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                }`}
              >
                <AiOutlineSetting className="text-xl" />
                <span>Configuración</span>
              </Link>
            </li>
          </ul>
        </div>

        {/* Logout */}
        <div className="border-t border-sidebar-border p-3">
          <button
            className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
            onClick={() => {
              if (typeof window !== "undefined") {
                const { apiClient } = require("@/lib/api-client");
                apiClient.logout();
              }
            }}
          >
            <BiLogOut className="text-xl" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
