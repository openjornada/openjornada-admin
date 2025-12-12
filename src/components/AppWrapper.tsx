"use client";

import React, { ReactNode } from "react";
import Sidebar from "./Sidebar";
import TopNav from "./TopNav";
import Footer from "./Footer";
import ProtectedRoute from "./ProtectedRoute";

interface AppWrapperProps {
  children: ReactNode;
}

export default function AppWrapper({ children }: AppWrapperProps) {
  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-background">
        {/* Sidebar */}
        <Sidebar />

        {/* Main content area */}
        <div className="flex-1 flex flex-col ml-64">
          {/* Top navigation */}
          <TopNav />

          {/* Page content */}
          <main className="flex-1 overflow-y-auto">
            <div className="container mx-auto p-6">
              {children}
            </div>
          </main>

          {/* Footer */}
          <Footer />
        </div>
      </div>
    </ProtectedRoute>
  );
}
