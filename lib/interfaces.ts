// Frontend interfaces without backend implementation
export interface WebsiteAnalysisResult {
  type: "website";
  analysisId: string;
  url: string;
  lastAnalyzedAt: string;
  feedbackGiven: boolean;
  inputParameters: {
    websiteScreenshot?: string;
    domainDetails?: any;
    sslDetails?: any;
    contactDetails?: any;
    content?: string;
  };
  outputParameters: {
    scamProbability: number;
    trustScore: number;
    riskFactors: string[];
    legitimateFactors: string[];
    overallAssessment: string;
    domainAssessment: string;
    contentAssessment: string;
    redFlags: string[];
    safetyTips: string[];
  };
}

// New interface for video analysis
export interface VideoAnalysisResult {
  type: "video";
  analysisId: string;
  url: string;
  lastAnalyzedAt: string;
  feedbackGiven: boolean;
  success?: boolean;
  message?: string;
  inputParameters: {
    videoThumbnail?: string;
    videoDuration?: number;
    videoTitle?: string;
    transcription?: {
      english?: string;
      hindi?: string;
    };
  };
  outputParameters: {
    radicalProbability: number;
    radicalContent: number;
    overallScore: {
      score: number;
      label: string;
      color: string;
    };
    lexicalAnalysis: string;
    emotionAnalysis: string;
    speechPatterns: string;
    religiousRhetoric: string;
    commandsDirectives: string;
    overallAssessment: string;
    riskFactors: string[];
    safetyTips: string[];
  };
}

export interface ApkAnalysisResult {
  type: "apk";
  analysisId: string;
  url: string | null;
  lastAnalyzedAt: string;
  feedbackGiven: boolean;
  inputParameters: {
    apkMetadata?: ApkMetadata;
  };
  outputParameters: {
    scamProbability: number;
    trustScore: number;
    riskFactors: string[];
    legitimateFactors: string[];
    overallAssessment: string;
    redFlags: string[];
    safetyTips: string[];
  };
}

export interface ApkMetadata {
  packageName: string;
  versionCode: string;
  versionName: string;
  applicationLabel: string;
  permissions: string[];
  features: string[];
  activities: string[];
  services: string[];
  providers: string[];
  receivers: string[];
  signatureInfo?: string[];
}

export type AnalysisResult = WebsiteAnalysisResult | ApkAnalysisResult | VideoAnalysisResult;

// Mock data functions for UI development
export function getMockWebsiteAnalysis(): WebsiteAnalysisResult {
  return {
    type: "website",
    analysisId: "mock-analysis-id",
    url: "https://example.com",
    lastAnalyzedAt: new Date().toISOString(),
    feedbackGiven: false,
    inputParameters: {
      websiteScreenshot: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      domainDetails: { creationDate: "2023-01-01", expiryDate: "2024-01-01" },
      sslDetails: { valid: true, expiryDate: "2024-01-01" },
      content: "This is a sample website content for UI development purposes."
    },
    outputParameters: {
      scamProbability: 0.75,
      trustScore: 25,
      riskFactors: ["Recently created domain", "Suspicious URL pattern"],
      legitimateFactors: ["Valid SSL certificate"],
      overallAssessment: "This website shows multiple characteristics of a potential scam.",
      domainAssessment: "Domain was registered recently which is suspicious.",
      contentAssessment: "Content appears to make unrealistic promises.",
      redFlags: ["Domain created less than 6 months ago", "Poor grammar and spelling"],
      safetyTips: ["Verify the company through official channels", "Don't share personal information"]
    }
  };
}

// Add a mock function for video analysis
export function getMockVideoAnalysis(): VideoAnalysisResult {
  return {
    type: "video",
    analysisId: "mock-video-analysis-id",
    url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    lastAnalyzedAt: new Date().toISOString(),
    feedbackGiven: false,
    inputParameters: {
      videoThumbnail: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      videoDuration: 212,
      videoTitle: "Example Video Title",
      transcription: {
        english: "This is a sample English transcription for testing purposes.",
        hindi: "यह परीक्षण उद्देश्यों के लिए एक नमूना हिंदी प्रतिलेखन है।"
      }
    },
    outputParameters: {
      radicalProbability: 45,
      radicalContent: 30,
      overallScore: {
        score: 65,
        label: "Moderate Concern",
        color: "amber"
      },
      lexicalAnalysis: "The content uses moderate religious terminology but lacks explicit radical terms.",
      emotionAnalysis: "Emotional tone shifts between neutral and slightly negative when discussing opposing views.",
      speechPatterns: "Speaker uses repetition to emphasize certain points, but doesn't show extreme intensity.",
      religiousRhetoric: "References to religious texts are present but not used to justify extreme actions.",
      commandsDirectives: "Few direct calls to action are present, mostly focused on peaceful practices.",
      overallAssessment: "The content shows some concerning elements but lacks explicit calls for radical action.",
      riskFactors: ["Use of exclusionary language", "References to divine punishment"],
      safetyTips: ["Consider the broader context", "Verify claims with established sources"]
    }
  };
}

export function getMockApkAnalysis(): ApkAnalysisResult {
  return {
    type: "apk",
    analysisId: "mock-apk-analysis-id",
    url: null,
    lastAnalyzedAt: new Date().toISOString(),
    feedbackGiven: false,
    inputParameters: {
      apkMetadata: {
        packageName: "com.example.app",
        versionCode: "1",
        versionName: "1.0",
        applicationLabel: "Example App",
        permissions: [
          "android.permission.INTERNET",
          "android.permission.READ_CONTACTS",
          "android.permission.ACCESS_FINE_LOCATION"
        ],
        features: ["android.hardware.camera"],
        activities: ["com.example.app.MainActivity"],
        services: ["com.example.app.MyService"],
        providers: ["com.example.app.MyProvider"],
        receivers: ["com.example.app.MyReceiver"],
        signatureInfo: ["SHA-256: AB:CD:EF:12:34:56"]
      }
    },
    outputParameters: {
      scamProbability: 0.85,
      trustScore: 15,
      riskFactors: ["Excessive permissions", "Unknown developer"],
      legitimateFactors: ["Available on official app store"],
      overallAssessment: "This app requests suspicious permissions and shows characteristics of potentially harmful software.",
      redFlags: ["Requests unnecessary permissions", "Unclear privacy policy"],
      safetyTips: ["Check app reviews before installing", "Be cautious about providing personal data"]
    }
  };
}
