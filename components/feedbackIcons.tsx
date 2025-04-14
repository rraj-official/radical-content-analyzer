import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ThumbsDownIcon, ThumbsUpIcon } from "lucide-react";
import FeedbackComp from "@/components/feedbackComp";

export default function FeedbackIcons({ analysisId }: { analysisId: string }) {
  return (
    <div className="flex items-center gap-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="transform hover:scale-110 active:scale-95 transition-transform duration-150">
            <FeedbackComp analysisId={analysisId} feedback={true}>
              <div className="p-1.5 rounded-full hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors duration-150">
                <ThumbsUpIcon size={16} className="text-green-600 dark:text-green-400" />
              </div>
            </FeedbackComp>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>This analysis was helpful</p>
        </TooltipContent>
      </Tooltip>
      
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="transform hover:scale-110 active:scale-95 transition-transform duration-150">
            <FeedbackComp analysisId={analysisId} feedback={false}>
              <div className="p-1.5 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors duration-150">
                <ThumbsDownIcon size={16} className="text-red-600 dark:text-red-400" />
              </div>
            </FeedbackComp>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>This analysis needs improvement</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
