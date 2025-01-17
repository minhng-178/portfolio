"use client";

import ActiveSectionContextProvider from "@/context/active-section-context";
import { ThemeProvider } from "./theme-provider";
import { Toaster } from "@/components/ui/sonner";

export default function Providers({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <ActiveSectionContextProvider>
        {children}
        <Toaster />
      </ActiveSectionContextProvider>
    </ThemeProvider>
  );
}
