"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { apiClient, APIUser } from "@/lib/api-client";
import { useRouter } from "next/navigation";

interface AuthContextType {
  user: APIUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<APIUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

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
            return;
          }

          setUser(currentUser);
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
        throw new Error("Solo los administradores pueden acceder al panel de administración");
      }

      setUser(currentUser);
      router.push("/");
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
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
