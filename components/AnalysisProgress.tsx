import React from 'react';
import { motion } from 'framer-motion';
import { Loader2Icon, AlertTriangleIcon, XCircleIcon, CheckCircleIcon, FileWarningIcon } from 'lucide-react';
import { useAnalysisProgress } from '@/lib/contexts/AnalysisProgressContext';
import { ProcessSteps } from '@/components/ui/ProcessSteps';
import { ProgressIndicator } from '@/components/ui/ProgressIndicator';

export function AnalysisProgress() {
  const {
    isAnalyzing,
    analysisType,
    steps,
    currentStepId,
    progress,
    statusMessage,
    targetName,
  } = useAnalysisProgress();
  
  if (!isAnalyzing) {
    return null;
  }
  
  // Check if any steps have errors
  const hasErrors = steps.some(step => step.status === 'error');
  
  // Calculate progress status - relates to extraction status, not legitimacy
  const getProgressStatus = () => {
    if (progress === 100) return 'complete';
    if (hasErrors) return 'warning';
    return 'normal';
  };
  
  const progressStatus = getProgressStatus();
  
  // Get the appropriate icon based on progress status
  const getStatusIcon = () => {
    if (progressStatus === 'complete') return <CheckCircleIcon className="text-primary" size={18} />;
    if (progressStatus === 'warning') return <AlertTriangleIcon className="text-amber-500" size={18} />;
    return <Loader2Icon className="text-primary animate-spin" size={18} />;
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="w-full max-w-4xl p-6 rounded-xl border border-border/40 bg-card/50 backdrop-blur-sm"
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <motion.div 
                className={`size-8 rounded-full flex items-center justify-center ${
                  progressStatus === 'complete' ? 'bg-green-500/10' : 
                  progressStatus === 'warning' ? 'bg-amber-500/10' : 
                  'bg-primary/10'
                }`}
                animate={{
                  scale: [1, 1.1, 1],
                  rotate: progressStatus === 'normal' ? [0, 0] : [0, 5, -5, 0]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  repeatType: "loop",
                  ease: "easeInOut"
                }}
              >
                {getStatusIcon()}
              </motion.div>
              <h3 className="text-xl font-semibold">
                Analyzing {analysisType === 'website' ? 'Website' : 'APK'}
                {hasErrors && <span className="text-amber-500 ml-2 text-sm">(extraction issues)</span>}
              </h3>
            </div>
            <motion.span 
              className={`text-sm px-3 py-1 rounded-full font-medium ${
                progressStatus === 'complete' ? 'bg-green-500/10 text-green-500' : 
                progressStatus === 'warning' ? 'bg-amber-500/10 text-amber-500' : 
                'bg-primary/10 text-primary'
              }`}
              animate={{ 
                scale: progress === 100 ? [1, 1.1, 1] : 1,
              }}
              transition={{ 
                duration: 0.8, 
                repeat: progress === 100 ? 1 : 0 
              }}
            >
              {Math.round(progress)}% Complete
            </motion.span>
          </div>
          {targetName && (
            <p className="text-sm text-muted-foreground">
              {analysisType === 'website' ? 'URL' : 'File'}: <span className="font-medium">{targetName}</span>
            </p>
          )}
        </div>
        
        <ProgressIndicator 
          progress={progress} 
          label="Extraction Progress"
          barHeight={8}
          status={progressStatus}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left column - Process steps */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Extraction Steps</h4>
            <ProcessSteps steps={steps} currentStepId={currentStepId} />
          </div>
          
          {/* Right column - Current activity */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Current Activity</h4>
            <div className={`bg-accent/50 rounded-lg p-4 border ${
              progressStatus === 'complete' ? 'border-green-500/20' : 
              progressStatus === 'warning' ? 'border-amber-500/20' : 
              'border-border/40'
            } min-h-[200px] flex flex-col`}>
              <div className="flex items-center gap-2 mb-3">
                {currentStepId && steps.find(step => step.id === currentStepId)?.status === 'error' ? (
                  <>
                    <div className="size-5 rounded-full bg-destructive/20 flex items-center justify-center">
                      <XCircleIcon size={12} className="text-destructive" />
                    </div>
                    <h5 className="font-medium text-sm text-destructive">
                      {steps.find(step => step.id === currentStepId)?.name || 'Error in Extraction'}
                    </h5>
                  </>
                ) : progress === 100 ? (
                  <>
                    <div className="size-5 rounded-full bg-green-500/20 flex items-center justify-center">
                      <CheckCircleIcon size={12} className="text-green-500" />
                    </div>
                    <h5 className="font-medium text-sm text-green-500">
                      Data Extraction Complete
                    </h5>
                  </>
                ) : (
                  <>
                    <motion.div 
                      className="size-5 rounded-full bg-primary/20 flex items-center justify-center"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    >
                      <Loader2Icon size={12} className="text-primary" />
                    </motion.div>
                    <h5 className="font-medium text-sm">
                      {steps.find(step => step.id === currentStepId)?.name || 'Processing...'}
                    </h5>
                  </>
                )}
              </div>
              
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                {(currentStepId && steps.find(step => step.id === currentStepId)?.status === 'error' && 
                  steps.find(step => step.id === currentStepId)?.errorMessage) || 
                  statusMessage || 'Extracting data...'}
              </p>
              
              {/* Visual representation - animated pulses */}
              {progress < 100 && !hasErrors && (
                <div className="mt-auto flex items-center justify-center gap-3">
                  {[0, 1, 2, 3, 4].map(i => (
                    <motion.div
                      key={i}
                      className="size-2 rounded-full bg-primary/70"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ 
                        scale: [0, 1, 0], 
                        opacity: [0, 1, 0],
                      }}
                      transition={{
                        repeat: Infinity,
                        repeatType: "loop",
                        duration: 2,
                        delay: i * 0.2,
                        ease: "easeInOut",
                      }}
                    />
                  ))}
                </div>
              )}
              
              {/* Error visualization */}
              {hasErrors && (
                <div className="mt-auto">
                  <motion.div 
                    className="flex items-center justify-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                  >
                    <div className="p-3 bg-amber-500/10 rounded-full">
                      <FileWarningIcon size={24} className="text-amber-500" />
                    </div>
                  </motion.div>
                  <p className="text-center text-xs text-amber-500 mt-2">
                    Some data could not be extracted properly
                  </p>
                </div>
              )}
              
              {/* Completion celebration */}
              {progress === 100 && !hasErrors && (
                <div className="mt-auto">
                  <motion.div 
                    className="flex items-center justify-center"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ 
                      type: "spring", 
                      stiffness: 260, 
                      damping: 20 
                    }}
                  >
                    <div className="p-3 bg-green-500/10 rounded-full">
                      <CheckCircleIcon size={24} className="text-green-500" />
                    </div>
                  </motion.div>
                  <motion.p 
                    className="text-center text-xs text-green-500 mt-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    Data extraction completed successfully!
                  </motion.p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
} 