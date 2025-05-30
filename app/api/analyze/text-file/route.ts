import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import OpenAI from 'openai';

// -----------------------------
// HELPER FUNCTIONS (shared with video analysis routes)
// -----------------------------

// Removes all "**" and extra whitespace
function removeAsterisks(str: string): string {
  return str.replace(/\*\*/g, "").trim();
}

// We skip any lines that merely repeat "Lexical Analysis", "Emotion and Sentiment", etc.
function shouldKeepRiskFactor(str: string): boolean {
  const skipPhrases = [
    "Lexical Analysis",
    "Emotion and Sentiment",
    "Speech Patterns and Intensity",
    "Use of Religious Rhetoric",
    "Frequency of Commands and Directives",
  ];
  return !skipPhrases.some((phrase) => str.includes(phrase));
}

// -----------------------------
// Initialize OpenAI
// -----------------------------

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper function to save uploaded text file and extract content
async function extractTextFromFile(file: File): Promise<string> {
  try {
    console.log(`[TEXT EXTRACTION] Starting text extraction from file: ${file.name}`);
    console.log(`[TEXT EXTRACTION] File type: ${file.type}, size: ${file.size} bytes`);

    // Check file type and extract text accordingly
    if (file.type === 'text/plain') {
      // For .txt files, directly read as text
      const text = await file.text();
      console.log(`[TEXT EXTRACTION] SUCCESS: Extracted ${text.length} characters from plain text file`);
      return text;
    } else if (file.type === 'application/msword' || 
               file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      // For .doc/.docx files, we would need a library like mammoth.js
      // For now, we'll throw an error and ask user to convert to .txt
      throw new Error('DOC/DOCX files are not yet supported. Please convert to .txt format.');
    } else {
      throw new Error(`Unsupported file type: ${file.type}. Please upload a .txt file.`);
    }
  } catch (error) {
    console.error(`[TEXT EXTRACTION] ERROR: Failed to extract text: ${error}`);
    throw error;
  }
}

