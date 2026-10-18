import { NextRequest, NextResponse } from "next/server";
import {
  GcsError,
  generateSignedUrl,
  type GcsApiResponse,
  type GcsSignedUrlResult,
} from "@/lib/gcs";

interface SignedUrlRequestBody {
  objectPath?: string;
  action?: "read" | "write" | "delete";
  contentType?: string;
  expiresInSeconds?: number;
  bucketName?: string;
}

/**
 * POST /api/gcs/signed-url
 * 클라이언트 직접 업로드(write) 또는 다운로드(read)를 위한 V4 Signed URL을 발급합니다.
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<GcsApiResponse<GcsSignedUrlResult>>> {
  try {
    let body: SignedUrlRequestBody;
    try {
      body = (await request.json()) as SignedUrlRequestBody;
    } catch {
      throw new GcsError(
        "VALIDATION_ERROR",
        "유효한 JSON 요청 본문(body)이 필요합니다.",
        400
      );
    }

    const action = body.action ?? "read";
    if (!["read", "write", "delete"].includes(action)) {
      throw new GcsError(
        "VALIDATION_ERROR",
        "action은 'read', 'write', 'delete' 중 하나여야 합니다.",
        400
      );
    }

    const result = await generateSignedUrl({
      objectPath: body.objectPath ?? "",
      action,
      contentType: body.contentType,
      expiresInSeconds: body.expiresInSeconds,
      bucketName: body.bucketName,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (err) {
    if (err instanceof GcsError) {
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
        : "Signed URL 생성 중 알 수 없는 오류가 발생했습니다.";
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "STORAGE_ERROR",
          message,
        },
      },
      { status: 500 }
    );
  }
}
