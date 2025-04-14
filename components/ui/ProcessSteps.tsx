import React from "react";
import { cn } from "@/lib/utils";
import { CheckIcon, Loader2Icon, FileWarningIcon, AlertTriangleIcon } from "lucide-react";

export interface Step {
  id: string;
  name: string;
  description: string;
  status: "pending" | "processing" | "complete" | "error";
  errorMessage?: string;
}

interface ProcessStepsProps {
  steps: Step[];
  currentStepId: string | null;
}

export function ProcessSteps({ steps, currentStepId }: ProcessStepsProps) {
  return (
    <div className="space-y-3">
      {steps.map((step, index) => {
        const isCurrent = step.id === currentStepId;
        const isComplete = step.status === "complete";
        const isProcessing = step.status === "processing";
        const isPending = step.status === "pending";
        const isError = step.status === "error";
        
        return (
          <div 
            key={step.id}
            className={cn(
              "flex items-start gap-3 p-3 rounded-lg transition-all duration-300 animate-in fade-in",
              isCurrent && "bg-accent/50 border border-accent",
              isComplete && "bg-primary/5",
              isError && "bg-amber-500/5",
              isPending && "opacity-60"
            )}
            style={{ 
              animationDelay: `${index * 150}ms`,
              animationFillMode: "backwards" 
            }}
          >
            <div className="flex-shrink-0 mt-0.5">
              <div className={cn(
                "size-6 rounded-full flex items-center justify-center",
                isComplete ? "bg-primary/20" : 
                isProcessing ? "bg-primary/10" : 
                isError ? "bg-amber-500/20" : 
                "bg-muted"
              )}>
                {isComplete && (
                  <CheckIcon size={14} className="text-primary" />
                )}
                {isProcessing && (
                  <Loader2Icon size={14} className="text-primary animate-spin" />
                )}
                {isPending && (
                  <span className="size-1.5 rounded-full bg-muted-foreground/50" />
                )}
                {isError && (
                  <FileWarningIcon size={14} className="text-amber-500" />
                )}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className={cn(
                "text-sm font-medium truncate",
                isComplete && "text-primary",
                isProcessing && "text-foreground",
                isError && "text-amber-500"
              )}>
                {step.name}
                {isError && " (Partial)"}
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                {isError && step.errorMessage ? (
                  <span className="text-amber-500/90">{step.errorMessage}</span>
                ) : (
                  step.description
                )}
              </p>
              {isError && !step.errorMessage && (
                <div className="flex items-center gap-1 mt-1">
                  <AlertTriangleIcon size={12} className="text-amber-500/80" />
                  <span className="text-xs text-amber-500/80">Extraction incomplete</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
} 