// Helper function to analyze text content with OpenAI
async function analyzeTextContent(textContent: string): Promise<any> {
  try {
    console.log(`[TEXT ANALYSIS] Starting OpenAI analysis for text content (${textContent.length} characters)`);

    const prompt = `
You are an expert in analyzing text content for potential radical or extremist messaging. Please analyze the following text content and provide a comprehensive assessment.

Text Content:
"""
${textContent}
"""

Please provide your analysis in the following JSON format:

{
  "radicalProbability": <number between 0-100>,
  "radicalContent": <number between 0-100>,
  "lexicalAnalysis": "<detailed analysis of word choice, terminology, and language patterns>",
  "emotionAnalysis": "<analysis of emotional tone, sentiment, and psychological indicators>",
  "speechPatterns": "<analysis of communication style and intensity markers>",
  "religiousRhetoric": "<assessment of religious or ideological rhetoric usage>",
  "commandsDirectives": "<analysis of calls to action, commands, or directives>",
  "overallAssessment": "<comprehensive summary of findings>",
  "riskFactors": ["<list of specific concerning elements found>"],
  "safetyTips": ["<list of safety recommendations>"]
}

Focus on:
1. Identifying extremist language patterns and terminology
2. Detecting calls for violence or harmful actions
3. Assessing the use of divisive or inflammatory rhetoric
4. Evaluating emotional manipulation techniques
5. Identifying potential radicalization indicators

Provide specific, actionable insights while being objective and evidence-based.
`;

    console.log(`[TEXT ANALYSIS] Sending request to OpenAI...`);
    const completion = await openai.chat.completions.create({
      model: "gpt-4-1106-preview",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 2000,
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      throw new Error("No response received from OpenAI");
    }

    console.log(`[TEXT ANALYSIS] Received response from OpenAI (${responseText.length} characters)`);

    // Parse the JSON response
    let analysisResult;
    try {
      // Extract JSON from the response (in case there's extra text)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No valid JSON found in OpenAI response");
      }
    } catch (parseError) {
      console.error(`[TEXT ANALYSIS] JSON parsing failed: ${parseError}`);
      // Fallback: create a structured response from the text
      analysisResult = {
        radicalProbability: 25,
        radicalContent: 20,
        lexicalAnalysis: "Analysis completed but response parsing failed. Please review manually.",
        emotionAnalysis: "Unable to parse detailed emotion analysis.",
        speechPatterns: "Unable to parse speech pattern analysis.",
        religiousRhetoric: "Unable to parse religious rhetoric analysis.",
        commandsDirectives: "Unable to parse commands analysis.",
        overallAssessment: responseText.substring(0, 500) + "...",
        riskFactors: ["Response parsing failed - manual review recommended"],
        safetyTips: ["Verify analysis manually due to parsing issues"]
      };
    }

    // Ensure all required fields exist with fallback values
    const finalResult = {
      radicalProbability: analysisResult.radicalProbability || 0,
      radicalContent: analysisResult.radicalContent || 0,
      lexicalAnalysis: removeAsterisks(analysisResult.lexicalAnalysis || "No lexical analysis available"),
      emotionAnalysis: removeAsterisks(analysisResult.emotionAnalysis || "No emotion analysis available"),
      speechPatterns: removeAsterisks(analysisResult.speechPatterns || "No speech pattern analysis available"),
      religiousRhetoric: removeAsterisks(analysisResult.religiousRhetoric || "No religious rhetoric analysis available"),
      commandsDirectives: removeAsterisks(analysisResult.commandsDirectives || "No commands analysis available"),
      overallAssessment: removeAsterisks(analysisResult.overallAssessment || "Analysis completed successfully"),
      riskFactors: extractRiskFactors(JSON.stringify(analysisResult)),
      safetyTips: generateSafetyTips(analysisResult.radicalProbability || 0, analysisResult.radicalContent || 0)
    };

    console.log(`[TEXT ANALYSIS] SUCCESS: Analysis completed with scores - Radical Probability: ${finalResult.radicalProbability}%, Radical Content: ${finalResult.radicalContent}%`);
    return finalResult;

  } catch (error) {
    console.error(`[TEXT ANALYSIS] ERROR: Failed to analyze text content: ${error}`);
    throw new Error(`Failed to analyze text content: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Helper function to extract risk factors from analysis text
function extractRiskFactors(text: string): string[] {
  const factors: string[] = [];

  // Look for bullet points or numbered lists
  const listItemRegex = /(?:[-•*]\s*|^\d+\.?\s*)(.*?)(?=\n|$)/gm;
  let match;
  while ((match = listItemRegex.exec(text)) !== null) {
    if (match[1] && shouldKeepRiskFactor(match[1]) && match[1].trim().length > 10) {
      factors.push(match[1].trim());
    }
    if (factors.length >= 5) break;
  }

  // If no list items found, try extracting key phrases
  if (factors.length === 0) {
    const keywords = ["concern", "warning", "caution", "problematic", "radical", "extreme"];
    for (const keyword of keywords) {
      const keywordRegex = new RegExp(`[^.!?]*${keyword}[^.!?]*[.!?]`, 'gi');
      let keywordMatch;
      while ((keywordMatch = keywordRegex.exec(text)) !== null) {
        if (keywordMatch[0] && keywordMatch[0].trim().length > 15) {
          factors.push(keywordMatch[0].trim());
        }
        if (factors.length >= 5) break;
      }
      if (factors.length >= 5) break;
    }
  }

  // If still no factors, create generic ones
  if (factors.length === 0) {
    factors.push("Potential concerning content detected");
    factors.push("Review content for harmful messaging");
  }

  return factors.slice(0, 5);
}

// Helper function to generate safety tips
function generateSafetyTips(radicalProbability: number, radicalContent: number): string[] {
  const tips = [
    "Consider the broader context before drawing conclusions",
    "Verify claims with established and reliable sources",
    "Be aware of emotional manipulation in content",
    "Recognize that strong opinions are not necessarily radical",
    "Seek diverse perspectives on controversial topics"
  ];

  if (radicalProbability > 70 || radicalContent > 70) {
    tips.push("Approach this content with critical thinking");
    tips.push("Be cautious about sharing potentially harmful content");
  }

  return tips.slice(0, 5);
}

// Main function to process uploaded text file
async function processTextFile(file: File): Promise<any> {
  try {
    console.log(`[PROCESS] Starting text file analysis for: ${file.name}`);

    // Step 1: Extract text content from file
    console.log(`[PROCESS] Step 1: Extracting text content`);
    const textContent = await extractTextFromFile(file);

    if (!textContent || textContent.trim().length === 0) {
      throw new Error("No text content found in the uploaded file");
    }

    // Step 2: Analyze text content with OpenAI
    console.log(`[PROCESS] Step 2: Analyzing text content with OpenAI`);
    const analysis = await analyzeTextContent(textContent);

    // Create file details
    const fileName = file.name.replace(/\.[^/.]+$/, ""); // Remove file extension
    const fileSize = file.size;

    // Generate a unique analysis ID
    const analysisId = `text-file-analysis-${uuidv4()}`;

    // Step 3: Format and return the result
    console.log(`[PROCESS] Step 3: Formatting final result with ID: ${analysisId}`);
    const result = {
      type: "text",
      analysisId: analysisId,
      url: `file://${file.name}`,
      lastAnalyzedAt: new Date().toISOString(),
      feedbackGiven: false,
      success: true,
      message: "Text file analysis completed successfully",
      inputParameters: {
        fileName: fileName,
        fileSize: fileSize,
        textContent: textContent.substring(0, 1000) + (textContent.length > 1000 ? "..." : ""), // First 1000 chars for preview
        fullTextLength: textContent.length
      },
      outputParameters: analysis
    };

    console.log(`[PROCESS] SUCCESS: Text file analysis completed`);
    return result;
  } catch (error) {
    console.error(`[PROCESS] ERROR: Text file analysis process failed: ${error}`);
    throw error;
  }
}

export async function POST(request: Request) {
  try {
    console.log(`[API] Received text file analysis request`);
    
    const formData = await request.formData();
    const file = formData.get('textFile') as File;

    if (!file) {
      console.error(`[API] ERROR: Missing text file parameter`);
      return NextResponse.json({ error: 'Text file is required' }, { status: 400 });
    }

    console.log(`[API] Processing text file: ${file.name}, size: ${file.size} bytes, type: ${file.type}`);

    // Validate file type
    const allowedTypes = ['text/plain'];
    if (!allowedTypes.includes(file.type)) {
      console.error(`[API] ERROR: Invalid file type: ${file.type}`);
      return NextResponse.json({ 
        error: 'Invalid file type. Please upload a .txt file.' 
      }, { status: 400 });
    }

    // Process text file
    const result = await processTextFile(file);

    console.log(`[API] SUCCESS: Text file analysis completed, returning results`);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error(`[API] ERROR: Failed to process text file analysis request: ${error}`);
    return NextResponse.json({ 
      error: error.message || 'Failed to process text file' 
    }, { status: 500 });
  }
} 