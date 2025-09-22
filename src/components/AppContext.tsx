"use client";
import React from "react";
import { SessionProvider } from "next-auth/react";
import { LanguageProvider } from "@/components/provider/LanguageProvider";

export function AppProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <LanguageProvider>{children}</LanguageProvider>
    </SessionProvider>
  );
}
