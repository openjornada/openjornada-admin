"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import toast from "react-hot-toast";
import { appConfig } from "@/lib/config";

type FormState = "idle" | "loading" | "success" | "error";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<FormState>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!email) {
      setErrorMessage("Por favor ingrese su email");
      return;
    }

    if (!validateEmail(email)) {
      setErrorMessage("Por favor ingrese un email válido");
      return;
    }

    setState("loading");

    try {
      await apiClient.forgotPassword(email);
      setState("success");
      setEmail("");
      toast.success("Si el email existe, recibirás instrucciones para restablecer tu contraseña");
    } catch (error: any) {
      console.error("Forgot password error:", error);
      setState("error");
      // Mensaje genérico por seguridad (no revelar si el usuario existe)
      setErrorMessage("Si el email existe, recibirás instrucciones para restablecer tu contraseña");
      // Aún así mostramos un toast de éxito por seguridad
      toast.success("Si el email existe, recibirás instrucciones para restablecer tu contraseña");
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
              Recuperar Contraseña
            </h1>
            <p className="text-muted-foreground">
              Ingresa tu email y te enviaremos instrucciones
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
                      Instrucciones enviadas
                    </h3>
                    <p className="text-sm text-green-700 mt-1">
                      Si el email existe en nuestro sistema, recibirás un correo con
                      instrucciones para restablecer tu contraseña.
                    </p>
                  </div>
                </div>
              </div>

              <Link
                href="/login"
                className="block w-full text-center bg-accent text-accent-foreground py-2 px-4 rounded-lg font-medium hover:opacity-90 transition-opacity"
              >
                Volver al inicio de sesión
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-foreground mb-2"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                  placeholder="Ingrese su email"
                  disabled={state === "loading"}
                  autoComplete="email"
                  autoFocus
                />
                {errorMessage && (
                  <p className="mt-2 text-sm text-red-600">{errorMessage}</p>
                )}
              </div>

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
                    Enviando...
                  </span>
                ) : (
                  "Enviar instrucciones"
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
