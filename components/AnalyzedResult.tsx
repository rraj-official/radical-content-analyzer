"use client";
import { useRef } from "react";
import ScoreCard from "@/components/ScoreCard";
import { AnalysisResult } from "@/lib/interfaces";
import Image from "next/image";
import FeedbackIcons from "@/components/feedbackIcons";
import { Button } from "@/components/ui/button";
import { FileTextIcon, ShieldIcon, AlertTriangleIcon, CheckCircleIcon } from "lucide-react";
import dynamic from "next/dynamic";
import { AnimatedCircularProgressBar } from "@/components/ui/AnimatedCircularProgressBar";

// Dynamically import framer-motion to avoid SSR issues
const MotionDiv = dynamic(
  () => import("framer-motion").then((mod) => mod.motion.div),
  { ssr: false }
);

export default function AnalyzedResult({
  result,
  analysisId,
}: {
  result: AnalysisResult;
  analysisId: string;
}) {
  const hasCompletedAnalysis = useRef(false);

  const handlePrintPDF = () => {
    // Generate filename from URL and date
    const generateFilename = (url: string) => {
      // Remove protocol and common prefixes
      let cleanUrl = url.replace(/(https?:\/\/)?(www\.)?/, '');
      // Replace special characters and spaces
      cleanUrl = cleanUrl.replace(/[^a-zA-Z0-9]/g, '-');
      // Add date stamp
      const date = new Date().toISOString().split('T')[0];
      return `SpotTheScam-analysis-${cleanUrl}-${date}.pdf`;
    };

    const printDiv = document.createElement('div');
    printDiv.className = 'print-container';
    
    // Set the filename for the PDF
    const filename = generateFilename(result.url);
    document.title = filename;

    // Enhanced header with better styling
    printDiv.innerHTML = `
      <div style="padding: 32px; border-bottom: 2px solid #eee;">
        <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 24px;">
          <img src="/images/logo.png" alt="Logo" style="height: 40px;" />
          <div style="height: 40px; width: 2px; background: #eee;"></div>
          <h1 style="margin: 0; color: #111827; font-size: 24px; font-weight: 600;">Analysis Report</h1>
        </div>
        <div style="display: flex; justify-content: space-between; color: #4B5563; font-size: 14px;">
          <span>Generated on ${new Date().toLocaleString()}</span>
          <span>Analysis ID: ${analysisId}</span>
        </div>
      </div>
    `;

    // Content wrapper with better spacing
    const contentDiv = document.createElement('div');
    contentDiv.style.cssText = 'padding: 32px; display: flex; flex-direction: column; gap: 32px;';
    
    // Target info section
    contentDiv.innerHTML += `
      <div style="background: #F9FAFB; border-radius: 12px; padding: 24px;">
        <h2 style="margin: 0 0 8px 0; color: #111827; font-size: 18px; font-weight: 500;">Analysis Target</h2>
        <p style="margin: 0; color: #4B5563; font-size: 16px;">${result.url}</p>
        <p style="margin: 8px 0 0 0; color: #6B7280; font-size: 14px;">Last analyzed: ${result.lastAnalyzedAt.toLocaleString()}</p>
      </div>
    `;

    // Screenshot section only for website analysis
    if (result.type === "website") {
      contentDiv.innerHTML += `
        <div style="display: flex; flex-direction: column; gap: 16px; align-items: center;">
          <h2 style="margin: 0; color: #111827; font-size: 18px; font-weight: 500; align-self: flex-start;">Screenshot</h2>
          <img src="${result.inputParameters.websiteScreenshot}" style="max-width: 100%; border-radius: 8px;" />
        </div>
      `;
    }

    // Score cards section with overall score at top
    const scoreCardsWrapper = document.createElement('div');
    // Only add page break if there was a screenshot (for website analysis)
    scoreCardsWrapper.style.cssText = `display: flex; flex-direction: column; gap: 24px; ${result.type === "website" ? "page-break-before: always;" : ""}`;
    scoreCardsWrapper.innerHTML = `
      <div style="margin-bottom: 24px;">
        <h2 style="margin: 0; color: #111827; font-size: 18px; font-weight: 500;">Analysis Results</h2>
        <p style="margin: 8px 0 0 0; color: #6B7280; font-size: 14px;">Detailed breakdown of security and quality factors</p>
      </div>
    `;
    
    const scores = document.querySelectorAll('.score-card');
    
    // Create grid container for score cards
    const gridContainer = document.createElement('div');
    gridContainer.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 16px;';
    
    scores.forEach((score, index) => {
      const clone = score.cloneNode(true);
      const wrapper = document.createElement('div');
      wrapper.style.cssText = 'background: white; border: 1px solid #E5E7EB; border-radius: 12px; padding: 16px;'; // Reduced padding
      
      // Make the clone content slightly smaller
      const cloneContent = clone as HTMLElement;
      cloneContent.style.transform = 'scale(0.9)';
      cloneContent.style.transformOrigin = 'top left';
      
      wrapper.appendChild(clone);
      
      // If it's the overall score (first score card)
      if (index === 0) {
        wrapper.style.gridColumn = '1 / -1'; // Span full width
        wrapper.style.padding = '24px'; // Keep original padding for overall score
      }
      
      gridContainer.appendChild(wrapper);
    });
    
    scoreCardsWrapper.appendChild(gridContainer);

    contentDiv.appendChild(scoreCardsWrapper);
    printDiv.appendChild(contentDiv);

    // Enhanced print styles
    const style = document.createElement('style');
    style.textContent = `
      @media print {
        @page {
          margin: 0;
          size: A4;
        }
        
        body * {
          visibility: hidden;
        }
        
        .print-container, .print-container * {
          visibility: visible;
        }
        
        .print-container {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
          background: white;
        }

        /* Force page break before analysis results */
        [style*="page-break-before: always"] {
          page-break-before: always;
        }

        .score-card {
          break-inside: avoid;
          page-break-inside: avoid;
        }

        /* Ensure text remains black in PDF */
        .print-container * {
          color-adjust: exact;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        /* Force background colors to show in PDF */
        .print-container [style*="background"] {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        /* Ensure grid layout works in PDF */
        [style*="grid"] {
          display: grid !important;
        }
      }
    `;

    // Add to document, print, then remove
    document.body.appendChild(style);
    document.body.appendChild(printDiv);
    
    window.print();

    // Restore the original document title
    setTimeout(() => {
      document.title = 'Security Analysis Report';
    }, 100);

    document.body.removeChild(style);
    document.body.removeChild(printDiv);
  };

  console.log("Result:", result);
  // Get the appropriate icon based on overall score
  const getScoreIcon = () => {
    const score = result.outputParameters.overallScore.score;
    if (score > 66) {
      return <CheckCircleIcon className="text-green-500" size={20} />;
    } else if (score > 33) {
      return <AlertTriangleIcon className="text-amber-500" size={20} />;
    } else {
      return <ShieldIcon className="text-red-500" size={20} />;
    }
  };

  return (
    <MotionDiv 
      className="w-full flex flex-col items-center gap-6 max-w-5xl"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      {/* Header card */}
      <MotionDiv 
        className="w-full p-4 rounded-xl border border-border/40 bg-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap justify-between items-center gap-2">
            <div className="flex items-center gap-2">
              {getScoreIcon()}
              <h1 className="text-xl font-semibold">Security Analysis</h1>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="text-sm">
                {new Date(result.lastAnalyzedAt).toLocaleDateString()}
              </span>
              {!result.feedbackGiven && <FeedbackIcons analysisId={analysisId} />}
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-1.5 hover:bg-primary/5 transition-colors duration-200"
                onClick={handlePrintPDF}
              >
                <FileTextIcon size={16} />
                Save PDF
              </Button>
            </div>
          </div>
          <div className="text-sm text-muted-foreground truncate">
            <span className="font-medium">Target:</span> {result.url}
          </div>
        </div>
      </MotionDiv>

      {/* Main content grid */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Media and overall score */}
        <MotionDiv 
          className={`${result.type === "website" ? "lg:col-span-2" : "lg:col-span-1"}`}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="rounded-xl border border-border/40 bg-card overflow-hidden">
            {/* Media section (screenshot or app icon) */}
            {result.type === "website" ? (
              <div className="relative aspect-video">
                <Image
                  src={result.inputParameters.websiteScreenshot}
                  alt="Website Screenshot"
                  fill
                  objectPosition="top"
                  className="object-cover"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <div className="text-white text-sm font-medium">Screenshot</div>
                </div>
              </div>
            ) : result.type === "app" ? (
              <div className="flex items-center justify-center p-8">
                <div className="relative w-32 h-32">
                  <Image
                    src={result.inputParameters.appDetails.icon}
                    alt="App Icon"
                    fill
                    className="rounded-xl shadow-md object-contain"
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center p-8">
                <div className="relative w-16 h-16">
                  <Image
                    src={result.inputParameters.appIcon || "/images/apk-file.png"}
                    alt="APK Icon"
                    fill
                    className="rounded-xl object-contain"
                  />
                </div>
              </div>
            )}
          </div>
        </MotionDiv>

        {/* Right column - Overall score */}
        <MotionDiv 
          className={`${result.type === "website" ? "lg:col-span-1" : "lg:col-span-2"}`}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <ScoreCard
            heading="Overall Score"
            score={result.outputParameters.overallScore.score}
            reason={result.outputParameters.overallScore.reason}
            size="big"
          />
        </MotionDiv>
      </div>

      {/* Detailed score cards */}
      <MotionDiv 
        className="w-full"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <h2 className="text-lg font-semibold mb-3">Detailed Analysis</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {result.type === "website" && (
            <>
              {Object.entries({
                ssl: result.outputParameters.sslScore,
                content: result.outputParameters.contentQualityScore,
                contact: result.outputParameters.contactDetailsScore,
                domain: result.outputParameters.domainScore,
                screenshot: result.outputParameters.screenshotScore,
              }).map(([key, scoreData], index) => (
                <MotionDiv
                  key={key}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.5 + (index * 0.1) }}
                >
                  <ScoreCard
                    heading={scoreData.heading}
                    score={scoreData.score}
                    reason={scoreData.reason}
                    size="small"
                  />
                </MotionDiv>
              ))}
            </>
          )}
          {result.type === "app" && (
            <>
              {Object.entries({
                reviews: result.outputParameters.reviewsScore,
                updates: result.outputParameters.updatesScore,
                installs: result.outputParameters.installsScore,
                developer: result.outputParameters.developerScore,
                description: result.outputParameters.descriptionScore,
                privacyPolicy: result.outputParameters.privacyPolicyScore,
              }).map(([key, scoreData], index) => (
                <MotionDiv
                  key={key}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.5 + (index * 0.1) }}
                >
                  <ScoreCard
                    heading={scoreData.heading}
                    score={scoreData.score}
                    reason={scoreData.reason}
                    size="small"
                  />
                </MotionDiv>
              ))}
            </>
          )}
          {result.type === "apk" && (
            <>
              {Object.entries({
                appName: result.outputParameters.appNameScore,
                permissions: result.outputParameters.permissionsScore,
                certificate: result.outputParameters.certificateScore,
                versionName: result.outputParameters.versionNameScore,
                minSdkVersion: result.outputParameters.minSdkVersionScore,
                targetSdkVersion: result.outputParameters.targetSdkVersionScore,
              }).map(([key, scoreData], index) => (
                <MotionDiv
                  key={key}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.5 + (index * 0.1) }}
                >
                  <ScoreCard
                    heading={scoreData.heading}
                    score={scoreData.score}
                    reason={scoreData.reason}
                    size="small"
                  />
                </MotionDiv>
              ))}
            </>
          )}
        </div>
      </MotionDiv>
    </MotionDiv>
  );
}
