"use client";
import { Loader2Icon } from "lucide-react";
import InputForm from "@/components/InputForm";

export default function AnalysisLoading() {
  return (
    <div className="w-full flex flex-col items-center gap-12">
      <InputForm />
      
      {/* Simple loading state */}
      <div className="w-full max-w-4xl p-8 rounded-xl border border-border/40 bg-card/50 backdrop-blur-sm flex flex-col items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Loader2Icon size={32} className="text-primary animate-spin" />
            </div>
          </div>
          <div className="text-center">
            <h3 className="text-xl font-semibold">Analyzing...</h3>
            <p className="text-muted-foreground mt-2">
              We&apos;re processing your request. This may take a few moments.
            </p>
          </div>
          
          {/* Skeleton loading UI */}
          <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
            {[...Array(4)].map((_, i) => (
              <div 
                key={i}
                className="h-32 rounded-xl bg-gradient-to-r from-card/80 to-card/40 animate-pulse"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
