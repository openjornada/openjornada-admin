"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useTranslations } from "next-intl";
import { apiClient, APIUser, SupportedLocale } from "@/lib/api-client";
import { useRouter } from "next/navigation";
import { isSupportedLocale, negotiateLocale, writeLocaleCookie } from "@/i18n/config";

interface AuthContextType {
  user: APIUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  /** Persist the admin UI language preference (null clears it). */
  updateLanguage: (language: SupportedLocale | null) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<APIUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const t = useTranslations("auth");

  // Check if user is already logged in
  useEffect(() => {
    const initAuth = async () => {
      const token = apiClient.getToken();
      if (token) {
        try {
          const currentUser = await apiClient.getCurrentUser();

          // Verify user is admin
          if (currentUser.role !== "admin") {
            apiClient.clearToken();
            router.push("/login");
          } else {
            setUser(currentUser);
            // Mirror the persisted preference for immediate SSR on next loads.
            if (isSupportedLocale(currentUser.language)) writeLocaleCookie(currentUser.language);
          }
        } catch (error) {
          console.error("Failed to get current user:", error);
          apiClient.clearToken();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, [router]);

  const login = async (email: string, password: string) => {
    try {
      await apiClient.login(email, password);
      const currentUser = await apiClient.getCurrentUser();

      // Check if user is admin
      if (currentUser.role !== "admin") {
        apiClient.clearToken();
        throw new Error(t("adminOnly"));
      }

      setUser(currentUser);
      // Apply the user's saved language right away (cookie mirror).
      const effective = isSupportedLocale(currentUser.language)
        ? currentUser.language
        : negotiateLocale(typeof navigator !== "undefined" ? navigator.language : null);
      writeLocaleCookie(effective);
      router.push("/");
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };

  const updateLanguage = async (language: SupportedLocale | null) => {
    const updated = await apiClient.updateMyLanguage(language);
    setUser(updated);
  };

  const logout = () => {
    apiClient.logout();
    setUser(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        updateLanguage,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
