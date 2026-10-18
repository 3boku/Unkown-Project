import { NextRequest, NextResponse } from "next/server";
import type { Part } from "@google/genai";
import {
  base64ToGenerativePart,
  fileToGenerativePart,
  GeminiError,
  generateMultimodal,
  type GeminiApiResponse,
  type GeminiGenerationConfig,
  type GeminiGenerationResult,
} from "@/lib/gemini";

interface MultimodalJsonRequestBody {
  prompt?: string;
  templateId?: string;
  variables?: Record<string, string | number | boolean>;
  systemInstruction?: string;
  model?: string;
  config?: GeminiGenerationConfig;
  media?: Array<{
    data: string;
    mimeType: string;
  }>;
}

async function parseMultipartRequest(request: NextRequest) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    throw new GeminiError(
      "VALIDATION_ERROR",
      "유효한 multipart/form-data 형식이 아닙니다.",
      400
    );
  }

  const rawFiles = [
    ...formData.getAll("files"),
    ...formData.getAll("file"),
  ].filter((entry): entry is File => entry instanceof File && entry.size > 0);

  if (rawFiles.length === 0) {
    throw new GeminiError(
      "VALIDATION_ERROR",
      "업로드된 미디어 파일이 없습니다. 'file' 또는 'files' 필드로 파일을 전송해 주세요.",
      400
    );
  }

  const media: Part[] = await Promise.all(
    rawFiles.map((file) => fileToGenerativePart(file))
  );

  const prompt = formData.get("prompt")?.toString();
  const templateId = formData.get("templateId")?.toString();
  const systemInstruction = formData.get("systemInstruction")?.toString();
  const model = formData.get("model")?.toString();
  const rawVariables = formData.get("variables")?.toString();

  let variables: Record<string, string | number | boolean> | undefined;
  if (rawVariables) {
    try {
      variables = JSON.parse(rawVariables) as Record<
        string,
        string | number | boolean
      >;
    } catch {
      throw new GeminiError(
        "VALIDATION_ERROR",
        "'variables' 필드는 유효한 JSON 객체 문자열이어야 합니다.",
        400
      );
    }
  }

  return {
    prompt,
    templateId,
    variables,
    systemInstruction,
    model,
    media,
  };
}

async function parseJsonRequest(request: NextRequest) {
  let body: MultimodalJsonRequestBody;
  try {
    body = (await request.json()) as MultimodalJsonRequestBody;
  } catch {
    throw new GeminiError(
      "VALIDATION_ERROR",
      "유효한 JSON 요청 본문(body)이 필요합니다.",
      400
    );
  }

  if (!Array.isArray(body.media) || body.media.length === 0) {
    throw new GeminiError(
      "VALIDATION_ERROR",
      "JSON 요청 시 'media' 배열([{ data, mimeType }])에 최소 1개의 미디어 항목이 필요합니다.",
      400
    );
  }

  const media: Part[] = body.media.map((item) =>
    base64ToGenerativePart(item.data, item.mimeType)
  );

  return {
    prompt: body.prompt,
    templateId: body.templateId,
    variables: body.variables,
    systemInstruction: body.systemInstruction,
    model: body.model,
    config: body.config,
    media,
  };
}

/**
 * POST /api/gemini/multimodal
 * multipart/form-data(파일 업로드) 또는 application/json(Base64 미디어)을 받아
 * 프롬프트/템플릿과 함께 멀티모달 분석 결과를 반환합니다.
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<GeminiApiResponse<GeminiGenerationResult>>> {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    const options = contentType.includes("multipart/form-data")
      ? await parseMultipartRequest(request)
      : await parseJsonRequest(request);

    const result = await generateMultimodal(options);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (err) {
    if (err instanceof GeminiError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: err.code,
            message: err.message,
          },
        },
        { status: err.statusCode }
      );
    }

    const message =
      err instanceof Error
        ? err.message
        : "멀티모달 처리 중 알 수 없는 서버 오류가 발생했습니다.";
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "GENERATION_ERROR",
          message,
        },
      },
      { status: 500 }
    );
  }
}
