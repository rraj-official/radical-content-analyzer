"use client";
import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2Icon, UploadIcon, XIcon, GlobeIcon, FileIcon, ServerIcon, CloudIcon, FileTextIcon, YoutubeIcon } from "lucide-react";
import { toast } from "sonner";
import { cn, isValidUrl } from "@/lib/utils";
import Image from "next/image";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { analyzeVideoUrl } from "@/app/actions/serverActions";

export default function InputForm() {
  const [inputMethod, setInputMethod] = useState<"video" | "document" | "videoUrl">("videoUrl");
  const [inputUrl, setInputUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [modelType, setModelType] = useState<"hosted" | "online">("online");
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

  // Function to get YouTube video info
  const getYoutubeVideoInfo = async (videoId: string) => {
    try {
      // For simplicity, we'll use the public oEmbed endpoint for YouTube
      const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch video info');
      }
      
      const data = await response.json();
      
      return {
        thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`, // Higher quality thumbnail
        title: data.title,
        duration: "Loading...", // YouTube oEmbed doesn't provide duration
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

  // Function to analyze video content
  const analyzeVideoContent = async (url: string) => {
    try {
      console.log("🎬 Starting video analysis for:", url);
      setVideoInfo(prev => prev ? {...prev, isAnalyzing: true} : null);
      
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
      
      // Show success message without navigating
      toast.success("Video analysis completed successfully!");
      
      // Update the video info to show analysis is complete
      if (videoInfo) {
        setVideoInfo({
          ...videoInfo,
          isAnalyzing: false
        });
      }
      
    } catch (error) {
      console.error("❌ Error analyzing video:", error);
      toast.error(error instanceof Error ? error.message : "Failed to analyze video");
      setVideoInfo(prev => prev ? {...prev, isAnalyzing: false} : null);
    }
  };

  const handleAnalyze = async () => {
    if ((!inputUrl && inputMethod === "videoUrl") || 
        (!file && (inputMethod === "video" || inputMethod === "document"))) {
      toast.error(inputMethod === "videoUrl" 
        ? "Enter a URL to analyze." 
        : `Upload a ${inputMethod} file to analyze.`);
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
          
        console.log("Analyzing URL:", formattedUrl, "Input method:", inputMethod);
        
        // Handle video URL analysis
        let videoId;
        
        console.log("Processing as video content...");
        
        if (isYoutubeUrl(formattedUrl)) {
          videoId = extractYoutubeId(formattedUrl);
          console.log("Extracted YouTube ID:", videoId);
          
          if (videoId) {
            setVideoInfo({
              thumbnail: "",
              title: "",
              duration: "",
              isLoading: true,
              isAnalyzing: false
            });
            
            try {
              // Get YouTube video info
              console.log("Fetching YouTube video info for ID:", videoId);
              const info = await getYoutubeVideoInfo(videoId);
              console.log("Received video info:", info);
              
              // Set video info with the retrieved data
              setVideoInfo({
                thumbnail: info.thumbnail,
                title: info.title,
                duration: info.duration,
                isLoading: false,
                isAnalyzing: false
              });
              
              // Start the analysis process
              console.log("Starting video analysis process for URL:", formattedUrl);
              setIsLoading(false); // Turn off the button loading state
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
          // For X/Twitter URLs, we don't fetch preview but go straight to analysis
          console.log("Processing X/Twitter URL:", formattedUrl);
          setIsLoading(false); // Turn off the button loading state
          await analyzeVideoContent(formattedUrl);
          return;
        } else {
          // General video URL case
          console.log("Processing general video URL:", formattedUrl);
          setIsLoading(false); // Turn off the button loading state
          await analyzeVideoContent(formattedUrl);
          return;
        }
      } else if (inputMethod === "video" || inputMethod === "document") {
        // Use the processFileForAnalysis helper
        console.log("Processing file upload for type:", inputMethod);
        analysisRecord = await processFileForAnalysis();
      }
      
      if (analysisRecord) {
        // Navigate to results page
        const targetName = file?.name || '';
        
        console.log("Analysis complete. Navigating to results page:", analysisRecord.analysisId);
        window.location.href = `/analysis/${analysisRecord.analysisId}?type=${inputMethod}&target=${encodeURIComponent(targetName)}`;
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

  // Clear video info when input method or URL changes
  useEffect(() => {
    setVideoInfo(null);
  }, [inputMethod, inputUrl, modelType]);

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
      // Check file type based on inputMethod
      let isValidFile = false;
      let errorMessage = "";

      if (inputMethod === "video") {
        isValidFile = file.type.startsWith("video/");
        errorMessage = "Invalid file type. Please upload a video file.";
      } else if (inputMethod === "document") {
        const validTypes = ["text/plain", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
        isValidFile = validTypes.includes(file.type);
        errorMessage = "Invalid file type. Please upload a .txt, .doc, or .docx file.";
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
      // Use our mock function instead of the context version
      toast.success(`${inputMethod.charAt(0).toUpperCase() + inputMethod.slice(1)} analysis completed successfully!`);
      return { analysisId: "mock-" + Date.now() };
    } catch (error) {
      console.error(`Error analyzing ${inputMethod} file:`, error);
      toast.error(`Failed to analyze ${inputMethod} file. Please try again.`);
      return null;
    }
  };

  // Add this function to replace analyzeUrl
  const analyzeUrl = async (url: string) => {
    // Simple mock function to replace the context version
    toast.success("Website analysis completed successfully!");
    return { analysisId: "mock-" + Date.now() };
  };

  return (
    <div className="w-full max-w-2xl animate-fade-in">
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
          <div className={`transition-all duration-300 ${inputMethod === "videoUrl" ? "opacity-100 visible" : "opacity-0 invisible absolute top-0 left-0 right-0"}`}>
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
                        if (e.key === "Enter" && inputMethod === "videoUrl" && !isLoading) {
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
                    {isYoutubeUrl(inputUrl) ? 
                      "We'll analyze this YouTube video for harmful content." : 
                      isXUrl(inputUrl) ?
                      "We'll analyze this Twitter/X video for harmful content." :
                      "Enter a YouTube or Twitter URL to analyze video content."}
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
                          <Image
                            src={videoInfo.thumbnail}
                            alt="Video Thumbnail"
                            fill
                            className="object-cover"
                          />
                        </div>
                        
                        {/* Video Information */}
                        <div className="flex-1 flex flex-col">
                          <h3 className="font-medium text-lg line-clamp-2">{videoInfo.title}</h3>
                          <p className="text-sm text-muted-foreground mt-1">Length: {videoInfo.duration}</p>
                          
                          <div className="mt-auto">
                            <div className="flex items-center gap-2 mt-4 text-sm">
                              {videoInfo.isAnalyzing ? (
                                <>
                                  <Loader2Icon size={16} className="animate-spin text-primary" />
                                  <span>Processing video and analyzing content...</span>
                                </>
                              ) : (
                                <p className="text-green-600 font-medium">Analysis completed successfully!</p>
                              )}
                            </div>
                            {videoInfo.isAnalyzing && (
                              <p className="text-xs text-muted-foreground mt-1">This may take several minutes to complete</p>
                            )}
                            
                            {!videoInfo.isAnalyzing ? (
                              <div className="mt-4 flex justify-end">
                                <Button 
                                  variant="default" 
                                  size="sm"
                                  onClick={() => setVideoInfo(null)}
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
                      
                      {/* Radical Content Analysis - Only shown when analysis complete */}
                      {!videoInfo.isAnalyzing && (
                        <div 
                          ref={analysisRef}
                          className="mt-6 pt-6 border-t animate-slide-up"
                        >
                          <h3 className="text-lg font-semibold mb-4">Content Analysis Results</h3>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            <div className="p-4 bg-accent/50 rounded-lg">
                              <div className="flex justify-between items-center mb-1">
                                <p className="font-medium">Radical Probability</p>
                                <p className="font-bold text-destructive">85%</p>
                              </div>
                              <div className="w-full bg-muted rounded-full h-2">
                                <div className="bg-destructive h-2 rounded-full" style={{ width: "85%" }}></div>
                              </div>
                            </div>
                            
                            <div className="p-4 bg-accent/50 rounded-lg">
                              <div className="flex justify-between items-center mb-1">
                                <p className="font-medium">Radical Content</p>
                                <p className="font-bold text-destructive">80%</p>
                              </div>
                              <div className="w-full bg-muted rounded-full h-2">
                                <div className="bg-destructive h-2 rounded-full" style={{ width: "80%" }}></div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="bg-accent/30 p-4 rounded-lg">
                            <h4 className="font-semibold mb-3">Analysis Report</h4>
                            
                            <div className="space-y-4 text-sm">
                              <div>
                                <p className="font-semibold mb-1">Lexical Analysis:</p>
                                <p className="text-muted-foreground leading-relaxed">
                                  The narrative in both Hindi and English includes exclusionary language and divisive rhetoric. Terms like "हिंदू राज"("Hindu rule"), "हिंदू राष्ट्र"("Hindu nation"), and "हिंदू"("Hindus"), indicate radical religious sentiments. The narrative posits an "us vs. them" scenario, referring to "दूसरे वर्ग के लोग"("people of another class") and "Bangladesh" and "Rohingya", ethnic groups commonly targeted in divisive speeches. The English section also has phrases like "calls for blood and violence" which are extreme radical terminologies.
                                </p>
                              </div>
                              
                              <div>
                                <p className="font-semibold mb-1">Emotion and Sentiment in Speech:</p>
                                <p className="text-muted-foreground leading-relaxed">
                                  Both parts of the text encompass a high degree of negative sentiment. Fear appears to be the primary emotion exploited, with phrases like "इस नॉट गेटिंग वेरी फास्ट टाइम"("This is not getting much time") and "वह इनफील्ट्रेशन करके"("they infiltrate") suggesting infiltration by foreigners, and "The first time they are coming…things to be afraid of." in the English transcript.
                                </p>
                              </div>
                              
                              <div>
                                <p className="font-semibold mb-1">Speech Patterns and Intensity:</p>
                                <p className="text-muted-foreground leading-relaxed">
                                  The transcript exhibits a tense and urgent tone, seen in repetition of phrases like "हिंदू राज" and "हिंदू राष्ट्र" and the repeated assertion of a threat of infiltration. Points are emphasized using terms related to danger and fast-spreading influence.
                                </p>
                              </div>
                              
                              <div>
                                <p className="font-semibold mb-1">Use of Religious Rhetoric:</p>
                                <p className="text-muted-foreground leading-relaxed">
                                  The Hindi part of the text heavily invokes religious symbolism, with the constant repetition of "हिंदू राज" ("Hindu rule") and "हिंदू राष्ट्र" ("Hindu nation"). The rhetoric implies an impending conflict where one religious group ("Hindus") must assert their dominance.
                                </p>
                              </div>
                              
                              <div>
                                <p className="font-semibold mb-1">Frequency of Commands and Directives:</p>
                                <p className="text-muted-foreground leading-relaxed">
                                  The transcript contains several calls to action, as seen in directives like "सुनाओ" ("Tell"), "सीखो" ("Learn"), "The first time they are coming". These commands suggest an urge to act against an imminent threat, contributing to the overall radicalism of the speech's content.
                                </p>
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
          <div className={`transition-all duration-300 ${inputMethod === "video" ? "opacity-100 visible" : "opacity-0 invisible absolute top-0 left-0 right-0"}`}>
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
                    onClick={() => inputMethod === "video" && !isLoading && fileInputRef.current?.click()}
                  >
                    <div className={cn("text-primary/80", fileHover ? "animate-bounce" : "")}>
                      <UploadIcon size={24} />
                    </div>
                    <div className="text-center px-4">
                      {fileHover ? (
                        <p className="font-medium text-primary text-sm">Release to upload</p>
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
          <div className={`transition-all duration-300 ${inputMethod === "document" ? "opacity-100 visible" : "opacity-0 invisible absolute top-0 left-0 right-0"}`}>
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
                    onClick={() => inputMethod === "document" && !isLoading && fileInputRef.current?.click()}
                  >
                    <div className={cn("text-primary/80", fileHover ? "animate-bounce" : "")}>
                      <UploadIcon size={24} />
                    </div>
                    <div className="text-center px-4">
                      {fileHover ? (
                        <p className="font-medium text-primary text-sm">Release to upload</p>
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
