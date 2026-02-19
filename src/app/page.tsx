"use client";

import { useState, useEffect } from "react";
import AppWrapper from "@/components/AppWrapper";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { appConfig } from "@/lib/config";
import { AiOutlineUser, AiOutlineClockCircle, AiOutlinePlus, AiOutlineEdit, AiOutlineExclamationCircle, AiOutlineBarChart } from "react-icons/ai";

export default function Home() {
  const [stats, setStats] = useState({
    totalWorkers: 0,
    totalRecords: 0,
    pendingChangeRequests: 0,
    loading: true,
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [workers, records, pendingRequests] = await Promise.all([
        apiClient.getWorkers(),
        apiClient.getTimeRecords(),
        apiClient.getChangeRequests({ status: "pending" }),
      ]);

      setStats({
        totalWorkers: workers.length,
        totalRecords: records.length,
        pendingChangeRequests: pendingRequests.length,
        loading: false,
      });
    } catch (error) {
      console.error("Error loading stats:", error);
      setStats({
        totalWorkers: 0,
        totalRecords: 0,
        pendingChangeRequests: 0,
        loading: false,
      });
    }
  };

  return (
    <AppWrapper>
      <div>
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Bienvenido a {appConfig.appName}
          </h1>
          <p className="text-muted-foreground">
            Panel de administración del sistema de gestión de registros de jornada laboral
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Trabajadores</p>
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
              Ver todos los trabajadores →
            </Link>
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Registros</p>
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
              Ver todos los registros de jornada →
            </Link>
          </div>

          <div className={`bg-card border rounded-lg p-6 ${stats.pendingChangeRequests > 0 ? 'border-yellow-400 bg-yellow-50/50 dark:bg-yellow-900/10' : 'border-border'}`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Peticiones Pendientes</p>
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
              {stats.pendingChangeRequests > 0 ? 'Revisar peticiones pendientes →' : 'Ver peticiones de cambio →'}
            </Link>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-xl font-bold text-foreground mb-4">Acciones Rápidas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              href="/workers/new"
              className="flex items-center gap-3 p-4 border border-border rounded-lg hover:bg-accent/5 hover:border-accent transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                <AiOutlinePlus className="text-xl text-accent" />
              </div>
              <div>
                <p className="font-medium text-foreground">Nuevo Trabajador</p>
                <p className="text-sm text-muted-foreground">Registrar nuevo empleado</p>
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
                <p className="font-medium text-foreground">Gestionar Trabajadores</p>
                <p className="text-sm text-muted-foreground">Ver y editar trabajadores</p>
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
                <p className="font-medium text-foreground">Registros de Jornada</p>
                <p className="text-sm text-muted-foreground">Consultar entradas y salidas</p>
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
                  Peticiones de Cambio
                  {stats.pendingChangeRequests > 0 && (
                    <span className="ml-2 px-2 py-0.5 text-xs bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 rounded-full">
                      {stats.pendingChangeRequests}
                    </span>
                  )}
                </p>
                <p className="text-sm text-muted-foreground">
                  {stats.pendingChangeRequests > 0 ? 'Hay peticiones por revisar' : 'Gestionar solicitudes'}
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
                <p className="font-medium text-foreground">Ver Informes</p>
                <p className="text-sm text-muted-foreground">Informes de jornada y cumplimiento</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-8 bg-accent/5 border border-accent/20 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Acerca de {appConfig.appName}
          </h3>
          <p className="text-muted-foreground mb-4">
            {appConfig.appName} es un sistema de código abierto para la gestión de registros de jornada laboral,
            diseñado para cumplir con la normativa española de 2026 sobre registro digital de jornada.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="font-medium text-foreground mb-1">✓ 100% Código Abierto</p>
              <p className="text-muted-foreground">Código auditable y transparente</p>
            </div>
            <div>
              <p className="font-medium text-foreground mb-1">✓ Auto-hospedable</p>
              <p className="text-muted-foreground">Tus datos en tu servidor</p>
            </div>
            <div>
              <p className="font-medium text-foreground mb-1">✓ Cumplimiento Legal</p>
              <p className="text-muted-foreground">Normativa 2026 compatible</p>
            </div>
            <div>
              <p className="font-medium text-foreground mb-1">✓ Peticiones de Cambio</p>
              <p className="text-muted-foreground">Los trabajadores pueden solicitar correcciones en sus registros</p>
            </div>
          </div>
        </div>
      </div>
    </AppWrapper>
  );
}
