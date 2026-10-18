import type { Part } from "@google/genai";

export type GeminiErrorCode =
  | "CONFIG_ERROR"
  | "VALIDATION_ERROR"
  | "TEMPLATE_NOT_FOUND"
  | "UNSUPPORTED_MEDIA_TYPE"
  | "PAYLOAD_TOO_LARGE"
  | "GENERATION_ERROR";

export class GeminiError extends Error {
  code: GeminiErrorCode;
  statusCode: number;
  details?: unknown;

  constructor(
    code: GeminiErrorCode,
    message: string,
    statusCode = 500,
    details?: unknown
  ) {
    super(message);
    this.name = "GeminiError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export interface GeminiThinkingConfig {
  thinkingBudget?: number;
  includeThoughts?: boolean;
}

export interface GeminiGenerationConfig {
  temperature?: number;
  topP?: number;
  topK?: number;
  maxOutputTokens?: number;
  stopSequences?: string[];
  responseMimeType?: string;
  responseSchema?: unknown;
  responseJsonSchema?: unknown;
  thinkingConfig?: GeminiThinkingConfig;
}

export interface PromptTemplateConfig {
  id: string;
  description: string;
  systemInstruction?: string;
  template: string;
  defaultConfig?: GeminiGenerationConfig;
}

export interface ResolvedPromptTemplate {
  templateId: string;
  prompt: string;
  systemInstruction?: string;
  defaultConfig?: GeminiGenerationConfig;
}

export interface GenerateTextOptions {
  prompt: string;
  systemInstruction?: string;
  model?: string;
  config?: GeminiGenerationConfig;
}

export interface GenerateFromTemplateOptions {
  templateId: string;
  variables?: Record<string, string | number | boolean>;
  model?: string;
  systemInstructionOverride?: string;
  config?: GeminiGenerationConfig;
}

export interface GenerateMultimodalOptions {
  prompt?: string;
  templateId?: string;
  variables?: Record<string, string | number | boolean>;
  media: Part[];
  systemInstruction?: string;
  model?: string;
  config?: GeminiGenerationConfig;
}

export interface GeminiUsageMetadata {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
}

export interface GeminiGenerationResult {
  text: string;
  model: string;
  templateId?: string;
  usage?: GeminiUsageMetadata;
}

export interface GeminiApiResponse<T = GeminiGenerationResult> {
  success: boolean;
  data?: T;
  error?: {
    code: GeminiErrorCode | string;
    message: string;
  };
}
