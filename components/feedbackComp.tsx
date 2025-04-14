"use client";

import { recordFeedback } from "@/app/actions/serverActions";
import { Loader2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function FeedbackComp({
  analysisId,
  feedback,
  children,
}: {
  analysisId: string;
  feedback: boolean;
  children: React.ReactNode;
}) {
  const [isLoading, setIsLoading] = useState(false);
  return (
    <div
      className={`p-2 rounded-sm cursor-pointer hover:text-primary transition-all duration-300 ${isLoading ? "bg-secondary" : "hover:bg-secondary"}`}
      onClick={async () => {
        setIsLoading(true);
        const result = await recordFeedback(analysisId, feedback);
        if (result) {
          toast.success("Thank you for your feedback!");
        } else {
          toast.error("Failed to record feedback");
        }
        setIsLoading(false);
      }}
    >
      {isLoading ? <Loader2Icon size={16} className="animate-spin" /> : children}
    </div>
  );
}
