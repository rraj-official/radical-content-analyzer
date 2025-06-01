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
    console.log(`[YOUTUBE API] Fetching info for video ID: ${videoId}`);
    
    // Check if API key is available
    const apiKey = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
    if (!apiKey) {
      console.error("[YOUTUBE API] ERROR: NEXT_PUBLIC_YOUTUBE_API_KEY is not set");
      console.log("[YOUTUBE API] Falling back to oEmbed API...");
      return await getYoutubeVideoInfoFallback(videoId);
    }
    
    console.log(`[YOUTUBE API] Using API key: ${apiKey.substring(0, 10)}...`);
    
    const apiUrl = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${apiKey}&part=contentDetails,snippet`;
    console.log(`[YOUTUBE API] Making request to: ${apiUrl.replace(apiKey, 'API_KEY_HIDDEN')}`);
    
    const res = await fetch(apiUrl);
    
    console.log(`[YOUTUBE API] Response status: ${res.status} ${res.statusText}`);
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error(`[YOUTUBE API] API Error Response: ${errorText}`);
      console.log("[YOUTUBE API] Falling back to oEmbed API...");
      return await getYoutubeVideoInfoFallback(videoId);
    }

    const data = await res.json();
    console.log(`[YOUTUBE API] Response data:`, data);
    
    if (!data.items?.length) {
      console.error("[YOUTUBE API] ERROR: No items returned from YouTube Data API");
      console.log("[YOUTUBE API] Full response:", data);
      console.log("[YOUTUBE API] Falling back to oEmbed API...");
      return await getYoutubeVideoInfoFallback(videoId);
    }

    const snippet = data.items[0].snippet;
    const contentDetails = data.items[0].contentDetails;
    
    console.log(`[YOUTUBE API] Video title: ${snippet?.title}`);
    console.log(`[YOUTUBE API] Video duration: ${contentDetails?.duration}`);
    
    // e.g. contentDetails.duration = "PT3M57S"
    const durationIso8601 = contentDetails.duration;
    const duration = parseYouTubeISO8601Duration(durationIso8601);

    const result = {
      thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      title: snippet.title || "Title Unavailable",
      duration, // finally we have the actual duration
    };
    
    console.log(`[YOUTUBE API] SUCCESS: Returning video info:`, result);
    return result;
  } catch (error) {
    console.error("[YOUTUBE API] ERROR: Failed to fetch video info:", error);
    console.log("[YOUTUBE API] Falling back to oEmbed API...");
    return await getYoutubeVideoInfoFallback(videoId);
  }
}

// Fallback function using YouTube oEmbed API (no API key required)
async function getYoutubeVideoInfoFallback(videoId: string) {
  try {
    console.log(`[YOUTUBE FALLBACK] Using oEmbed API for video ID: ${videoId}`);
    
    const oEmbedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const res = await fetch(oEmbedUrl);
    
    if (!res.ok) {
      throw new Error(`oEmbed API failed: ${res.status} ${res.statusText}`);
    }
    
    const data = await res.json();
    console.log(`[YOUTUBE FALLBACK] oEmbed response:`, data);
    
    const result = {
      thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      title: data.title || "Video Title Unavailable",
      duration: "Unknown", // oEmbed doesn't provide duration
    };
    
    console.log(`[YOUTUBE FALLBACK] SUCCESS: Returning video info:`, result);
    return result;
  } catch (error) {
    console.error("[YOUTUBE FALLBACK] ERROR: Failed to fetch video info via oEmbed:", error);
    
    // Final fallback
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

      // Make direct API call instead of using server action for better Vercel compatibility
      console.log("📡 Making direct API call to /api/analyze/video");
      const response = await fetch('/api/analyze/video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      console.log("📡 API Response status:", response.status);
      
      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          throw new Error(errorData.error || `HTTP ${response.status}: Failed to analyze video`);
        } else {
          // If it's HTML, we likely hit a 404 or routing issue
          const textResponse = await response.text();
          console.error("❌ Received HTML instead of JSON:", textResponse.substring(0, 200));
          throw new Error("API endpoint not found. Please check your deployment configuration.");
        }
      }

      const responseData = await response.json();
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
  const videoFileInputRef = useRef<HTMLInputElement>(null);
  const documentFileInputRef = useRef<HTMLInputElement>(null);
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
        // Only accept .txt files for now since our API only supports plain text
        const validTypes = ["text/plain"];
        isValidFile = validTypes.includes(file.type);
        errorMessage = "Invalid file type. Please upload a .txt file only.";
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
      if (inputMethod === "video") {
        console.log("🎬 Starting video file analysis for:", file.name);

        // Set video info for file
        setVideoInfo({
          thumbnail: "",
          title: file.name.replace(/\.[^/.]+$/, ""), // Remove file extension
          duration: "Unknown",
          isLoading: false,
          isAnalyzing: true,
        });

        // Display a notification
        toast.info("Starting video file analysis process. This may take several minutes...");

        // Create FormData and append the file
        const formData = new FormData();
        formData.append('video', file);

        // Call the video file analysis API directly
        console.log("📡 Calling video file analysis API...");
        const response = await fetch('/api/analyze/video-file', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to analyze video file');
        }

        const responseData = await response.json();
        console.log("📡 API response data:", responseData);

        // Check if we have a valid analysis result
        if (!responseData || (!responseData.analysisId && !responseData.success)) {
          console.error("❌ No valid response:", responseData);
          throw new Error("Invalid response from video file analysis API");
        }

        console.log("✅ Analysis complete:", responseData);

        // Show success message
        toast.success("Video file analysis completed successfully!");

        // IMPORTANT: Set isAnalyzing to false using functional form,
        // and store the full response in our `analysisData` state
        setVideoInfo(prev => (prev ? { ...prev, isAnalyzing: false } : null));
        setAnalysisData(responseData);

        return responseData;
      } else if (inputMethod === "document") {
        console.log("📄 Starting text file analysis for:", file.name);

        // Set video info for text file (reusing the same structure)
        setVideoInfo({
          thumbnail: "",
          title: file.name.replace(/\.[^/.]+$/, ""), // Remove file extension
          duration: `${(file.size / 1024).toFixed(1)} KB`,
          isLoading: false,
          isAnalyzing: true,
        });

        // Display a notification
        toast.info("Starting text file analysis process. This may take a few moments...");

        // Create FormData and append the file
        const formData = new FormData();
        formData.append('textFile', file);

        // Call the text file analysis API directly
        console.log("📡 Calling text file analysis API...");
        const response = await fetch('/api/analyze/text-file', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to analyze text file');
        }

        const responseData = await response.json();
        console.log("📡 API response data:", responseData);

        // Check if we have a valid analysis result
        if (!responseData || (!responseData.analysisId && !responseData.success)) {
          console.error("❌ No valid response:", responseData);
          throw new Error("Invalid response from text file analysis API");
        }

        console.log("✅ Analysis complete:", responseData);

        // Show success message
        toast.success("Text file analysis completed successfully!");

        // IMPORTANT: Set isAnalyzing to false using functional form,
        // and store the full response in our `analysisData` state
        setVideoInfo(prev => (prev ? { ...prev, isAnalyzing: false } : null));
        setAnalysisData(responseData);

        return responseData;
      }
    } catch (error) {
      console.error(`Error analyzing ${inputMethod} file:`, error);
      toast.error(
        error instanceof Error ? error.message : `Failed to analyze ${inputMethod} file. Please try again.`
      );
      // If something breaks, also set isAnalyzing to false for both file types
      setVideoInfo(prev => (prev ? { ...prev, isAnalyzing: false } : null));
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

              {/* YouTube Video Analysis UI - Only for video URLs */}
              {videoInfo && inputMethod === "videoUrl" && (
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
                      inputMethod === "video" && !isLoading && videoFileInputRef.current?.click()
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
                            Analyze video content for potential radical content
                          </p>
                        </>
                      )}
                    </div>
                    <input
                      type="file"
                      accept="video/*"
                      ref={videoFileInputRef}
                      onChange={handleFileChange}
                      disabled={isLoading}
                      hidden
                    />
                  </div>
                ) : (
                  <div>
                    <div className="flex gap-3 items-center p-3 border rounded-lg bg-accent/30 transition-all duration-150 hover:bg-accent/50">
                      <div className="w-10 h-10 bg-primary/10 rounded flex items-center justify-center">
                        <FileIcon size={20} className="text-primary" />
                      </div>
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
                      inputMethod === "document" && !isLoading && documentFileInputRef.current?.click()
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
                            Analyze .txt files for potential radical content
                          </p>
                        </>
                      )}
                    </div>
                    <input
                      type="file"
                      accept=".txt,text/plain"
                      ref={documentFileInputRef}
                      onChange={handleFileChange}
                      disabled={isLoading}
                      hidden
                    />
                  </div>
                ) : (
                  <div>
                    <div className="flex gap-3 items-center p-3 border rounded-lg bg-accent/30 transition-all duration-150 hover:bg-accent/50">
                      <div className="w-10 h-10 bg-primary/10 rounded flex items-center justify-center">
                        <FileTextIcon size={20} className="text-primary" />
                      </div>
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

      {/* File Analysis Display (Video and Text Files) - Only for uploaded files */}
      {videoInfo && (inputMethod === "video" || inputMethod === "document") && (
        <div className="mt-6 p-6 rounded-xl border border-border/60 bg-card/50 backdrop-blur-sm shadow-sm animate-slide-up">
          {videoInfo.isAnalyzing ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <Loader2Icon size={32} className="animate-spin text-primary" />
              <div className="text-center">
                <p className="font-medium">
                  {inputMethod === "video" ? "Analyzing video file..." : "Analyzing text file..."}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {inputMethod === "video" 
                    ? "This may take several minutes" 
                    : "This may take a few moments"
                  }
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  {inputMethod === "video" ? (
                    <FileIcon size={24} className="text-primary" />
                  ) : (
                    <FileTextIcon size={24} className="text-primary" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{videoInfo.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {inputMethod === "video" 
                      ? `Duration: ${videoInfo.duration} | File uploaded for analysis`
                      : `Size: ${videoInfo.duration} | Text file uploaded for analysis`
                    }
                  </p>
                </div>
                <div className="text-green-600 font-medium text-sm">
                  Analysis Complete ✓
                </div>
              </div>
              
              {/* Show text content preview for text files */}
              {inputMethod === "document" && analysisData?.inputParameters?.textContent && (
                <div className="mt-4 p-4 bg-accent/20 rounded-lg border">
                  <h4 className="font-medium text-sm mb-2">Text Content Preview</h4>
                  <div className="text-xs text-muted-foreground mb-2">
                    Showing first 1000 characters of {analysisData.inputParameters.fullTextLength || 0} total characters
                  </div>
                  <div className="text-sm bg-background/50 p-3 rounded border max-h-32 overflow-y-auto">
                    <pre className="whitespace-pre-wrap font-mono text-xs">
                      {analysisData.inputParameters.textContent}
                    </pre>
                  </div>
                </div>
              )}

              {/* Analysis Results for uploaded files */}
              {analysisData && (
                <div className="mt-6 pt-6 border-t">
                  <h3 className="text-lg font-semibold mb-4">Content Analysis Results</h3>

                  {/* Real Analysis Data */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="p-4 bg-accent/50 rounded-lg">
                      <div className="flex justify-between items-center mb-1">
                        <p className="font-medium">Radical Probability</p>
                        <p
                          className={`font-bold ${
                            analysisData.outputParameters.radicalProbability > 50
                              ? "text-destructive"
                              : "text-green-600"
                          }`}
                        >
                          {analysisData.outputParameters.radicalProbability}%
                        </p>
                      </div>
                      <div className="w-full bg-accent/30 rounded-full h-2 mt-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${
                            analysisData.outputParameters.radicalProbability > 50
                              ? "bg-destructive"
                              : "bg-green-600"
                          }`}
                          style={{
                            width: `${analysisData.outputParameters.radicalProbability}%`,
                          }}
                        ></div>
                      </div>
                    </div>

                    <div className="p-4 bg-accent/50 rounded-lg">
                      <div className="flex justify-between items-center mb-1">
                        <p className="font-medium">Radical Content</p>
                        <p
                          className={`font-bold ${
                            analysisData.outputParameters.radicalContent > 50
                              ? "text-destructive"
                              : "text-green-600"
                          }`}
                        >
                          {analysisData.outputParameters.radicalContent}%
                        </p>
                      </div>
                      <div className="w-full bg-accent/30 rounded-full h-2 mt-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${
                            analysisData.outputParameters.radicalContent > 50
                              ? "bg-destructive"
                              : "bg-green-600"
                          }`}
                          style={{
                            width: `${analysisData.outputParameters.radicalContent}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* Overall Assessment */}
                  <div className="mb-6 p-4 bg-accent/30 rounded-lg">
                    <h4 className="font-medium text-sm mb-2">Overall Assessment</h4>
                    <p className="text-sm text-muted-foreground">
                      {analysisData.outputParameters.overallAssessment}
                    </p>
                  </div>

                  {/* Analysis Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Risk Factors */}
                    <div>
                      <h4 className="font-medium text-sm mb-3">Key Risk Factors</h4>
                      <div className="space-y-2">
                        {analysisData.outputParameters.riskFactors?.map((factor: string, index: number) => (
                          <div key={index} className="flex items-start gap-2">
                            <div className="w-2 h-2 bg-destructive rounded-full mt-1.5 flex-shrink-0"></div>
                            <p className="text-sm text-muted-foreground">{factor}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Safety Tips */}
                    <div>
                      <h4 className="font-medium text-sm mb-3">Safety Tips</h4>
                      <div className="space-y-2">
                        {analysisData.outputParameters.safetyTips?.map((tip: string, index: number) => (
                          <div key={index} className="flex items-start gap-2">
                            <div className="w-2 h-2 bg-green-600 rounded-full mt-1.5 flex-shrink-0"></div>
                            <p className="text-sm text-muted-foreground">{tip}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Detailed Analysis Sections */}
                  <div className="mt-6 space-y-4">
                    <div className="p-4 border rounded-lg bg-accent/20">
                      <h4 className="font-medium text-sm mb-2">Lexical Analysis</h4>
                      <p className="text-sm text-muted-foreground">
                        {analysisData.outputParameters.lexicalAnalysis}
                      </p>
                    </div>

                    <div className="p-4 border rounded-lg bg-accent/20">
                      <h4 className="font-medium text-sm mb-2">Emotion & Sentiment Analysis</h4>
                      <p className="text-sm text-muted-foreground">
                        {analysisData.outputParameters.emotionAnalysis}
                      </p>
                    </div>

                    <div className="p-4 border rounded-lg bg-accent/20">
                      <h4 className="font-medium text-sm mb-2">Speech Patterns & Intensity</h4>
                      <p className="text-sm text-muted-foreground">
                        {analysisData.outputParameters.speechPatterns}
                      </p>
                    </div>

                    <div className="p-4 border rounded-lg bg-accent/20">
                      <h4 className="font-medium text-sm mb-2">Religious Rhetoric</h4>
                      <p className="text-sm text-muted-foreground">
                        {analysisData.outputParameters.religiousRhetoric}
                      </p>
                    </div>

                    <div className="p-4 border rounded-lg bg-accent/20">
                      <h4 className="font-medium text-sm mb-2">Commands & Directives</h4>
                      <p className="text-sm text-muted-foreground">
                        {analysisData.outputParameters.commandsDirectives}
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-6 flex gap-4 justify-center">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setAnalysisData(null);
                        setVideoInfo(null);
                        setFile(undefined);
                      }}
                    >
                      Analyze Another Content
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
