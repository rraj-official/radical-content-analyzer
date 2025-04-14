import { AlertCircleIcon, CheckCircleIcon, AlertTriangleIcon } from "lucide-react";

export default function ScoreCard({
  score,
  heading,
  reason,
  size,
}: {
  score: number;
  heading: string;
  reason: string;
  size: "small" | "big";
}) {
  // Determine score color and icon
  const getScoreDetails = (score: number) => {
    if (score > 66) {
      return {
        color: "#0cce6a",
        bgColor: "#0cce6a1A",
        icon: <CheckCircleIcon className="text-[#0cce6a]" size={size === "small" ? 16 : 20} />,
        label: "Good"
      };
    } else if (score > 33) {
      return {
        color: "#ffa400",
        bgColor: "#ffa4001A",
        icon: <AlertTriangleIcon className="text-[#ffa400]" size={size === "small" ? 16 : 20} />,
        label: "Warning"
      };
    } else {
      return {
        color: "#ff4e43",
        bgColor: "#ff4e431A",
        icon: <AlertCircleIcon className="text-[#ff4e43]" size={size === "small" ? 16 : 20} />,
        label: "Critical"
      };
    }
  };

  const scoreDetails = getScoreDetails(score);

  return (
    <div className="score-card p-4 rounded-xl bg-card hover:bg-card/80 transition-all duration-200 animate-fade-in border border-border/40">
      {size === "big" ? (
        // Big card layout - score and heading in one row, description below
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                {scoreDetails.icon}
                <h3 className="text-lg font-semibold">{heading}</h3>
              </div>
              <p className="text-sm text-muted-foreground">{reason}</p>
            </div>
            <div className="flex-shrink-0 ml-6">
              <div className="relative flex items-center justify-center size-16">
                <svg className="size-full -rotate-90">
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke="currentColor"
                    className="text-border"
                    strokeWidth="6"
                    fill="none"
                  />
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke={scoreDetails.color}
                    strokeWidth="6"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 28 * score / 100} ${2 * Math.PI * 28}`}
                    strokeLinecap="round"
                    className="drop-shadow-sm"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="font-bold text-lg" style={{ color: scoreDetails.color }}>
                    {score}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Small card layout - horizontal with clear hierarchy
        <div className="flex gap-4">
          <div className="flex-shrink-0">
            <div className="relative flex items-center justify-center size-12">
              <svg className="size-full -rotate-90">
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  stroke="currentColor"
                  className="text-border"
                  strokeWidth="6"
                  fill="none"
                />
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  stroke={scoreDetails.color}
                  strokeWidth="6"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 20 * score / 100} ${2 * Math.PI * 20}`}
                  strokeLinecap="round"
                  className="drop-shadow-sm"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-bold text-sm" style={{ color: scoreDetails.color }}>
                  {score}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              {scoreDetails.icon}
              <h3 className="font-semibold text-sm truncate">{heading}</h3>
            </div>
            <p className="text-xs text-muted-foreground">{reason}</p>
          </div>
        </div>
      )}
    </div>
  );
}
