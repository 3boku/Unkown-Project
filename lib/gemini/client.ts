import { GoogleGenAI } from "@google/genai";

export const DEFAULT_GEMINI_MODEL = "gemini-4";
const ARGON_MODEL = "gemini-4-argon";
const VERTEX_FALLBACK_MODEL = "gemini-3-flash-preview";

let cachedClient: GoogleGenAI | null = null;
let cachedKeyOrProject: string | null = null;

/**
 * Returns the configured default Gemini model name.
 */
export function getDefaultGeminiModel(): string {
  return (
    process.env.GEMINI_MODEL?.trim() ||
    process.env.GEMINI_DEFAULT_MODEL?.trim() ||
    DEFAULT_GEMINI_MODEL
  );
}

/**
 * Resolves the actual API model identifier for @google/genai calls.
 * Maps 'gemini-4' / 'gemini-4-argon' to gemini-4-argon on AI Studio (API key),
 * or to the active Gemini preview model on Vertex AI, which does not serve it.
 */
export function resolveApiModelName(requestedModel?: string): string {
  const raw = requestedModel?.trim() || getDefaultGeminiModel();
  if (raw.toLowerCase().startsWith("gemini-4")) {
    return process.env.GEMINI_API_KEY?.replace(/^"|"$/g, "").trim()
      ? ARGON_MODEL
      : VERTEX_FALLBACK_MODEL;
  }
  return raw;
}

/**
 * True when Gemini can be called: an API key, or a GCP project / Cloud Run
 * service identity for Vertex AI via ADC.
 */
export function hasGeminiCredentials(): boolean {
  return Boolean(
    process.env.GEMINI_API_KEY?.replace(/^"|"$/g, "").trim() ||
      process.env.GCP_PROJECT_ID?.replace(/^"|"$/g, "").trim() ||
      process.env.K_SERVICE,
  );
}

/**
 * Returns a singleton GoogleGenAI client initialized with GEMINI_API_KEY
 * or Vertex AI (GCP_PROJECT_ID) when GEMINI_API_KEY is not set.
 */
export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.replace(/^"|"$/g, "").trim();

  if (apiKey) {
    if (!cachedClient || cachedKeyOrProject !== `key:${apiKey}`) {
      cachedClient = new GoogleGenAI({ apiKey });
      cachedKeyOrProject = `key:${apiKey}`;
    }
    return cachedClient;
  }

  const project =
    process.env.GCP_PROJECT_ID?.replace(/^"|"$/g, "").trim() ||
    "kr-devsummit26icn-504";
  const location =
    process.env.GCP_LOCATION?.replace(/^"|"$/g, "").trim() || "global";

  const cacheId = `vertex:${project}:${location}`;
  if (!cachedClient || cachedKeyOrProject !== cacheId) {
    cachedClient = new GoogleGenAI({
      vertexai: true,
      project,
      location,
    });
    cachedKeyOrProject = cacheId;
  }

  return cachedClient;
}
