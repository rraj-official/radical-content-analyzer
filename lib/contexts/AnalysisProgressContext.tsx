"use client";

import { createContext, useContext, ReactNode } from "react";

interface AnalysisContextType {
  // Empty interface - no analysis functionality
}

export const AnalysisContext = createContext<AnalysisContextType | undefined>(undefined);

export function AnalysisProgressProvider({ children }: { children: ReactNode }) {
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
    throw new Error("useAnalysisProgress must be used within an AnalysisProgressProvider");
  }
  return context;
} 