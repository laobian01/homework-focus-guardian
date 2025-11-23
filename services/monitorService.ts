import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AnalysisResult, FocusStatus } from "../types";

const apiKey = process.env.API_KEY; // API Key injected by environment

const ai = new GoogleGenAI({ apiKey: apiKey });

const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    status: {
      type: Type.STRING,
      enum: [FocusStatus.FOCUSED, FocusStatus.DISTRACTED, FocusStatus.ABSENT],
      description: "The assessed state of the student.",
    },
    message: {
      type: Type.STRING,
      description: "A short, encouraging or correcting message in Chinese (Mandarin) suitable for a child.",
    },
    confidence: {
      type: Type.NUMBER,
      description: "Confidence level between 0 and 1.",
    },
  },
  required: ["status", "message", "confidence"],
};

export const analyzeFrame = async (base64Image: string): Promise<AnalysisResult> => {
  if (!apiKey) {
    throw new Error("API Key is missing.");
  }

  // Remove data URL prefix if present
  const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: cleanBase64,
            },
          },
          {
            text: `Analyze this image of a student doing homework. 
            Determine if they are FOCUSED (looking at paper/book, writing, reading), 
            DISTRACTED (looking away, playing with toys, sleeping, using phone), 
            or ABSENT (empty chair).
            Provide a short voice message text in Chinese.
            If FOCUSED, say something encouraging like "很棒，继续保持".
            If DISTRACTED, say something gentle like "请专心写作业哦".
            If ABSENT, say "人去哪里了".`
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        systemInstruction: "You are a homework monitoring assistant. Be strict but kind.",
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    const result = JSON.parse(text) as AnalysisResult;
    return result;

  } catch (error) {
    console.error("Analysis failed:", error);
    return {
      status: FocusStatus.ERROR,
      message: "Analysis failed",
      confidence: 0
    };
  }
};
