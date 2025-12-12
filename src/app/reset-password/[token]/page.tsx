"use client";

import { useState, useEffect, use } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import toast from "react-hot-toast";
import { appConfig } from "@/lib/config";

type FormState = "idle" | "loading" | "success" | "error";

interface ResetPasswordPageProps {
  params: Promise<{
    token: string;
  }>;
}

export default function ResetPasswordPage({ params }: ResetPasswordPageProps) {
  const { token } = use(params);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [state, setState] = useState<FormState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [countdown, setCountdown] = useState(3);
  const router = useRouter();

  // Countdown para redirección después del éxito
  useEffect(() => {
    if (state === "success" && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (state === "success" && countdown === 0) {
      router.push("/login");
    }
  }, [state, countdown, router]);

  const validatePassword = (password: string): string | null => {
    if (!password) {
      return "La contraseña es requerida";
    }
    if (password.length < 6) {
      return "La contraseña debe tener al menos 6 caracteres";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    // Validaciones
    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      setErrorMessage(passwordError);
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("Las contraseñas no coinciden");
      return;
    }

    setState("loading");

    try {
      await apiClient.resetPassword(token, newPassword);
      setState("success");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Contraseña restablecida exitosamente");
    } catch (error: any) {
      console.error("Reset password error:", error);
      setState("error");

      const errorMsg = error.response?.data?.detail || error.message;

      if (errorMsg?.includes("expired") || errorMsg?.includes("expirado")) {
        setErrorMessage("El enlace de recuperación ha expirado. Por favor solicita uno nuevo.");
      } else if (errorMsg?.includes("invalid") || errorMsg?.includes("inválido")) {
        setErrorMessage("El enlace de recuperación es inválido. Por favor solicita uno nuevo.");
      } else {
        setErrorMessage("Error al restablecer la contraseña. Por favor intenta de nuevo.");
      }

      toast.error(errorMessage || "Error al restablecer la contraseña");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md">
        <div className="bg-card border border-border rounded-lg shadow-lg p-8">
          {/* Logo/Header */}
          <div className="text-center mb-8">
            {appConfig.appLogo && appConfig.appLogo !== "/logo.png" && (
              <div className="flex justify-center mb-4">
                <Image
                  src={appConfig.appLogo}
                  alt={appConfig.appName}
                  width={64}
                  height={64}
                  className="object-contain"
                />
              </div>
            )}
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Nueva Contraseña
            </h1>
            <p className="text-muted-foreground">
              Ingresa tu nueva contraseña
            </p>
          </div>

          {state === "success" ? (
            <div className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start">
                  <svg
                    className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div>
                    <h3 className="text-sm font-medium text-green-800">
                      Contraseña restablecida
                    </h3>
                    <p className="text-sm text-green-700 mt-1">
                      Tu contraseña ha sido restablecida exitosamente.
                    </p>
                    <p className="text-sm text-green-700 mt-2">
                      Redirigiendo al inicio de sesión en {countdown} segundo{countdown !== 1 ? 's' : ''}...
                    </p>
                  </div>
                </div>
              </div>

              <Link
                href="/login"
                className="block w-full text-center bg-accent text-accent-foreground py-2 px-4 rounded-lg font-medium hover:opacity-90 transition-opacity"
              >
                Ir al inicio de sesión
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="newPassword"
                  className="block text-sm font-medium text-foreground mb-2"
                >
                  Nueva Contraseña
                </label>
                <input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                  placeholder="Ingrese su nueva contraseña"
                  disabled={state === "loading"}
                  autoComplete="new-password"
                  autoFocus
                  minLength={6}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Mínimo 6 caracteres
                </p>
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-foreground mb-2"
                >
                  Confirmar Contraseña
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                  placeholder="Confirme su nueva contraseña"
                  disabled={state === "loading"}
                  autoComplete="new-password"
                  minLength={6}
                />
              </div>

              {errorMessage && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <svg
                      className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <div>
                      <h3 className="text-sm font-medium text-red-800">Error</h3>
                      <p className="text-sm text-red-700 mt-1">{errorMessage}</p>
                    </div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={state === "loading"}
                className="w-full bg-accent text-accent-foreground py-2 px-4 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {state === "loading" ? (
                  <span className="flex items-center justify-center">
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-accent-foreground"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Cambiando contraseña...
                  </span>
                ) : (
                  "Cambiar contraseña"
                )}
              </button>

              <div className="text-center">
                <Link
                  href="/login"
                  className="text-sm text-accent hover:underline"
                >
                  Volver al inicio de sesión
                </Link>
              </div>
            </form>
          )}

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-xs text-muted-foreground">
              Panel de administración de {appConfig.appName}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
