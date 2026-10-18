import type { GoogleGenAI, Part } from "@google/genai";
import { getDefaultGeminiModel, getGeminiClient } from "./client.ts";
import { resolvePromptTemplate } from "./prompts.ts";
import {
  GeminiError,
  type GeminiGenerationConfig,
  type GeminiGenerationResult,
  type GenerateFromTemplateOptions,
  type GenerateMultimodalOptions,
  type GenerateTextOptions,
} from "./types.ts";

function buildGenerateConfig(
  systemInstruction?: string,
  config?: GeminiGenerationConfig
) {
  const merged: Record<string, unknown> = {};

  if (systemInstruction?.trim()) {
    merged.systemInstruction = systemInstruction.trim();
  }

  if (config) {
    if (config.temperature !== undefined) merged.temperature = config.temperature;
    if (config.topP !== undefined) merged.topP = config.topP;
    if (config.topK !== undefined) merged.topK = config.topK;
    if (config.maxOutputTokens !== undefined) {
      merged.maxOutputTokens = config.maxOutputTokens;
    }
    if (config.stopSequences?.length) {
      merged.stopSequences = config.stopSequences;
    }
    if (config.responseMimeType) {
      merged.responseMimeType = config.responseMimeType;
    }
    if (config.responseJsonSchema !== undefined) {
      merged.responseJsonSchema = config.responseJsonSchema;
    }
    if (config.thinkingConfig) {
      merged.thinkingConfig = config.thinkingConfig;
    }
  }

  return Object.keys(merged).length > 0 ? merged : undefined;
}

/**
 * Generates text from a plain prompt string using the Gemini API.
 */
export async function generateText(
  options: GenerateTextOptions,
  clientOverride?: GoogleGenAI
): Promise<GeminiGenerationResult> {
  const prompt = options.prompt?.trim();
  if (!prompt) {
    throw new GeminiError(
      "VALIDATION_ERROR",
      "프롬프트(prompt)가 비어 있습니다.",
      400
    );
  }

  const ai = clientOverride ?? getGeminiClient();
  const model = options.model?.trim() || getDefaultGeminiModel();

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: buildGenerateConfig(options.systemInstruction, options.config),
    });

    return {
      text: response.text ?? "",
      model,
      usage: response.usageMetadata
        ? {
            promptTokenCount: response.usageMetadata.promptTokenCount,
            candidatesTokenCount: response.usageMetadata.candidatesTokenCount,
            totalTokenCount: response.usageMetadata.totalTokenCount,
          }
        : undefined,
    };
  } catch (err) {
    if (err instanceof GeminiError) throw err;
    const message =
      err instanceof Error ? err.message : "Gemini 텍스트 생성 중 오류가 발생했습니다.";
    throw new GeminiError("GENERATION_ERROR", message, 500, err);
  }
}

/**
 * Generates text using a registered prompt template ID and variable bindings.
 */
export async function generateFromTemplate(
  options: GenerateFromTemplateOptions,
  clientOverride?: GoogleGenAI
): Promise<GeminiGenerationResult> {
  const resolved = resolvePromptTemplate(
    options.templateId,
    options.variables ?? {}
  );

  const mergedConfig: GeminiGenerationConfig = {
    ...resolved.defaultConfig,
    ...options.config,
  };

  const result = await generateText(
    {
      prompt: resolved.prompt,
      systemInstruction:
        options.systemInstructionOverride ?? resolved.systemInstruction,
      model: options.model,
      config: mergedConfig,
    },
    clientOverride
  );

  return {
    ...result,
    templateId: resolved.templateId,
  };
}

/**
 * Generates a response from multimodal inputs (images, PDFs, audio, etc.) combined with
 * either a direct prompt or a prompt template.
 */
export async function generateMultimodal(
  options: GenerateMultimodalOptions,
  clientOverride?: GoogleGenAI
): Promise<GeminiGenerationResult> {
  if (!options.media || options.media.length === 0) {
    throw new GeminiError(
      "VALIDATION_ERROR",
      "멀티모달 분석을 위해 최소 1개 이상의 미디어 파일(media)이 필요합니다.",
      400
    );
  }

  let finalPrompt = options.prompt?.trim() ?? "";
  let systemInstruction = options.systemInstruction;
  let mergedConfig = options.config;
  let resolvedTemplateId: string | undefined;

  if (options.templateId) {
    const resolved = resolvePromptTemplate(
      options.templateId,
      options.variables ?? {}
    );
    finalPrompt = resolved.prompt;
    systemInstruction = systemInstruction ?? resolved.systemInstruction;
    mergedConfig = {
      ...resolved.defaultConfig,
      ...options.config,
    };
    resolvedTemplateId = resolved.templateId;
  }

  if (!finalPrompt) {
    throw new GeminiError(
      "VALIDATION_ERROR",
      "멀티모달 요청에는 prompt 또는 templateId가 필요합니다.",
      400
    );
  }

  const ai = clientOverride ?? getGeminiClient();
  const model = options.model?.trim() || getDefaultGeminiModel();
  const parts: Part[] = [...options.media, { text: finalPrompt }];

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [{ role: "user", parts }],
      config: buildGenerateConfig(systemInstruction, mergedConfig),
    });

    return {
      text: response.text ?? "",
      model,
      templateId: resolvedTemplateId,
      usage: response.usageMetadata
        ? {
            promptTokenCount: response.usageMetadata.promptTokenCount,
            candidatesTokenCount: response.usageMetadata.candidatesTokenCount,
            totalTokenCount: response.usageMetadata.totalTokenCount,
          }
        : undefined,
    };
  } catch (err) {
    if (err instanceof GeminiError) throw err;
    const message =
      err instanceof Error
        ? err.message
        : "Gemini 멀티모달 생성 중 오류가 발생했습니다.";
    throw new GeminiError("GENERATION_ERROR", message, 500, err);
  }
}
