import { Loader2Icon } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-4">
        <Loader2Icon size={40} className="text-primary animate-spin" />
        <p className="text-muted-foreground animate-pulse">Loading...</p>
      </div>
    </div>
  );
} 