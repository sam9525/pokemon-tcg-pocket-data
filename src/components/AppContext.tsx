"use client";
import React from "react";
import { SessionProvider } from "next-auth/react";
import { LanguageProvider } from "@/components/provider/LanguageProvider";
import AdminProvider from "@/components/provider/AdminProvider";

export function AppProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <LanguageProvider>
        <AdminProvider>{children}</AdminProvider>
      </LanguageProvider>
    </SessionProvider>
  );
}
