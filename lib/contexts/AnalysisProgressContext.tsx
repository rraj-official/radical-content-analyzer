"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { AnalysisResult, ApkAnalysisResult, WebsiteAnalysisResult, getMockWebsiteAnalysis, getMockApkAnalysis } from "@/lib/interfaces";
import { simulateApiDelay } from "@/lib/utils";
import { v4 as uuidv4 } from "uuid";

interface AnalysisProgress {
  isLoading: boolean;
  error: string | null;
  progress: number;
  stage: string;
}

interface AnalysisContextType {
  urlAnalysis: {
    result: WebsiteAnalysisResult | null;
    progress: AnalysisProgress;
  };
  apkAnalysis: {
    result: ApkAnalysisResult | null;
    progress: AnalysisProgress;
  };
  analyzeUrl: (url: string) => Promise<WebsiteAnalysisResult | null>;
  analyzeApk: (file: File) => Promise<ApkAnalysisResult | null>;
  analyzeFile: (file: File) => Promise<ApkAnalysisResult | null>;
  getAnalysisById: (id: string) => Promise<AnalysisResult | null>;
  submitFeedback: (analysisId: string, feedback: boolean) => Promise<void>;
  resetAnalysis: () => void;
}

const initialProgress: AnalysisProgress = {
  isLoading: false,
  error: null,
  progress: 0,
  stage: "",
};

export const AnalysisContext = createContext<AnalysisContextType | undefined>(undefined);

