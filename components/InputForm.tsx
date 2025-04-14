"use client";
import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2Icon, UploadIcon, XIcon, GlobeIcon, FileIcon, ServerIcon, CloudIcon, FileTextIcon } from "lucide-react";
import { toast } from "sonner";
import { cn, isValidUrl } from "@/lib/utils";
import Image from "next/image";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAnalysisProgress } from "@/lib/contexts/AnalysisProgressContext";

export default function InputForm() {
  const [inputMethod, setInputMethod] = useState<"website" | "video" | "document">("website");
  const [inputUrl, setInputUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [modelType, setModelType] = useState<"hosted" | "online">("online");
  const [youtubeInfo, setYoutubeInfo] = useState<{
    thumbnail: string;
    title: string;
    duration: string;
    isLoading: boolean;
    showAnalysis?: boolean;
  } | null>(null);
  const analysisRef = useRef<HTMLDivElement>(null);
  const videoInfoRef = useRef<HTMLDivElement>(null);
  const buttonAreaRef = useRef<HTMLDivElement>(null);
  
  // Use the context for mock analysis
  const { analyzeUrl, analyzeApk } = useAnalysisProgress();

  // Function to check if URL is a YouTube link
  const isYoutubeUrl = (url: string): boolean => {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
    return youtubeRegex.test(url);
  };

  // Function to extract YouTube video ID
  const extractYoutubeId = (url: string): string | null => {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : null;
  };

  // Function to get YouTube video info (mock implementation)
  const getYoutubeVideoInfo = async (videoId: string) => {
    // In a real implementation, you would call an API to get video information
    // This is a mock implementation that simulates API delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    return {
      thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      title: "Sample YouTube Video Title",
      duration: "10:30"
    };
  };

  // Function to simulate radical content analysis after 5 seconds
  useEffect(() => {
    if (youtubeInfo && !youtubeInfo.isLoading && !youtubeInfo.showAnalysis) {
      const timer = setTimeout(() => {
        setYoutubeInfo(prev => prev ? {...prev, showAnalysis: true} : null);
        
        // Scroll to the button area after a small delay to ensure analysis is rendered
        setTimeout(() => {
          if (buttonAreaRef.current) {
            buttonAreaRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [youtubeInfo]);

  const handleAnalyze = async () => {
    if (!inputUrl && !file) {
      toast.error("Enter a URL or upload a file to analyze.");
      return;
    }
    
    setIsLoading(true);
    let analysisRecord;
    
    try {
      if (inputMethod === "website") {
        if (!isValidUrl(inputUrl)) {
          toast.error("Invalid website URL.");
          setIsLoading(false);
          return;
        }
        
        const formattedUrl = inputUrl.match(/^https?:\/\//)
          ? inputUrl
          : `https://${inputUrl}`;
          
        // Handle YouTube URL specifically for NovaVerse model
        if (modelType === "online" && isYoutubeUrl(formattedUrl)) {
          const videoId = extractYoutubeId(formattedUrl);
          
          if (videoId) {
            setYoutubeInfo({
              thumbnail: "",
              title: "",
              duration: "",
              isLoading: true
            });
            
            try {
              // Get YouTube video info
              const videoInfo = await getYoutubeVideoInfo(videoId);
              
              // Set YouTube info with the retrieved data
              setYoutubeInfo({
                thumbnail: videoInfo.thumbnail,
                title: videoInfo.title,
                duration: videoInfo.duration,
                isLoading: false,
                showAnalysis: false
              });
              
              // Don't navigate away - we'll show the YouTube info in the UI
              setIsLoading(false);
              return;
            } catch (error) {
              console.error("Error fetching YouTube video info:", error);
              toast.error("Failed to fetch YouTube video information.");
              setYoutubeInfo(null);
              setIsLoading(false);
              return;
            }
          }
        }
        
        // Regular URL analysis for non-YouTube URLs or NovaSentinel model
        analysisRecord = await analyzeUrl(formattedUrl);
      } else if (inputMethod === "video" || inputMethod === "document") {
        // Use the processFileForAnalysis helper
        analysisRecord = await processFileForAnalysis();
      }
      
      if (analysisRecord) {
        // Navigate to results page
        const targetName = inputMethod === 'website' 
          ? inputUrl.match(/^https?:\/\//) ? inputUrl : `https://${inputUrl}`
          : file?.name || '';
        
        window.location.href = `/analysis/${analysisRecord.analysisId}?type=${inputMethod}&target=${encodeURIComponent(targetName)}`;
      } else {
        toast.error("Failed to fetch data. Check if input is correct.");
      }
    } catch (error) {
      console.error("Error during analysis:", error);
      toast.error("An error occurred during analysis. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Clear YouTube info when input method or URL changes
  useEffect(() => {
    setYoutubeInfo(null);
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
      // Use the context's analyzeApk method (reusing for all file types)
      const result = await analyzeApk(file);
      if (!result) {
        throw new Error(`${inputMethod.charAt(0).toUpperCase() + inputMethod.slice(1)} analysis failed`);
      }
      return result;
    } catch (error) {
      console.error(`Error analyzing ${inputMethod} file:`, error);
      toast.error(`Failed to analyze ${inputMethod} file. Please try again.`);
      return null;
    }
  };

  return (
    <div className="w-full max-w-2xl animate-fade-in">
      <div className="p-6 rounded-xl border border-border/60 bg-card/50 backdrop-blur-sm shadow-sm transition-all duration-200 hover:shadow-md">
        {/* Tabs for input method selection */}
        <div className="flex justify-center mb-5">
          <div className="inline-flex bg-accent/80 rounded-lg p-1 gap-1">
            <button
              className={`rounded-md py-2 px-4 flex items-center gap-2 transition-all duration-150 ${
                inputMethod === "website"
                  ? "bg-background shadow-sm font-medium text-foreground"
                  : "bg-accent text-accent-foreground hover:bg-accent/70"
              }`}
              onClick={() => setInputMethod("website")}
              disabled={isLoading}
            >
              <GlobeIcon size={16} />
              YouTube URL
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
          {/* Website URL input */}
          <div className={`transition-all duration-300 ${inputMethod === "website" ? "opacity-100 visible" : "opacity-0 invisible absolute top-0 left-0 right-0"}`}>
            <div className="space-y-3">
              <div>
                <Label htmlFor="url" className="text-sm font-medium block mb-1.5">
                  Enter YouTube URL
                </Label>
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <Input
                      name="url"
                      type="url"
                      value={inputUrl}
                      disabled={isLoading || Boolean(youtubeInfo && !youtubeInfo.isLoading)}
                      onChange={(e) => setInputUrl(e.target.value)}
                      placeholder="https://example.com"
                      autoFocus
                      className="pr-10 transition-all duration-150 border-input/60 focus-visible:border-primary/60 h-9"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && inputMethod === "website" && !isLoading) {
                          handleAnalyze();
                        }
                      }}
                    />
                    {inputUrl && inputMethod === "website" && !isLoading && !youtubeInfo && (
                      <button 
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors duration-150"
                        onClick={() => setInputUrl("")}
                      >
                        <XIcon size={16} />
                      </button>
                    )}
                  </div>
                  <Button
                    onClick={!isLoading && inputMethod === "website" ? handleAnalyze : undefined}
                    className="h-9 px-4 transition-all duration-200 bg-primary/90 hover:bg-primary"
                    disabled={isLoading || Boolean(youtubeInfo && !youtubeInfo.isLoading)}
                  >
                    {isLoading && inputMethod === "website" ? (
                      <div className="flex items-center gap-2">
                        <Loader2Icon size={16} className="animate-spin" />
                        <span>Analyzing...</span>
                      </div>
                    ) : (
                      "Analyze"
                    )}
                  </Button>
                </div>
                {!youtubeInfo && (
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {modelType === "online" && isYoutubeUrl(inputUrl) ? 
                      "NovaVerse model will analyze YouTube videos for harmful content." : 
                      "We'll analyze the website for potential scams and security issues."}
                  </p>
                )}
              </div>
              
              {/* YouTube Video Analysis UI for NovaVerse */}
              {youtubeInfo && (
                <div className="mt-4 border rounded-lg p-4 bg-accent/30 animate-slide-up">
                  {youtubeInfo.isLoading ? (
                    <div className="flex flex-col items-center justify-center py-6 space-y-4">
                      <Loader2Icon size={32} className="animate-spin text-primary" />
                      <div className="text-center">
                        <p className="font-medium">Loading YouTube video information...</p>
                        <p className="text-sm text-muted-foreground mt-1">This may take a moment</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-col md:flex-row gap-4" ref={videoInfoRef}>
                        {/* Video Thumbnail */}
                        <div className="relative w-full md:w-1/3 aspect-video rounded-lg overflow-hidden border">
                          <Image
                            src={youtubeInfo.thumbnail}
                            alt="YouTube Video Thumbnail"
                            fill
                            className="object-cover"
                          />
                        </div>
                        
                        {/* Video Information */}
                        <div className="flex-1 flex flex-col">
                          <h3 className="font-medium text-lg line-clamp-2">{youtubeInfo.title}</h3>
                          <p className="text-sm text-muted-foreground mt-1">Length: {youtubeInfo.duration}</p>
                          
                          <div className="mt-auto">
                            <div className="flex items-center gap-2 mt-4 text-sm">
                              {youtubeInfo.showAnalysis ? (
                                <p className="text-green-600 font-medium">Analysis Completed in 2 mins</p>
                              ) : (
                                <>
                                  <Loader2Icon size={16} className="animate-spin text-primary" />
                                  <span>Downloading and analyzing video...</span>
                                </>
                              )}
                            </div>
                            {!youtubeInfo.showAnalysis && (
                              <p className="text-xs text-muted-foreground mt-1">Estimated time: 2 mins</p>
                            )}
                            
                            {!youtubeInfo.showAnalysis && (
                              <div className="mt-4 flex gap-2" ref={buttonAreaRef}>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="flex-1"
                                  onClick={() => setYoutubeInfo(null)}
                                >
                                  Cancel
                                </Button>
                                <Button 
                                  variant="default" 
                                  size="sm" 
                                  className="flex-1"
                                  disabled={Boolean(true)}
                                >
                                  <Loader2Icon size={14} className="animate-spin mr-2" />
                                  Analyzing
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Radical Content Analysis */}
                      {youtubeInfo.showAnalysis && (
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
