import { NextRequest, NextResponse } from "next/server";
import {
  GeminiError,
  generateFromTemplate,
  generateText,
  listPromptTemplates,
  type GeminiApiResponse,
  type GeminiGenerationConfig,
  type GeminiGenerationResult,
} from "@/lib/gemini";

interface GenerateRequestBody {
  prompt?: string;
  templateId?: string;
  variables?: Record<string, string | number | boolean>;
  systemInstruction?: string;
  model?: string;
  config?: GeminiGenerationConfig;
}

/**
 * GET /api/gemini/generate
 * 등록된 프롬프트 템플릿 목록과 각 템플릿의 필수 변수 목록을 반환합니다.
 */
export async function GET() {
  const templates = listPromptTemplates();
  return NextResponse.json({
    success: true,
    data: { templates },
  });
}

/**
 * POST /api/gemini/generate
 * 자유 프롬프트(prompt) 또는 등록된 템플릿(templateId + variables)으로 텍스트를 생성합니다.
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<GeminiApiResponse<GeminiGenerationResult>>> {
  try {
    let body: GenerateRequestBody;
    try {
      body = (await request.json()) as GenerateRequestBody;
    } catch {
      throw new GeminiError(
        "VALIDATION_ERROR",
        "유효한 JSON 요청 본문(body)이 필요합니다.",
        400
      );
    }

    const result = body.templateId
      ? await generateFromTemplate({
          templateId: body.templateId,
          variables: body.variables,
          model: body.model,
          systemInstructionOverride: body.systemInstruction,
          config: body.config,
        })
      : await generateText({
          prompt: body.prompt ?? "",
          systemInstruction: body.systemInstruction,
          model: body.model,
          config: body.config,
        });

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
      err instanceof Error ? err.message : "알 수 없는 서버 오류가 발생했습니다.";
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
