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
  YoutubeIcon
} from "lucide-react";
import { toast } from "sonner";
import { cn, isValidUrl } from "@/lib/utils";
import Image from "next/image";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { analyzeVideoUrl } from "@/app/actions/serverActions";

export default function InputForm() {
  const [inputMethod, setInputMethod] = useState<"video" | "document" | "videoUrl">("videoUrl");
  const [inputUrl, setInputUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [modelType, setModelType] = useState<"hosted" | "online">("online");
  
  // We'll store the analysis result from the API here:
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  // We'll track the basic info about the video (thumbnail, title, etc.)
  const [videoInfo, setVideoInfo] = useState<{
    thumbnail: string;
    title: string;
    duration: string;
    isLoading: boolean;
    isAnalyzing: boolean;
  } | null>(null);

  const analysisRef = useRef<HTMLDivElement>(null);
  const videoInfoRef = useRef<HTMLDivElement>(null);
  const buttonAreaRef = useRef<HTMLDivElement>(null);

  // Function to check if URL is a YouTube link
  const isYoutubeUrl = (url: string): boolean => {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
    return youtubeRegex.test(url);
  };

  // Function to check if URL is an X/Twitter link
  const isXUrl = (url: string): boolean => {
    const xRegex = /^(https?:\/\/)?(www\.)?(twitter\.com|x\.com)\/.+/;
    return xRegex.test(url);
  };

  // Function to extract YouTube video ID
  const extractYoutubeId = (url: string): string | null => {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : null;
  };

  // Function to get YouTube video info using oEmbed
  const getYoutubeVideoInfo = async (videoId: string) => {
    console.log("Getting YouTube info for video ID:", videoId);
    
    try {
      // First get basic info from oEmbed
      const response = await fetch(
        `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch video info");
      }
      const data = await response.json();
      
      // Now fetch the video duration using the YouTube API
      try {
        console.log("Fetching video duration from YouTube API...");
        console.log("Using API Key:", process.env.NEXT_PUBLIC_YOUTUBE_API_KEY ? "Key exists" : "Key missing");
        
        const apiUrl = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=contentDetails&key=${process.env.NEXT_PUBLIC_YOUTUBE_API_KEY}`;
        // Log URL with partial key for debugging
        console.log("API URL (redacted key):", apiUrl.replace(process.env.NEXT_PUBLIC_YOUTUBE_API_KEY || "", "REDACTED"));
        
        const durationResponse = await fetch(apiUrl);
        
        if (!durationResponse.ok) {
          const errorText = await durationResponse.text();
          console.error(`YouTube API error (${durationResponse.status}):`, errorText);
          throw new Error(`YouTube API error: ${durationResponse.status} - ${errorText}`);
        }
        
        const durationData = await durationResponse.json();
        console.log("YouTube API duration response:", durationData);
        
        if (durationData.items && durationData.items.length > 0 && durationData.items[0].contentDetails) {
          // Convert ISO 8601 duration to human-readable format
          const isoDuration = durationData.items[0].contentDetails.duration;
          console.log("ISO Duration:", isoDuration);
          
          const duration = formatDuration(isoDuration);
          console.log("Formatted duration:", duration);
          
          return {
            thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
            title: data.title,
            duration
          };
        } else {
          console.warn("YouTube API response missing duration data:", durationData);
          // Fall through to return with unknown duration
        }
      } catch (durationError) {
        console.error("Error fetching duration:", durationError);
        // Continue with basic info if duration fetch fails
      }
      
      // Return basic info if duration fetch fails
      return {
        thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        title: data.title,
        duration: "Unknown" // Fallback if we can't get the duration
      };
    } catch (error) {
      console.error("Error fetching video info:", error);
      return {
        thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        title: "Video Title Unavailable",
        duration: "Unknown"
      };
    }
  };

  // Function to convert ISO 8601 duration to human-readable format
  const formatDuration = (isoDuration: string): string => {
    console.log("Formatting duration from:", isoDuration);
    
    // YouTube duration format is like PT1H24M12S (1 hour, 24 minutes, 12 seconds)
    // or PT4M3S (4 minutes, 3 seconds)
    const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    
    if (!match) {
      console.warn("Invalid duration format:", isoDuration);
      return "Unknown";
    }
    
    const hours = match[1] ? parseInt(match[1]) : 0;
    const minutes = match[2] ? parseInt(match[2]) : 0;
    const seconds = match[3] ? parseInt(match[3]) : 0;
    
    console.log(`Parsed duration: ${hours}h ${minutes}m ${seconds}s`);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
  };

  // Analyze the video content by calling our server action
  const analyzeVideoContent = async (url: string) => {
    try {
      console.log("🎬 Starting video analysis for:", url);

      // Mark it as analyzing:
      setVideoInfo(prev => (prev ? { ...prev, isAnalyzing: true } : null));

      // Display a notification
      toast.info("Starting video analysis process. This may take several minutes...");

      // Call the analysis server action
      console.log("📡 Calling analyzeVideoUrl server action...");
      const responseData = await analyzeVideoUrl(url);
      console.log("📡 API response data:", responseData);

      // Check if we have a valid analysis result
      if (!responseData || (!responseData.analysisId && !responseData.success)) {
        console.error("❌ No valid response:", responseData);
        throw new Error("Invalid response from video analysis API");
      }

      console.log("✅ Analysis complete:", responseData);

      // Show success message
      toast.success("Video analysis completed successfully!");

      // IMPORTANT: Set isAnalyzing to false using functional form,
      // and store the full response in our `analysisResult` state
      setVideoInfo(prev => (prev ? { ...prev, isAnalyzing: false } : null));
      setAnalysisResult(responseData);

    } catch (error) {
      console.error("❌ Error analyzing video:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to analyze video"
      );
      // If something breaks, also set isAnalyzing to false
      setVideoInfo(prev => (prev ? { ...prev, isAnalyzing: false } : null));
    }
  };

  // We'll handle the "Analyze" button
  const [file, setFile] = useState<File | undefined>(undefined);

  const handleAnalyze = async () => {
    // Check if NovaSentinel model is selected, which is currently under maintenance
    if (modelType === "hosted") {
      toast.error("NovaSentinel model is currently under maintenance. Please try NovaVerse model instead.");
      return;
    }
    
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

        console.log("Analyzing URL:", formattedUrl, "Input method:", inputMethod);
        
        // Distinguish YouTube vs. Twitter vs. general video
        if (isYoutubeUrl(formattedUrl)) {
          const videoId = extractYoutubeId(formattedUrl);
          console.log("Extracted YouTube ID:", videoId);

          if (videoId) {
            // Reset old analysis (if any):
            setAnalysisResult(null);
            setVideoInfo({
              thumbnail: "",
              title: "",
              duration: "",
              isLoading: true,
              isAnalyzing: false
            });

            try {
              // Fetch basic YouTube info
              console.log("Fetching YouTube video info for ID:", videoId);
              const info = await getYoutubeVideoInfo(videoId);
              console.log("Received video info:", info);

              // Debug log the duration specifically
              console.log("Setting duration to:", info.duration);
              
              setVideoInfo({
                thumbnail: info.thumbnail,
                title: info.title,
                duration: info.duration,
                isLoading: false,
                isAnalyzing: false
              });

              // Now call the actual analysis
              console.log("Starting video analysis process for URL:", formattedUrl);
              setIsLoading(false);
              await analyzeVideoContent(formattedUrl);
              return;
            } catch (error) {
              console.error("Error fetching video info:", error);
              toast.error("Failed to fetch video information.");
              setVideoInfo(null);
              setIsLoading(false);
              return;
            }
          }
        } else if (isXUrl(formattedUrl)) {
          // For X/Twitter URLs, we skip the thumbnail fetch
          console.log("Processing X/Twitter URL:", formattedUrl);
          setVideoInfo(null);
          setAnalysisResult(null);
          setIsLoading(false);
          await analyzeVideoContent(formattedUrl);
          return;
        } else {
          // Some other URL
          console.log("Processing general video URL:", formattedUrl);
          setVideoInfo(null);
          setAnalysisResult(null);
          setIsLoading(false);
          await analyzeVideoContent(formattedUrl);
          return;
        }
      } else if (inputMethod === "video" || inputMethod === "document") {
        // The user is uploading a file
        console.log("Processing file upload for type:", inputMethod);
        // ...
        // For brevity, you'd do file-based analysis here
        toast.success("Mock analysis completed for uploaded file!");
      }
    } catch (error) {
      console.error("Error during analysis:", error);
      toast.error("An error occurred during analysis. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Clear out old video info whenever the user changes input method or url
  useEffect(() => {
    setVideoInfo(null);
    setAnalysisResult(null);
  }, [inputMethod, inputUrl, modelType]);

  // Drag-and-drop handling for file uploading
  const [fileHover, setFileHover] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pickedFile = e.target.files?.[0];
    if (pickedFile) {
      setFile(pickedFile);
    }
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      // Basic type checks
      if (inputMethod === "video" && !droppedFile.type.startsWith("video/")) {
        toast.error("Invalid file type. Please upload a video file.");
        return;
      } else if (inputMethod === "document") {
        const validTypes = [
          "text/plain",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ];
        if (!validTypes.includes(droppedFile.type)) {
          toast.error("Invalid file type. Please upload a .txt, .doc, or .docx file.");
          return;
        }
      }
      setFile(droppedFile);
    }
  };

  return (
    <div className="w-full max-w-4xl animate-fade-in">
      <div className="p-6 rounded-xl border border-border/60 bg-card/50 backdrop-blur-sm shadow-sm transition-all duration-200 hover:shadow-md">
        {/* Tabs for input method selection */}
        <div className="flex justify-center mb-5">
          <div className="inline-flex bg-accent/80 rounded-lg p-1 gap-1">
            <button
              className={cn(
                "rounded-md py-2 px-4 flex items-center gap-2 transition-all duration-150",
                inputMethod === "videoUrl"
                  ? "bg-background shadow-sm font-medium text-foreground"
                  : "bg-accent text-accent-foreground hover:bg-accent/70"
              )}
              onClick={() => setInputMethod("videoUrl")}
              disabled={isLoading}
            >
              <YoutubeIcon size={16} />
              Video URL
            </button>
            <button
              className={cn(
                "rounded-md py-2 px-4 flex items-center gap-2 transition-all duration-150",
                inputMethod === "video"
                  ? "bg-background shadow-sm font-medium text-foreground"
                  : "bg-accent text-accent-foreground hover:bg-accent/70"
              )}
              onClick={() => setInputMethod("video")}
              disabled={isLoading}
            >
              <FileIcon size={16} />
              Video File
            </button>
            <button
              className={cn(
                "rounded-md py-2 px-4 flex items-center gap-2 transition-all duration-150",
                inputMethod === "document"
                  ? "bg-background shadow-sm font-medium text-foreground"
                  : "bg-accent text-accent-foreground hover:bg-accent/70"
              )}
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
                <ServerIcon size={14} className="inline mr-1" />
                NovaSentinel (Most Secure)
              </SelectItem>
              <SelectItem value="online" className="flex items-center gap-2">
                <CloudIcon size={14} className="inline mr-1" />
                NovaVerse (Fastest)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="relative">
          {/* VIDEO URL INPUT */}
          <div
            className={cn(
              "transition-all duration-300",
              inputMethod === "videoUrl"
                ? "opacity-100 visible"
                : "opacity-0 invisible absolute top-0 left-0 right-0"
            )}
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
                    onClick={
                      !isLoading && inputMethod === "videoUrl"
                        ? handleAnalyze
                        : undefined
                    }
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

              {/* VIDEO INFO & RESULTS */}
              {videoInfo && (
                <div className="mt-4 border rounded-lg p-4 bg-accent/30 animate-slide-up">
                  {videoInfo.isLoading ? (
                    <div className="flex flex-col items-center justify-center py-6 space-y-4">
                      <Loader2Icon size={32} className="animate-spin text-primary" />
                      <div className="text-center">
                        <p className="font-medium">Loading video information...</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          This may take a moment
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-col md:flex-row gap-4" ref={videoInfoRef}>
                        {/* Thumbnail */}
                        <div className="relative w-full md:w-1/3 aspect-video rounded-lg overflow-hidden border">
                          <Image
                            src={videoInfo.thumbnail}
                            alt="Video Thumbnail"
                            fill
                            className="object-cover"
                          />
                        </div>

                        {/* Info / Title / Duration */}
                        <div className="flex-1 flex flex-col">
                          <h3 className="font-medium text-lg line-clamp-2">{videoInfo.title}</h3>
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
                                    setAnalysisResult(null);
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
                                    setAnalysisResult(null);
                                    toast.info("Analysis canceled");
                                  }}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  variant="default"
                                  size="sm"
                                  className="flex-1"
                                  disabled={true}
                                >
                                  <Loader2Icon size={14} className="animate-spin mr-2" />
                                  Analyzing
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* RADICAL CONTENT ANALYSIS: show real results if we have them */}
                      {!videoInfo.isAnalyzing && (
                        <div ref={analysisRef} className="mt-6 pt-6 border-t animate-slide-up">
                          <h3 className="text-lg font-semibold mb-4">Content Analysis Results</h3>

                          {analysisResult ? (
                            <>
                              {/* Real Analysis Data */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                <div className="p-4 bg-accent/50 rounded-lg">
                                  <div className="flex justify-between items-center mb-1">
                                    <p className="font-medium">Radical Probability</p>
                                    <p
                                      className={`font-bold ${
                                        analysisResult.outputParameters.radicalProbability > 50
                                          ? "text-destructive"
                                          : "text-green-600"
                                      }`}
                                    >
                                      {analysisResult.outputParameters.radicalProbability}%
                                    </p>
                                  </div>
                                  <div className="w-full bg-muted rounded-full h-2">
                                    <div
                                      className={`${
                                        analysisResult.outputParameters.radicalProbability > 50
                                          ? "bg-destructive"
                                          : "bg-green-600"
                                      } h-2 rounded-full`}
                                      style={{
                                        width: `${analysisResult.outputParameters.radicalProbability}%`
                                      }}
                                    ></div>
                                  </div>
                                </div>

                                <div className="p-4 bg-accent/50 rounded-lg">
                                  <div className="flex justify-between items-center mb-1">
                                    <p className="font-medium">Radical Content</p>
                                    <p
                                      className={`font-bold ${
                                        analysisResult.outputParameters.radicalContent > 50
                                          ? "text-destructive"
                                          : "text-green-600"
                                      }`}
                                    >
                                      {analysisResult.outputParameters.radicalContent}%
                                    </p>
                                  </div>
                                  <div className="w-full bg-muted rounded-full h-2">
                                    <div
                                      className={`${
                                        analysisResult.outputParameters.radicalContent > 50
                                          ? "bg-destructive"
                                          : "bg-green-600"
                                      } h-2 rounded-full`}
                                      style={{
                                        width: `${analysisResult.outputParameters.radicalContent}%`
                                      }}
                                    ></div>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center justify-between mb-4">
                                <h4 className="font-semibold">Analysis Report</h4>
                                <span
                                  className={cn(
                                    "px-3 py-1 rounded-full text-xs font-medium",
                                    analysisResult.outputParameters.overallScore.color === "green"
                                      ? "bg-green-100 text-green-800"
                                      : analysisResult.outputParameters.overallScore.color === "amber"
                                      ? "bg-yellow-100 text-yellow-800"
                                      : "bg-red-100 text-red-800"
                                  )}
                                >
                                  {analysisResult.outputParameters.overallScore.label}
                                </span>
                              </div>

                              <div className="bg-accent/30 p-4 rounded-lg">
                                <p className="text-sm mb-4">
                                  {analysisResult.outputParameters.overallAssessment}
                                </p>

                                <div className="space-y-4 text-sm">
                                  <div>
                                    <p className="font-semibold mb-1">Lexical Analysis:</p>
                                    <p className="text-muted-foreground leading-relaxed">
                                      {analysisResult.outputParameters.lexicalAnalysis}
                                    </p>
                                  </div>

                                  <div>
                                    <p className="font-semibold mb-1">Emotion and Sentiment:</p>
                                    <p className="text-muted-foreground leading-relaxed">
                                      {analysisResult.outputParameters.emotionAnalysis}
                                    </p>
                                  </div>

                                  <div>
                                    <p className="font-semibold mb-1">
                                      Speech Patterns and Intensity:
                                    </p>
                                    <p className="text-muted-foreground leading-relaxed">
                                      {analysisResult.outputParameters.speechPatterns}
                                    </p>
                                  </div>

                                  <div>
                                    <p className="font-semibold mb-1">Use of Religious Rhetoric:</p>
                                    <p className="text-muted-foreground leading-relaxed">
                                      {analysisResult.outputParameters.religiousRhetoric}
                                    </p>
                                  </div>

                                  <div>
                                    <p className="font-semibold mb-1">
                                      Frequency of Commands and Directives:
                                    </p>
                                    <p className="text-muted-foreground leading-relaxed">
                                      {analysisResult.outputParameters.commandsDirectives}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {analysisResult.outputParameters.safetyTips &&
                                analysisResult.outputParameters.safetyTips.length > 0 && (
                                  <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                                    <h4 className="text-sm font-semibold text-blue-700 mb-2">
                                      Safety Tips
                                    </h4>
                                    <ul className="list-disc pl-5 text-xs text-blue-700 space-y-1">
                                      {analysisResult.outputParameters.safetyTips.map(
                                        (tip: string, idx: number) => (
                                          <li key={idx}>{tip}</li>
                                        )
                                      )}
                                    </ul>
                                  </div>
                                )}
                            </>
                          ) : (
                            // If we don't yet have analysisResult, show a placeholder
                            <>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                <div className="p-4 bg-accent/50 rounded-lg">
                                  <div className="flex justify-between items-center mb-1">
                                    <p className="font-medium">Radical Probability</p>
                                    <p className="font-bold text-destructive">85%</p>
                                  </div>
                                  <div className="w-full bg-muted rounded-full h-2">
                                    <div
                                      className="bg-destructive h-2 rounded-full"
                                      style={{ width: "85%" }}
                                    ></div>
                                  </div>
                                </div>

                                <div className="p-4 bg-accent/50 rounded-lg">
                                  <div className="flex justify-between items-center mb-1">
                                    <p className="font-medium">Radical Content</p>
                                    <p className="font-bold text-destructive">80%</p>
                                  </div>
                                  <div className="w-full bg-muted rounded-full h-2">
                                    <div
                                      className="bg-destructive h-2 rounded-full"
                                      style={{ width: "80%" }}
                                    ></div>
                                  </div>
                                </div>
                              </div>

                              <div className="bg-accent/30 p-4 rounded-lg">
                                <h4 className="font-semibold mb-3">Analysis Report</h4>
                                <p className="text-sm text-muted-foreground">
                                  Placeholder results shown until real data is loaded.
                                </p>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* VIDEO FILE UPLOAD */}
          <div
            className={cn(
              "transition-all duration-300",
              inputMethod === "video"
                ? "opacity-100 visible"
                : "opacity-0 invisible absolute top-0 left-0 right-0"
            )}
          >
            {/* ... your file-upload UI for video ... */}
            {/* Similar structure as the "document" below */}
            {/* For brevity, not repeated here */}
          </div>

          {/* DOCUMENT FILE UPLOAD */}
          <div
            className={cn(
              "transition-all duration-300",
              inputMethod === "document"
                ? "opacity-100 visible"
                : "opacity-0 invisible absolute top-0 left-0 right-0"
            )}
          >
            {/* ... your file-upload UI for documents ... */}
            {/* For brevity, not repeated here */}
          </div>
        </div>
      </div>
    </div>
  );
}
