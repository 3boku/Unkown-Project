import { NextRequest, NextResponse } from "next/server";
import {
  buildGcsObjectPath,
  deleteFromGcs,
  GcsError,
  uploadToGcs,
  type GcsApiResponse,
  type GcsUploadResult,
} from "@/lib/gcs";

/**
 * POST /api/gcs/upload
 * multipart/form-data로 전송된 파일('file')을 GCS 버킷에 업로드합니다.
 * - file: 업로드할 파일 (필수)
 * - folder: 저장할 하위 폴더 경로 (선택, 기본값: "uploads")
 * - destination: 전체 저장 경로 직접 지정 시 (선택, 지정 시 folder 무시)
 * - bucketName: 기본 버킷 대신 다른 버킷 지정 시 (선택)
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<GcsApiResponse<GcsUploadResult>>> {
  try {
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      throw new GcsError(
        "VALIDATION_ERROR",
        "유효한 multipart/form-data 요청이 필요합니다.",
        400
      );
    }

    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      throw new GcsError(
        "VALIDATION_ERROR",
        "'file' 필드에 유효한 파일을 첨부해 주세요.",
        400
      );
    }

    const folder = formData.get("folder")?.toString() ?? "uploads";
    const explicitDestination = formData.get("destination")?.toString();
    const bucketName = formData.get("bucketName")?.toString();

    const destination =
      explicitDestination?.trim() ||
      buildGcsObjectPath(folder, `${Date.now()}-${file.name}`);

    const result = await uploadToGcs({
      file,
      destination,
      contentType: file.type || "application/octet-stream",
      bucketName,
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
      err instanceof Error ? err.message : "파일 업로드 처리 중 오류가 발생했습니다.";
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

/**
 * DELETE /api/gcs/upload
 * JSON 본문({ objectPath, bucketName? })을 받아 GCS 객체를 삭제합니다.
 */
export async function DELETE(
  request: NextRequest
): Promise<NextResponse<GcsApiResponse<{ deleted: boolean; objectPath: string }>>> {
  try {
    let body: { objectPath?: string; bucketName?: string };
    try {
      body = (await request.json()) as {
        objectPath?: string;
        bucketName?: string;
      };
    } catch {
      throw new GcsError(
        "VALIDATION_ERROR",
        "유효한 JSON 요청 본문({ objectPath })이 필요합니다.",
        400
      );
    }

    const objectPath = body.objectPath ?? "";
    await deleteFromGcs({
      objectPath,
      bucketName: body.bucketName,
    });

    return NextResponse.json({
      success: true,
      data: {
        deleted: true,
        objectPath,
      },
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
      err instanceof Error ? err.message : "파일 삭제 처리 중 오류가 발생했습니다.";
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
