"use client";

import { createContext, useContext, ReactNode, useState, useEffect } from "react";

interface AnalysisContextType {
  // Empty interface - no analysis functionality
}

export const AnalysisContext = createContext<AnalysisContextType | undefined>(undefined);

export function AnalysisProgressProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // During SSR or initial render, return a simple div
  if (!mounted) {
    return <div suppressHydrationWarning>{children}</div>;
  }

  // Provide empty context
  return (
    <AnalysisContext.Provider value={{}}>
      {children}
    </AnalysisContext.Provider>
  );
}

export function useAnalysisProgress() {
  const context = useContext(AnalysisContext);
  if (context === undefined) {
    // Return a default value during SSR instead of throwing
    if (typeof window === 'undefined') {
      return {};
    }
    throw new Error("useAnalysisProgress must be used within an AnalysisProgressProvider");
  }
  return context;
} 