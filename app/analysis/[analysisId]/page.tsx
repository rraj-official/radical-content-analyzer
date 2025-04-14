import { fetchAnalysis } from "@/app/actions/serverActions";
import AnalyzedResult from "@/components/AnalyzedResult";
import InputForm from "@/components/InputForm";
import { AnalysisResult } from "@/lib/interfaces";
import { AlertTriangleIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Analysis Results - SpotTheScam",
  description: "View detailed security analysis results for websites and apps",
};

export default async function AnalysisPage({
  params,
  searchParams,
}: {
  params: { analysisId: string };
  searchParams: { type?: string; target?: string };
}) {
  const result = await fetchAnalysis(params.analysisId);
  
  if (!result) {
    return (
      <div className="w-full flex flex-col items-center gap-12">
        <InputForm />
        <div className="w-full max-w-4xl p-8 rounded-xl border border-border/40 bg-card/50 backdrop-blur-sm flex flex-col items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="size-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangleIcon size={32} className="text-destructive" />
            </div>
            <div>
              <h3 className="text-xl font-semibold">Analysis Not Found</h3>
              <p className="text-muted-foreground mt-2 max-w-md">
                We couldn&apos;t find any analysis with the ID: {params.analysisId}. This could be because the analysis was deleted or the ID is incorrect.
              </p>
            </div>
            <Button asChild>
              <Link href="/">
                Return Home
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Pass through search params as query parameters
  const analysisType = searchParams.type;
  const targetName = searchParams.target;

  return (
    <div className="w-full flex flex-col items-center gap-12">
      <InputForm />
      <AnalyzedResult
        result={result as unknown as AnalysisResult}
        analysisId={params.analysisId}
      />
    </div>
  );
}
