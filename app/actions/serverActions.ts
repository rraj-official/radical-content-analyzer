'use server'

// This file contains server actions used throughout the application
// Add necessary server actions as needed

import { VideoAnalysisResult } from '@/lib/interfaces';

export async function sendFeedback(feedbackData: any) {
  // Implement feedback functionality
  console.log('Feedback received:', feedbackData);
  return { success: true };
}

export async function recordFeedback(feedbackData: any) {
  // Another name for the feedback function, used by some components
  return sendFeedback(feedbackData);
}

export async function saveAnalysisData(analysisData: any) {
  // Implement saving analysis data
  console.log('Analysis data saved:', analysisData);
  return { success: true, id: 'analysis-' + Date.now() };
}

export async function getAnalysisById(id: string) {
  console.log('Fetching analysis for ID:', id);

  // Check if it's a mock ID for development/testing
  if (id.startsWith('mock-')) {
    const type = id.includes('video') ? 'video' :
      id.includes('apk') ? 'apk' : 'website';

    // Import and return appropriate mock data based on the ID type
    if (type === 'video') {
      const { getMockVideoAnalysis } = require('@/lib/interfaces');
      return getMockVideoAnalysis();
    } else if (type === 'apk') {
      const { getMockApkAnalysis } = require('@/lib/interfaces');
      return getMockApkAnalysis();
    } else {
      const { getMockWebsiteAnalysis } = require('@/lib/interfaces');
      return getMockWebsiteAnalysis();
    }
  }

  // For real analysis IDs, you would query your database here
  // This is a temporary implementation that creates realistic-looking data
  // In production, replace this with actual database queries

  try {
    // Generate dummy data based on the analysis ID
    // In a real implementation, you would fetch this from your database
    return {
      type: "video",
      analysisId: id,
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      lastAnalyzedAt: new Date().toISOString(),
      feedbackGiven: false,
      inputParameters: {
        videoThumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
        videoDuration: 212,
        videoTitle: "Example Video Analysis",
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
  } catch (error) {
    console.error("Error fetching analysis data:", error);
    return null;
  }
}

export async function fetchAnalysis(id: string) {
  console.log("Fetching analysis for ID:", id);

  // Check if it's from a video API call
  if (id.startsWith('video-analysis-') || id.startsWith('error-')) {
    console.log("Processing API-generated analysis ID:", id);
    // This is a real analysis ID from the API
    // In a real app, you would fetch this from a database

    // For now, we'll create a realistic-looking result
    return {
      type: "video",
      analysisId: id,
      url: id.startsWith('error-') ? "error" : "https://www.youtube.com/watch?v=example",
      lastAnalyzedAt: new Date().toISOString(),
      feedbackGiven: false,
      inputParameters: {
        videoThumbnail: "https://img.youtube.com/vi/example/maxresdefault.jpg",
        videoDuration: 120,
        videoTitle: id.startsWith('error-') ? "Error Processing Video" : "API-Generated Analysis",
        transcription: {
          english: id.startsWith('error-')
            ? "An error occurred during processing"
            : "This analysis was generated from a real API call with mock data.",
          hindi: "यह विश्लेषण मॉक डेटा के साथ एक वास्तविक API कॉल से उत्पन्न किया गया था।"
        }
      },
      outputParameters: {
        radicalProbability: 35,
        radicalContent: 25,
        overallScore: {
          score: id.startsWith('error-') ? 0 : 65,
          label: id.startsWith('error-') ? "Error" : "Moderate Concern",
          color: id.startsWith('error-') ? "gray" : "amber"
        },
        lexicalAnalysis: "API-generated analysis result with mock data",
        emotionAnalysis: "API-generated analysis result with mock data",
        speechPatterns: "API-generated analysis result with mock data",
        religiousRhetoric: "API-generated analysis result with mock data",
        commandsDirectives: "API-generated analysis result with mock data",
        overallAssessment: id.startsWith('error-')
          ? "An error occurred while processing this video"
          : "This analysis was generated from the API endpoint with mock data as dependencies might be missing.",
        riskFactors: ["API mock data"],
        safetyTips: ["This is test data from the API endpoint"]
      }
    };
  }

  // If it's not from API, call the regular method
  return getAnalysisById(id);
}

export async function analyzeUrlsFromCSV(csvData: string) {
  // Implement CSV analysis functionality
  console.log('Analyzing URLs from CSV data length:', csvData.length);

  // Extract URLs from CSV data (simplified implementation)
  const urls = csvData.split(',').map(url => url.trim()).filter(url => url.length > 0);

  return {
    success: true,
    urls,
    totalUrls: urls.length,
    results: []
  };
}

export async function processWebsite(url: string, options?: any) {
  // Implement website processing functionality
  console.log('Processing website:', url, options);
  return {
    success: true,
    url,
    timestamp: new Date().toISOString(),
    analysisResults: {},
    screenshot_url: 'https://example.com/screenshot.jpg',
    sts_url: 'https://example.com/sts',
    output_json: {},
    overall_score: 0.5,
    status: 'completed'
  };
}

export async function analyzeVideoUrl(url: string) {
  // Call the video analysis API
  try {
    // Improved URL construction for Vercel deployments
    let origin;
    
    if (process.env.NODE_ENV === 'production') {
      // In production on Vercel, try multiple approaches to get the correct URL
      if (process.env.VERCEL_URL) {
        origin = `https://${process.env.VERCEL_URL}`;
      } else if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
        origin = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
      } else if (process.env.VERCEL_BRANCH_URL) {
        origin = `https://${process.env.VERCEL_BRANCH_URL}`;
      } else {
        // Fallback - try to extract from headers if this is running in a request context
        const headers = await import('next/headers');
        try {
          const host = headers.headers().get('host');
          origin = host ? `https://${host}` : 'https://localhost:3000';
        } catch {
          // If headers are not available, use a fallback
          origin = 'https://localhost:3000';
        }
      }
    } else {
      // Development environment
      origin = 'http://localhost:3000';
    }
    
    console.log('🌐 Using origin for API call:', origin);
    console.log('🔧 Environment variables available:', {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_URL: process.env.VERCEL_URL,
      VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
      VERCEL_BRANCH_URL: process.env.VERCEL_BRANCH_URL,
    });

    const apiUrl = `${origin}/api/analyze/video`;
    console.log('📡 Making API call to:', apiUrl);
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });

    console.log('📡 API Response status:', response.status);
    console.log('📡 API Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      console.error('❌ API Response not ok:', response.status, response.statusText);
      
      // Try to get error details
      let errorData;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        errorData = await response.json();
      } else {
        // If it's HTML or another format, it means we hit the wrong endpoint
        const textResponse = await response.text();
        console.error('❌ Received non-JSON response (likely HTML error page):', textResponse.substring(0, 200));
        throw new Error(`API endpoint not found or returned HTML. Check if the API route exists at ${apiUrl}`);
      }
      
      throw new Error(errorData?.error || `HTTP ${response.status}: Failed to analyze video`);
    }

    const result = await response.json();
    console.log('✅ API call successful, received result');
    return result;
  } catch (error) {
    console.error('❌ Error analyzing video:', error);
    throw error;
  }
}

