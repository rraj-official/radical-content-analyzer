import React from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface ProgressIndicatorProps {
  progress: number;
  label?: string;
  showPercentage?: boolean;
  className?: string;
  barColor?: string;
  barHeight?: number;
  status?: 'normal' | 'warning' | 'complete' | 'error';
}

const ProgressIndicator = ({
  progress,
  label,
  showPercentage = true,
  className,
  barColor,
  barHeight = 8,
  status = 'normal',
}: ProgressIndicatorProps) => {
  // Ensure progress is between 0 and 100
  const clampedProgress = Math.min(Math.max(0, progress), 100);
  
  // Choose the appropriate color based on status
  const getBarColor = () => {
    if (!barColor) {
      switch (status) {
        case 'complete':
          return 'bg-green-500';
        case 'warning':
          return 'bg-amber-500';
        case 'error':
          return 'bg-destructive';
        default:
          return 'bg-primary';
      }
    }
    return barColor;
  };
  
  return (
    <div className={cn("w-full", className)}>
      {label && (
        <div className="flex justify-between text-sm mb-1.5">
          <span className="text-muted-foreground font-medium">{label}</span>
          {showPercentage && (
            <span className={cn(
              "font-medium",
              status === 'complete' && "text-green-500",
              status === 'warning' && "text-amber-500",
              status === 'error' && "text-destructive"
            )}>
              {Math.round(clampedProgress)}%
            </span>
          )}
        </div>
      )}
      <div 
        className={cn(
          "w-full bg-accent overflow-hidden rounded-full relative",
        )}
        style={{ height: `${barHeight}px` }}
      >
        {/* Base progress bar */}
        <motion.div 
          className={cn("h-full rounded-full", getBarColor())}
          initial={{ width: 0 }}
          animate={{ width: `${clampedProgress}%` }}
          transition={{ 
            duration: 0.6, 
            ease: "easeOut",
          }}
        >
          {/* Shimmer effect for active progress bars */}
          {progress < 100 && status !== 'error' && (
            <motion.div 
              className="absolute inset-0 w-full h-full"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                backgroundSize: '200% 100%',
              }}
              animate={{
                backgroundPosition: ['0% 0%', '200% 0%'],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "linear"
              }}
            />
          )}
          
          {/* Pulsing dot at the end of bar for active progress */}
          {progress < 100 && progress > 0 && status !== 'error' && (
            <motion.div 
              className="absolute top-0 h-full aspect-square rounded-full bg-white/80"
              style={{ 
                right: 0,
                transform: 'translateX(50%)',
              }}
              animate={{ 
                scale: [0.8, 1.2, 0.8],
                opacity: [0.6, 0.9, 0.6], 
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          )}
          
          {/* Success pulse for completed progress */}
          {progress === 100 && status === 'complete' && (
            <motion.div
              className="absolute inset-0 rounded-full bg-white/30"
              initial={{ opacity: 0 }}
              animate={{
                opacity: [0, 0.3, 0],
                scale: [0.85, 1.05, 1],
              }}
              transition={{
                duration: 1.2,
                repeat: 2,
                ease: "easeInOut",
              }}
            />
          )}
        </motion.div>
      </div>
    </div>
  );
};

export { ProgressIndicator }; 