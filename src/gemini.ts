import { GoogleGenAI } from "@google/genai";
import { getGeminiApiKey } from "./env";

let geminiClientInstance: GoogleGenAI | null = null;

/**
 * Initializes and returns the shared GoogleGenAI client instance.
 * Reads the key safely from GEMINI_API_KEY or VITE_GEMINI_API_KEY.
 * Throws a helpful error if the API key is not configured.
 */
export function getGeminiClient(): GoogleGenAI {
  if (geminiClientInstance) {
    return geminiClientInstance;
  }

  const apiKey = getGeminiApiKey();

  if (!apiKey) {
    throw new Error(
      "Gemini API Key is missing. Please provide GEMINI_API_KEY or VITE_GEMINI_API_KEY in your environment configuration."
    );
  }

  geminiClientInstance = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });

  return geminiClientInstance;
}