export function AnalysisProgressProvider({ children }: { children: ReactNode }) {
  const [urlAnalysis, setUrlAnalysis] = useState<{
    result: WebsiteAnalysisResult | null;
    progress: AnalysisProgress;
  }>({
    result: null,
    progress: { ...initialProgress },
  });

  const [apkAnalysis, setApkAnalysis] = useState<{
    result: ApkAnalysisResult | null;
    progress: AnalysisProgress;
  }>({
    result: null,
    progress: { ...initialProgress },
  });

  // Mock analysis storage for retrieving by ID
  const [analysisStore, setAnalysisStore] = useState<AnalysisResult[]>([]);

  // Mock URL analysis with staged progress updates
  const analyzeUrl = async (url: string): Promise<WebsiteAnalysisResult | null> => {
    try {
      setUrlAnalysis(prev => ({
        ...prev,
        progress: {
          isLoading: true,
          error: null,
          progress: 0,
          stage: "Starting analysis...",
        },
      }));

      // Stage 1: Website data collection
      await simulateApiDelay(1000);
      setUrlAnalysis(prev => ({
        ...prev,
        progress: {
          ...prev.progress,
          progress: 25,
          stage: "Retrieving website data...",
        },
      }));

      // Stage 2: Domain information
      await simulateApiDelay(1000);
      setUrlAnalysis(prev => ({
        ...prev,
        progress: {
          ...prev.progress,
          progress: 50,
          stage: "Checking domain information...",
        },
      }));

      // Stage 3: Analysis
      await simulateApiDelay(1500);
      setUrlAnalysis(prev => ({
        ...prev,
        progress: {
          ...prev.progress,
          progress: 75,
          stage: "Analyzing content...",
        },
      }));

      // Final stage: Complete
      await simulateApiDelay(1000);
      
      // Create a mock result with a unique ID
      const mockResult = getMockWebsiteAnalysis();
      mockResult.analysisId = uuidv4();
      mockResult.url = url;
      
      setUrlAnalysis({
        result: mockResult,
        progress: {
          isLoading: false,
          error: null,
          progress: 100,
          stage: "Analysis complete!",
        },
      });

      // Add to mock store for retrieval by ID
      setAnalysisStore(prev => [...prev, mockResult]);
      
      return mockResult;
    } catch (error) {
      setUrlAnalysis(prev => ({
        ...prev,
        progress: {
          isLoading: false,
          error: error instanceof Error ? error.message : "An unknown error occurred",
          progress: 0,
          stage: "Error",
        },
      }));
      return null;
    }
  };

  // Mock APK analysis with staged progress updates
  const analyzeApk = async (file: File): Promise<ApkAnalysisResult | null> => {
    try {
      setApkAnalysis(prev => ({
        ...prev,
        progress: {
          isLoading: true,
          error: null,
          progress: 0,
          stage: "Starting file analysis...",
        },
      }));

      // Stage 1: File upload
      await simulateApiDelay(1000);
      setApkAnalysis(prev => ({
        ...prev,
        progress: {
          ...prev.progress,
          progress: 25,
          stage: "Processing file...",
        },
      }));

      // Stage 2: Metadata extraction
      await simulateApiDelay(1500);
      setApkAnalysis(prev => ({
        ...prev,
        progress: {
          ...prev.progress,
          progress: 50,
          stage: "Extracting file metadata...",
        },
      }));

      // Stage 3: Analysis
      await simulateApiDelay(2000);
      setApkAnalysis(prev => ({
        ...prev,
        progress: {
          ...prev.progress,
          progress: 75,
          stage: "Analyzing content...",
        },
      }));

      // Final stage: Complete
      await simulateApiDelay(1000);
      
      // Create a mock result with a unique ID
      const mockResult = getMockApkAnalysis();
      mockResult.analysisId = uuidv4();
      mockResult.url = `file://${file.name}`;
      
      setApkAnalysis({
        result: mockResult,
        progress: {
          isLoading: false,
          error: null,
          progress: 100,
          stage: "Analysis complete!",
        },
      });

      // Add to mock store for retrieval by ID
      setAnalysisStore(prev => [...prev, mockResult]);
      
      return mockResult;
    } catch (error) {
      setApkAnalysis(prev => ({
        ...prev,
        progress: {
          isLoading: false,
          error: error instanceof Error ? error.message : "An unknown error occurred",
          progress: 0,
          stage: "Error",
        },
      }));
      return null;
    }
  };

  // Alias for analyzeApk for clarity in the code
  const analyzeFile = analyzeApk;

  // Get an analysis by ID from our mock store
  const getAnalysisById = async (id: string): Promise<AnalysisResult | null> => {
    await simulateApiDelay(500);
    
    // Check in our mock store
    const found = analysisStore.find(analysis => analysis.analysisId === id);
    
    if (found) {
      return found;
    }
    
    // If not found in store, create a mock result (for demo purposes)
    const mockResult = Math.random() > 0.5 ? getMockWebsiteAnalysis() : getMockApkAnalysis();
    mockResult.analysisId = id;
    
    // Add to store for future retrieval
    setAnalysisStore(prev => [...prev, mockResult]);
    
    return mockResult;
  };

  // Simulate feedback submission
  const submitFeedback = async (analysisId: string, feedback: boolean): Promise<void> => {
    await simulateApiDelay(800);
    
    // Update the analysis in our mock store
    setAnalysisStore(prev => 
      prev.map(analysis => 
        analysis.analysisId === analysisId 
          ? { ...analysis, feedbackGiven: true } 
          : analysis
      )
    );
    
    // Also update current analysis results if they match
    if (urlAnalysis.result?.analysisId === analysisId) {
      setUrlAnalysis(prev => ({
        ...prev,
        result: prev.result ? { ...prev.result, feedbackGiven: true } : null,
      }));
    }
    
    if (apkAnalysis.result?.analysisId === analysisId) {
      setApkAnalysis(prev => ({
        ...prev,
        result: prev.result ? { ...prev.result, feedbackGiven: true } : null,
      }));
    }
  };

  // Reset all analysis states
  const resetAnalysis = () => {
    setUrlAnalysis({
      result: null,
      progress: { ...initialProgress },
    });
    
    setApkAnalysis({
      result: null,
      progress: { ...initialProgress },
    });
  };

  return (
    <AnalysisContext.Provider
      value={{
        urlAnalysis,
        apkAnalysis,
        analyzeUrl,
        analyzeApk,
        analyzeFile,
        getAnalysisById,
        submitFeedback,
        resetAnalysis,
      }}
    >
      {children}
    </AnalysisContext.Provider>
  );
}

export function useAnalysisProgress() {
  const context = useContext(AnalysisContext);
  if (context === undefined) {
    throw new Error("useAnalysisProgress must be used within a AnalysisProgressProvider");
  }
  return context;
} 