import type { Part } from "@google/genai";
import { GeminiError } from "./types.ts";

/**
 * Default maximum inline payload size per media item (20 MB).
 */
export const DEFAULT_MAX_INLINE_BYTES = 20 * 1024 * 1024;

/**
 * Supported MIME types for Gemini multimodal inlineData parts.
 */
export const SUPPORTED_MULTIMODAL_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
  "text/plain",
  "text/csv",
  "text/html",
  "text/markdown",
  "audio/wav",
  "audio/mp3",
  "audio/mpeg",
  "audio/aac",
  "audio/ogg",
  "audio/flac",
  "video/mp4",
  "video/mpeg",
  "video/mov",
  "video/webm",
]);

export function validateMimeType(mimeType: string): string {
  const normalized = mimeType?.trim().toLowerCase().split(";")[0];
  if (!normalized || !SUPPORTED_MULTIMODAL_MIME_TYPES.has(normalized)) {
    throw new GeminiError(
      "UNSUPPORTED_MEDIA_TYPE",
      `지원하지 않는 미디어 MIME 타입입니다: '${mimeType || "unknown"}'. 지원 타입: ${Array.from(
        SUPPORTED_MULTIMODAL_MIME_TYPES
      ).join(", ")}`,
      400
    );
  }
  return normalized;
}

export function validateByteSize(
  byteLength: number,
  maxBytes = DEFAULT_MAX_INLINE_BYTES
): void {
  if (byteLength <= 0) {
    throw new GeminiError(
      "VALIDATION_ERROR",
      "비어 있는 미디어 파일은 처리할 수 없습니다.",
      400
    );
  }
  if (byteLength > maxBytes) {
    throw new GeminiError(
      "PAYLOAD_TOO_LARGE",
      `미디어 파일 크기(${byteLength} bytes)가 최대 허용 크기(${maxBytes} bytes)를 초과했습니다.`,
      413
    );
  }
}

/**
 * Converts a Base64 string (raw or `data:<mime>;base64,...`) into a Gemini inlineData Part.
 */
export function base64ToGenerativePart(
  base64Input: string,
  mimeType: string,
  maxBytes = DEFAULT_MAX_INLINE_BYTES
): Part {
  if (!base64Input?.trim()) {
    throw new GeminiError(
      "VALIDATION_ERROR",
      "Base64 미디어 데이터가 비어 있습니다.",
      400
    );
  }

  let rawBase64 = base64Input.trim();
  let detectedMime = mimeType;

  const dataUrlMatch = rawBase64.match(/^data:([^;]+);base64,(.+)$/s);
  if (dataUrlMatch) {
    detectedMime = detectedMime || dataUrlMatch[1];
    rawBase64 = dataUrlMatch[2];
  }

  const normalizedMime = validateMimeType(detectedMime);
  const byteLength = Buffer.byteLength(rawBase64, "base64");
  validateByteSize(byteLength, maxBytes);

  return {
    inlineData: {
      data: rawBase64,
      mimeType: normalizedMime,
    },
  };
}

/**
 * Converts a Node Buffer or Uint8Array into a Gemini inlineData Part.
 */
export function bufferToGenerativePart(
  buffer: Buffer | Uint8Array,
  mimeType: string,
  maxBytes = DEFAULT_MAX_INLINE_BYTES
): Part {
  const normalizedMime = validateMimeType(mimeType);
  validateByteSize(buffer.byteLength, maxBytes);

  const base64Data = Buffer.from(buffer).toString("base64");
  return {
    inlineData: {
      data: base64Data,
      mimeType: normalizedMime,
    },
  };
}

/**
 * Converts a Web File or Blob (e.g. from Next.js `request.formData()`) into a Gemini inlineData Part.
 */
export async function fileToGenerativePart(
  file: File | Blob,
  mimeTypeOverride?: string,
  maxBytes = DEFAULT_MAX_INLINE_BYTES
): Promise<Part> {
  const mimeType = mimeTypeOverride || file.type;
  const normalizedMime = validateMimeType(mimeType);
  validateByteSize(file.size, maxBytes);

  const arrayBuffer = await file.arrayBuffer();
  const base64Data = Buffer.from(arrayBuffer).toString("base64");

  return {
    inlineData: {
      data: base64Data,
      mimeType: normalizedMime,
    },
  };
}