export async function analyzeVideoFile(formData: FormData) {
  // Call the video file analysis API
  try {
    // Improved URL construction for Vercel deployments (same as analyzeVideoUrl)
    let origin;
    
    if (process.env.NODE_ENV === 'production') {
      // In production on Vercel, try multiple approaches to get the correct URL
      if (process.env.VERCEL_URL) {
        origin = `https://${process.env.VERCEL_URL}`;
      } else if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
        origin = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
      } else if (process.env.VERCEL_BRANCH_URL) {
        origin = `https://${process.env.VERCEL_BRANCH_URL}`;
      } else {
        // Fallback - try to extract from headers if this is running in a request context
        const headers = await import('next/headers');
        try {
          const host = headers.headers().get('host');
          origin = host ? `https://${host}` : 'https://localhost:3000';
        } catch {
          // If headers are not available, use a fallback
          origin = 'https://localhost:3000';
        }
      }
    } else {
      // Development environment
      origin = 'http://localhost:3000';
    }
    
    console.log('🌐 Using origin for video file API call:', origin);
    
    const apiUrl = `${origin}/api/analyze/video-file`;
    console.log('📡 Making video file API call to:', apiUrl);
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      body: formData,
    });

    console.log('📡 Video file API Response status:', response.status);

    if (!response.ok) {
      console.error('❌ Video file API Response not ok:', response.status, response.statusText);
      
      // Try to get error details
      let errorData;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        errorData = await response.json();
      } else {
        // If it's HTML or another format, it means we hit the wrong endpoint
        const textResponse = await response.text();
        console.error('❌ Received non-JSON response (likely HTML error page):', textResponse.substring(0, 200));
        throw new Error(`API endpoint not found or returned HTML. Check if the API route exists at ${apiUrl}`);
      }
      
      throw new Error(errorData?.error || `HTTP ${response.status}: Failed to analyze video file`);
    }

    const result = await response.json();
    console.log('✅ Video file API call successful, received result');
    return result;
  } catch (error) {
    console.error('❌ Error analyzing video file:', error);
    throw error;
  }
}

// Add any other server actions needed by the application 