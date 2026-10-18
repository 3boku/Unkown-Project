import { GoogleGenAI } from "@google/genai";
import { GeminiError } from "./types.ts";

export const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

let cachedClient: GoogleGenAI | null = null;
let cachedApiKey: string | null = null;

/**
 * Returns the configured default Gemini model name.
 */
export function getDefaultGeminiModel(): string {
  return process.env.GEMINI_DEFAULT_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
}

/**
 * Returns a singleton GoogleGenAI client initialized with GEMINI_API_KEY.
 * Initializes lazily at call time so `next build` works without runtime secrets.
 */
export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    throw new GeminiError(
      "CONFIG_ERROR",
      "GEMINI_API_KEY 환경변수가 설정되지 않았습니다. .env.local 파일에 GEMINI_API_KEY를 설정해 주세요.",
      500
    );
  }

  if (!cachedClient || cachedApiKey !== apiKey) {
    cachedClient = new GoogleGenAI({ apiKey });
    cachedApiKey = apiKey;
  }

  return cachedClient;
}
