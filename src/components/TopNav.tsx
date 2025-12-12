"use client";

import React from "react";
import { AiOutlineUser, AiOutlineBell } from "react-icons/ai";
import { useAuth } from "@/contexts/AuthContext";

export default function TopNav() {
  const { user } = useAuth();

  return (
    <div className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
      <div>
        {/* Breadcrumb or page title could go here */}
      </div>

      <div className="flex items-center gap-4">
        {/* Notifications */}
        <button className="relative p-2 text-muted-foreground hover:text-foreground transition-colors">
          <AiOutlineBell className="text-xl" />
          {/* Notification badge */}
          {/* <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full"></span> */}
        </button>

        {/* User profile */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-medium text-foreground">
              {user?.username || "Admin"}
            </p>
            <p className="text-xs text-muted-foreground">Administrador</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
            <AiOutlineUser className="text-xl text-accent-foreground" />
          </div>
        </div>
      </div>
    </div>
  );
}
