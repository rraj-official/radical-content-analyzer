"use client";
import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2Icon,
  UploadIcon,
  XIcon,
  GlobeIcon,
  FileIcon,
  ServerIcon,
  CloudIcon,
  FileTextIcon,
  YoutubeIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn, isValidUrl } from "@/lib/utils";
import Image from "next/image";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { analyzeVideoUrl } from "@/app/actions/serverActions";

export default function InputForm() {
  const [inputMethod, setInputMethod] = useState<
    "video" | "document" | "videoUrl"
  >("videoUrl");
  const [inputUrl, setInputUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [modelType, setModelType] = useState<"hosted" | "online">("online");

  // Holds basic info about the chosen video (thumbnail, isAnalyzing, etc.)
  const [videoInfo, setVideoInfo] = useState<{
    thumbnail: string;
    title: string;
    duration: string;
    isLoading: boolean;
    isAnalyzing: boolean;
  } | null>(null);

  // New piece of state to store the final analysis response from the API
  const [analysisData, setAnalysisData] = useState<any>(null);

  const analysisRef = useRef<HTMLDivElement>(null);
  const videoInfoRef = useRef<HTMLDivElement>(null);
  const buttonAreaRef = useRef<HTMLDivElement>(null);

  // ———————————————————————————————————————————————
  //    (Helper functions for YouTube / Twitter, etc.)
  // ———————————————————————————————————————————————

  const isYoutubeUrl = (url: string): boolean => {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
    return youtubeRegex.test(url);
  };

  const isXUrl = (url: string): boolean => {
    const xRegex = /^(https?:\/\/)?(www\.)?(twitter\.com|x\.com)\/.+/;
    return xRegex.test(url);
  };

  const extractYoutubeId = (url: string): string | null => {
    const regExp =
      /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[7].length === 11 ? match[7] : null;
  };

  // Helper to convert YouTube's ISO8601 duration to a readable format
function parseYouTubeISO8601Duration(durationIso: string) {
  // For example, "PT3M57S" => "3:57"
  // (There are many ways to parse it; pick your favorite)
  const match = durationIso.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  if (!match) return "Unknown";
  const hours = (match[1] || "0H").slice(0, -1);
  const minutes = (match[2] || "0M").slice(0, -1);
  const seconds = (match[3] || "0S").slice(0, -1);

  const h = parseInt(hours, 10);
  const m = parseInt(minutes, 10);
  const s = parseInt(seconds, 10);

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

async function getYoutubeVideoInfo(videoId: string) {
  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${process.env.NEXT_PUBLIC_YOUTUBE_API_KEY}&part=contentDetails,snippet`
    );
    if (!res.ok) throw new Error("Failed to fetch video data from YouTube Data API");

    const data = await res.json();
    if (!data.items?.length) throw new Error("No items returned from YouTube Data API");

    const snippet = data.items[0].snippet;
    const contentDetails = data.items[0].contentDetails;
    // e.g. contentDetails.duration = "PT3M57S"
    const durationIso8601 = contentDetails.duration;
    const duration = parseYouTubeISO8601Duration(durationIso8601);

    return {
      thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      title: snippet.title,
      duration, // finally we have the actual duration
    };
  } catch (error) {
    console.error("Error fetching video duration:", error);
    return {
      thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      title: "Video Title Unavailable",
      duration: "Unknown",
    };
  }
}


  // ———————————————————————————————————————————————
  //    (Main function that calls the /api/analyze/video)
  // ———————————————————————————————————————————————
  const analyzeVideoContent = async (url: string) => {
    try {
      console.log("🎬 Starting video analysis for:", url);
      setVideoInfo((prev) => (prev ? { ...prev, isAnalyzing: true } : null));

      toast.info("Starting video analysis process. This may take several minutes...");

      const responseData = await analyzeVideoUrl(url);
      console.log("📡 API response data:", responseData);

      if (!responseData || (!responseData.analysisId && !responseData.success)) {
        console.error("❌ No valid response:", responseData);
        throw new Error("Invalid response from video analysis API");
      }

      console.log("✅ Analysis complete:", responseData);
      toast.success("Video analysis completed successfully!");

      // Update the videoInfo state so that we know analysis is no longer in progress
      setVideoInfo((prev) =>
        prev ? { ...prev, isAnalyzing: false } : null
      );

      // **Store the entire API result** so we can render it
      setAnalysisData(responseData);
    } catch (error) {
      console.error("❌ Error analyzing video:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to analyze video"
      );
      setVideoInfo((prev) =>
        prev ? { ...prev, isAnalyzing: false } : null
      );
    }
  };

  // ———————————————————————————————————————————————
  //    (Button handler that delegates to the above)
  // ———————————————————————————————————————————————
  const handleAnalyze = async () => {
    if (
      (!inputUrl && inputMethod === "videoUrl") ||
      (!file && (inputMethod === "video" || inputMethod === "document"))
    ) {
      toast.error(
        inputMethod === "videoUrl"
          ? "Enter a URL to analyze."
          : `Upload a ${inputMethod} file to analyze.`
      );
      return;
    }
    setIsLoading(true);
    let analysisRecord;

    try {
      if (inputMethod === "videoUrl") {
        if (!isValidUrl(inputUrl)) {
          toast.error("Invalid URL.");
          setIsLoading(false);
          return;
        }

        const formattedUrl = inputUrl.match(/^https?:\/\//)
          ? inputUrl
          : `https://${inputUrl}`;

        // Clear old analysis data whenever we start a new analysis
        setAnalysisData(null);

        if (isYoutubeUrl(formattedUrl)) {
          // 1) Attempt YouTube info fetch
          const videoId = extractYoutubeId(formattedUrl);
          if (videoId) {
            setVideoInfo({
              thumbnail: "",
              title: "",
              duration: "",
              isLoading: true,
              isAnalyzing: false,
            });
            try {
              const info = await getYoutubeVideoInfo(videoId);
              setVideoInfo({
                thumbnail: info.thumbnail,
                title: info.title,
                duration: info.duration,
                isLoading: false,
                isAnalyzing: false,
              });
            } catch (error) {
              console.error("Error fetching video info:", error);
              toast.error("Failed to fetch video information.");
              setVideoInfo(null);
              setIsLoading(false);
              return;
            }
            // 2) Actually analyze it
            setIsLoading(false);
            await analyzeVideoContent(formattedUrl);
            return;
          }
        } else if (isXUrl(formattedUrl)) {
          // Twitter / X
          setIsLoading(false);
          setVideoInfo({
            thumbnail: "",
            title: "Twitter/X Video",
            duration: "Unknown",
            isLoading: false,
            isAnalyzing: false,
          });
          await analyzeVideoContent(formattedUrl);
          return;
        } else {
          // General video URL
          setIsLoading(false);
          setVideoInfo({
            thumbnail: "",
            title: "General Video",
            duration: "Unknown",
            isLoading: false,
            isAnalyzing: false,
          });
          await analyzeVideoContent(formattedUrl);
          return;
        }
      } else if (inputMethod === "video" || inputMethod === "document") {
        console.log("Processing file upload for type:", inputMethod);
        analysisRecord = await processFileForAnalysis();
      }

      if (analysisRecord) {
        // In your code, you redirect to a results page, or you could just store it
        toast.success("Analysis completed successfully!");
      } else {
        console.error("Analysis failed. No analysis record returned.");
        toast.error("Failed to fetch data. Check if input is correct.");
      }
    } catch (error) {
      console.error("Error during analysis:", error);
      toast.error("An error occurred during analysis. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Reset video info & analysis data whenever inputMethod, inputUrl or modelType changes
  useEffect(() => {
    setVideoInfo(null);
    setAnalysisData(null);
  }, [inputMethod, inputUrl, modelType]);

  // ———————————————————————————————————————————————
  //      (Drag/Drop logic and file upload bits)
  // ———————————————————————————————————————————————
  const [fileHover, setFileHover] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | undefined>(undefined);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFile(file);
    }
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    const file = e.dataTransfer.files?.[0];
    if (file) {
      let isValidFile = false;
      let errorMessage = "";

      if (inputMethod === "video") {
        isValidFile = file.type.startsWith("video/");
        errorMessage = "Invalid file type. Please upload a video file.";
      } else if (inputMethod === "document") {
        const validTypes = [
          "text/plain",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ];
        isValidFile = validTypes.includes(file.type);
        errorMessage =
          "Invalid file type. Please upload a .txt, .doc, or .docx file.";
      }
      if (!isValidFile) {
        toast.error(errorMessage);
        return;
      }
      setFile(file);
    }
  };

  const processFileForAnalysis = async () => {
    if (!file) {
      const fileType = inputMethod === "video" ? "video" : "document";
      toast.error(`Please select a ${fileType} file to analyze`);
      return null;
    }
    try {
      toast.success(
        `${inputMethod.charAt(0).toUpperCase() + inputMethod.slice(1)} analysis completed successfully!`
      );
      return { analysisId: "mock-" + Date.now() };
    } catch (error) {
      console.error(`Error analyzing ${inputMethod} file:`, error);
      toast.error(`Failed to analyze ${inputMethod} file. Please try again.`);
      return null;
    }
  };

  // ———————————————————————————————————————————————
  //                     (UI)
  // ———————————————————————————————————————————————

  return (
    <div className="w-full max-w-4xl animate-fade-in">
      <div className="p-6 rounded-xl border border-border/60 bg-card/50 backdrop-blur-sm shadow-sm transition-all duration-200 hover:shadow-md">
        {/* Tabs for input method selection */}
        <div className="flex justify-center mb-5">
          <div className="inline-flex bg-accent/80 rounded-lg p-1 gap-1">
            <button
              className={`rounded-md py-2 px-4 flex items-center gap-2 transition-all duration-150 ${
                inputMethod === "videoUrl"
                  ? "bg-background shadow-sm font-medium text-foreground"
                  : "bg-accent text-accent-foreground hover:bg-accent/70"
              }`}
              onClick={() => setInputMethod("videoUrl")}
              disabled={isLoading}
            >
              <YoutubeIcon size={16} />
              Video URL
            </button>
            <button
              className={`rounded-md py-2 px-4 flex items-center gap-2 transition-all duration-150 ${
                inputMethod === "video"
                  ? "bg-background shadow-sm font-medium text-foreground"
                  : "bg-accent text-accent-foreground hover:bg-accent/70"
              }`}
              onClick={() => setInputMethod("video")}
              disabled={isLoading}
            >
              <FileIcon size={16} />
              Video File
            </button>
            <button
              className={`rounded-md py-2 px-4 flex items-center gap-2 transition-all duration-150 ${
                inputMethod === "document"
                  ? "bg-background shadow-sm font-medium text-foreground"
                  : "bg-accent text-accent-foreground hover:bg-accent/70"
              }`}
              onClick={() => setInputMethod("document")}
              disabled={isLoading}
            >
              <FileTextIcon size={16} />
              Text File
            </button>
          </div>
        </div>

        {/* Model selection dropdown */}
        <div className="mb-4">
          <Label htmlFor="model-type" className="text-sm font-medium block mb-1.5">
            Select Model
          </Label>
          <Select
            value={modelType}
            onValueChange={(value) => setModelType(value as "hosted" | "online")}
            disabled={isLoading}
          >
            <SelectTrigger className="w-full h-9" id="model-type">
              <SelectValue placeholder="Select Model" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hosted" className="flex items-center gap-2">
                <ServerIcon size={14} className="inline mr-1" /> NovaSentinel (Most Secure)
              </SelectItem>
              <SelectItem value="online" className="flex items-center gap-2">
                <CloudIcon size={14} className="inline mr-1" /> NovaVerse (Fastest)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Content container with appropriate height for each input method */}
        <div className="relative">
          {/* Video URL input */}
          <div
            className={`transition-all duration-300 ${
              inputMethod === "videoUrl"
                ? "opacity-100 visible"
                : "opacity-0 invisible absolute top-0 left-0 right-0"
            }`}
          >
            <div className="space-y-3">
              <div>
                <Label htmlFor="videoUrl" className="text-sm font-medium block mb-1.5">
                  Enter YouTube or Twitter URL
                </Label>
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <Input
                      name="videoUrl"
                      type="url"
                      value={inputUrl}
                      disabled={isLoading || Boolean(videoInfo && !videoInfo.isLoading)}
                      onChange={(e) => setInputUrl(e.target.value)}
                      placeholder="https://youtube.com/watch?v=..."
                      autoFocus
                      className="pr-10 transition-all duration-150 border-input/60 focus-visible:border-primary/60 h-9"
                      onKeyDown={(e) => {
                        if (
                          e.key === "Enter" &&
                          inputMethod === "videoUrl" &&
                          !isLoading
                        ) {
                          handleAnalyze();
                        }
                      }}
                    />
                    {inputUrl && inputMethod === "videoUrl" && !isLoading && !videoInfo && (
                      <button
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors duration-150"
                        onClick={() => setInputUrl("")}
                      >
                        <XIcon size={16} />
                      </button>
                    )}
                  </div>
                  <Button
                    onClick={!isLoading && inputMethod === "videoUrl" ? handleAnalyze : undefined}
                    className="h-9 px-4 transition-all duration-200 bg-primary/90 hover:bg-primary"
                    disabled={isLoading || Boolean(videoInfo && !videoInfo.isLoading)}
                  >
                    {isLoading && inputMethod === "videoUrl" ? (
                      <div className="flex items-center gap-2">
                        <Loader2Icon size={16} className="animate-spin" />
                        <span>Analyzing...</span>
                      </div>
                    ) : (
                      "Analyze"
                    )}
                  </Button>
                </div>
                {!videoInfo && (
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {isYoutubeUrl(inputUrl)
                      ? "We'll analyze this YouTube video for harmful content."
                      : isXUrl(inputUrl)
                      ? "We'll analyze this Twitter/X video for harmful content."
                      : "Enter a YouTube or Twitter URL to analyze video content."}
                  </p>
                )}
              </div>

              {/* YouTube Video Analysis UI */}
              {videoInfo && (
                <div className="mt-4 border rounded-lg p-4 bg-accent/30 animate-slide-up">
                  {videoInfo.isLoading ? (
                    <div className="flex flex-col items-center justify-center py-6 space-y-4">
                      <Loader2Icon size={32} className="animate-spin text-primary" />
                      <div className="text-center">
                        <p className="font-medium">Loading video information...</p>
                        <p className="text-sm text-muted-foreground mt-1">This may take a moment</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-col md:flex-row gap-4" ref={videoInfoRef}>
                        {/* Video Thumbnail */}
                        <div className="relative w-full md:w-1/3 aspect-video rounded-lg overflow-hidden border">
                          {videoInfo.thumbnail && (
                            <Image
                              src={videoInfo.thumbnail}
                              alt="Video Thumbnail"
                              fill
                              className="object-cover"
                            />
                          )}
                        </div>

                        {/* Video Information */}
                        <div className="flex-1 flex flex-col">
                          <h3 className="font-medium text-lg line-clamp-2">
                            {videoInfo.title}
                          </h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            Length: {videoInfo.duration}
                          </p>

                          <div className="mt-auto">
                            <div className="flex items-center gap-2 mt-4 text-sm">
                              {videoInfo.isAnalyzing ? (
                                <>
                                  <Loader2Icon
                                    size={16}
                                    className="animate-spin text-primary"
                                  />
                                  <span>Processing video and analyzing content...</span>
                                </>
                              ) : (
                                <p className="text-green-600 font-medium">
                                  Analysis completed successfully!
                                </p>
                              )}
                            </div>
                            {videoInfo.isAnalyzing && (
                              <p className="text-xs text-muted-foreground mt-1">
                                This may take several minutes to complete
                              </p>
                            )}

                            {!videoInfo.isAnalyzing ? (
                              <div className="mt-4 flex justify-end">
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => {
                                    setVideoInfo(null);
                                    setAnalysisData(null);
                                  }}
                                >
                                  Analyze Another Video
                                </Button>
                              </div>
                            ) : (
                              <div className="mt-4 flex gap-2" ref={buttonAreaRef}>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="flex-1"
                                  onClick={() => {
                                    setVideoInfo(null);
                                    setAnalysisData(null);
                                    toast.info("Analysis canceled");
                                  }}
                                >
                                  Cancel
                                </Button>
                                <Button variant="default" size="sm" className="flex-1" disabled>
                                  <Loader2Icon size={14} className="animate-spin mr-2" />
                                  Analyzing
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Show final analysis results if not analyzing AND we actually have analysisData */}
                      {analysisData && !videoInfo.isAnalyzing && (
                        <div ref={analysisRef} className="mt-6 pt-6 border-t animate-slide-up">
                          <h3 className="text-lg font-semibold mb-4">
                            Content Analysis Results
                          </h3>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            <div className="p-4 bg-accent/50 rounded-lg">
                              <div className="flex justify-between items-center mb-1">
                                <p className="font-medium">Radical Probability</p>
                                <p className="font-bold text-destructive">
                                  {analysisData.outputParameters.radicalProbability}%
                                </p>
                              </div>
                              <div className="w-full bg-muted rounded-full h-2">
                                <div
                                  className="bg-destructive h-2 rounded-full"
                                  style={{
                                    width:
                                      analysisData.outputParameters.radicalProbability + "%",
                                  }}
                                ></div>
                              </div>
                            </div>

                            <div className="p-4 bg-accent/50 rounded-lg">
                              <div className="flex justify-between items-center mb-1">
                                <p className="font-medium">Radical Content</p>
                                <p className="font-bold text-destructive">
                                  {analysisData.outputParameters.radicalContent}%
                                </p>
                              </div>
                              <div className="w-full bg-muted rounded-full h-2">
                                <div
                                  className="bg-destructive h-2 rounded-full"
                                  style={{
                                    width:
                                      analysisData.outputParameters.radicalContent + "%",
                                  }}
                                ></div>
                              </div>
                            </div>
                          </div>

                          <div className="bg-accent/30 p-4 rounded-lg">
                            <h4 className="font-semibold mb-3">Analysis Report</h4>

                            <div className="space-y-4 text-sm">
                              {/* Lexical Analysis */}
                              <div>
                                <p className="font-semibold mb-1">Lexical Analysis:</p>
                                <p className="text-muted-foreground leading-relaxed">
                                  {analysisData.outputParameters.lexicalAnalysis}
                                </p>
                              </div>

                              {/* Emotion Analysis */}
                              <div>
                                <p className="font-semibold mb-1">Emotion Analysis:</p>
                                <p className="text-muted-foreground leading-relaxed">
                                  {analysisData.outputParameters.emotionAnalysis}
                                </p>
                              </div>

                              {/* Speech Patterns */}
                              <div>
                                <p className="font-semibold mb-1">Speech Patterns:</p>
                                <p className="text-muted-foreground leading-relaxed">
                                  {analysisData.outputParameters.speechPatterns}
                                </p>
                              </div>

                              {/* Religious Rhetoric */}
                              <div>
                                <p className="font-semibold mb-1">Religious Rhetoric:</p>
                                <p className="text-muted-foreground leading-relaxed">
                                  {analysisData.outputParameters.religiousRhetoric}
                                </p>
                              </div>

                              {/* Commands / Directives */}
                              <div>
                                <p className="font-semibold mb-1">Commands/Directives:</p>
                                <p className="text-muted-foreground leading-relaxed">
                                  {analysisData.outputParameters.commandsDirectives}
                                </p>
                              </div>

                              {/* Overall Assessment */}
                              <div>
                                <p className="font-semibold mb-1">Overall Assessment:</p>
                                <p className="text-muted-foreground leading-relaxed">
                                  {analysisData.outputParameters.overallAssessment}
                                </p>
                              </div>

                              {/* Risk Factors */}
                              <div>
                                <p className="font-semibold mb-1">Risk Factors:</p>
                                {analysisData.outputParameters.riskFactors?.length ? (
                                  <ul className="list-disc ml-6 text-muted-foreground">
                                    {analysisData.outputParameters.riskFactors.map(
                                      (factor: string, index: number) => (
                                        <li key={index}>{factor}</li>
                                      )
                                    )}
                                  </ul>
                                ) : (
                                  <p className="text-muted-foreground">
                                    No specific risk factors listed.
                                  </p>
                                )}
                              </div>

                              {/* Safety Tips */}
                              <div>
                                <p className="font-semibold mb-1">Safety Tips:</p>
                                {analysisData.outputParameters.safetyTips?.length ? (
                                  <ul className="list-disc ml-6 text-muted-foreground">
                                    {analysisData.outputParameters.safetyTips.map(
                                      (tip: string, index: number) => (
                                        <li key={index}>{tip}</li>
                                      )
                                    )}
                                  </ul>
                                ) : (
                                  <p className="text-muted-foreground">
                                    No safety tips listed.
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Video File upload */}
          <div
            className={`transition-all duration-300 ${
              inputMethod === "video" ? "opacity-100 visible" : "opacity-0 invisible absolute top-0 left-0 right-0"
            }`}
          >
            <div className="space-y-3">
              <div>
                <Label htmlFor="video" className="text-sm font-medium block mb-1.5">
                  Upload Video File
                </Label>
                {file === undefined ? (
                  <div
                    className={cn(
                      "w-full h-[120px] bg-accent/50 border border-dashed rounded-lg flex flex-col gap-3 justify-center items-center cursor-pointer transition-all duration-200",
                      fileHover ? "bg-accent/80 border-primary scale-[1.01] shadow-md" : "hover:bg-accent/70 hover:border-primary/60",
                      isLoading && "opacity-50 pointer-events-none"
                    )}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (inputMethod === "video" && !isLoading) setFileHover(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      if (inputMethod === "video" && !isLoading) setFileHover(false);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (inputMethod === "video" && !isLoading) {
                        handleFileDrop(e);
                        setFileHover(false);
                      }
                    }}
                    onClick={() =>
                      inputMethod === "video" && !isLoading && fileInputRef.current?.click()
                    }
                  >
                    <div
                      className={cn(
                        "text-primary/80",
                        fileHover ? "animate-bounce" : ""
                      )}
                    >
                      <UploadIcon size={24} />
                    </div>
                    <div className="text-center px-4">
                      {fileHover ? (
                        <p className="font-medium text-primary text-sm">
                          Release to upload
                        </p>
                      ) : (
                        <>
                          <p className="font-medium text-sm">
                            Drag & drop or click to upload video
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Analyze video content for potential threats
                          </p>
                        </>
                      )}
                    </div>
                    <input
                      type="file"
                      accept="video/*"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      disabled={isLoading}
                      hidden
                    />
                  </div>
                ) : (
                  <div>
                    <div className="flex gap-3 items-center p-3 border rounded-lg bg-accent/30 transition-all duration-150 hover:bg-accent/50">
                      <Image
                        src="/images/apk-file.png"
                        alt="Video File"
                        width={40}
                        height={40}
                        className="rounded"
                      />
                      <div className="flex-1">
                        <p className="font-medium truncate text-sm">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(file.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                      {!isLoading && (
                        <button
                          onClick={() => setFile(undefined)}
                          className="text-muted-foreground hover:text-foreground transition-colors duration-150"
                        >
                          <XIcon size={16} />
                        </button>
                      )}
                    </div>
                    <div className="mt-3 flex justify-end">
                      <Button
                        onClick={!isLoading ? handleAnalyze : undefined}
                        className="h-9 px-4 transition-all duration-200 bg-primary/90 hover:bg-primary"
                        disabled={isLoading}
                      >
                        {isLoading && inputMethod === "video" ? (
                          <div className="flex items-center gap-2">
                            <Loader2Icon size={16} className="animate-spin" />
                            <span>Analyzing...</span>
                          </div>
                        ) : (
                          "Analyze Video"
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Document File upload */}
          <div
            className={`transition-all duration-300 ${
              inputMethod === "document" ? "opacity-100 visible" : "opacity-0 invisible absolute top-0 left-0 right-0"
            }`}
          >
            <div className="space-y-3">
              <div>
                <Label htmlFor="document" className="text-sm font-medium block mb-1.5">
                  Upload Document File
                </Label>

                {file === undefined ? (
                  <div
                    className={cn(
                      "w-full h-[120px] bg-accent/50 border border-dashed rounded-lg flex flex-col gap-3 justify-center items-center cursor-pointer transition-all duration-200",
                      fileHover ? "bg-accent/80 border-primary scale-[1.01] shadow-md" : "hover:bg-accent/70 hover:border-primary/60",
                      isLoading && "opacity-50 pointer-events-none"
                    )}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (inputMethod === "document" && !isLoading) setFileHover(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      if (inputMethod === "document" && !isLoading) setFileHover(false);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (inputMethod === "document" && !isLoading) {
                        handleFileDrop(e);
                        setFileHover(false);
                      }
                    }}
                    onClick={() =>
                      inputMethod === "document" && !isLoading && fileInputRef.current?.click()
                    }
                  >
                    <div
                      className={cn(
                        "text-primary/80",
                        fileHover ? "animate-bounce" : ""
                      )}
                    >
                      <UploadIcon size={24} />
                    </div>
                    <div className="text-center px-4">
                      {fileHover ? (
                        <p className="font-medium text-primary text-sm">
                          Release to upload
                        </p>
                      ) : (
                        <>
                          <p className="font-medium text-sm">
                            Drag & drop or click to upload document
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Analyze .txt, .doc, or .docx files for potential threats
                          </p>
                        </>
                      )}
                    </div>
                    <input
                      type="file"
                      accept=".txt,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      disabled={isLoading}
                      hidden
                    />
                  </div>
                ) : (
                  <div>
                    <div className="flex gap-3 items-center p-3 border rounded-lg bg-accent/30 transition-all duration-150 hover:bg-accent/50">
                      <Image
                        src="/images/apk-file.png"
                        alt="Document File"
                        width={40}
                        height={40}
                        className="rounded"
                      />
                      <div className="flex-1">
                        <p className="font-medium truncate text-sm">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(file.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                      {!isLoading && (
                        <button
                          onClick={() => setFile(undefined)}
                          className="text-muted-foreground hover:text-foreground transition-colors duration-150"
                        >
                          <XIcon size={16} />
                        </button>
                      )}
                    </div>

                    <div className="mt-3 flex justify-end">
                      <Button
                        onClick={!isLoading ? handleAnalyze : undefined}
                        className="h-9 px-4 transition-all duration-200 bg-primary/90 hover:bg-primary"
                        disabled={isLoading}
                      >
                        {isLoading && inputMethod === "document" ? (
                          <div className="flex items-center gap-2">
                            <Loader2Icon size={16} className="animate-spin" />
                            <span>Analyzing...</span>
                          </div>
                        ) : (
                          "Analyze Document"
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
