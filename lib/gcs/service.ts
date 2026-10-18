import type { Storage } from "@google-cloud/storage";
import { getDefaultBucketName, getGcsClient } from "./client.ts";
import {
  GcsError,
  type GcsObjectRefOptions,
  type GcsSignedUrlOptions,
  type GcsSignedUrlResult,
  type GcsUploadOptions,
  type GcsUploadResult,
} from "./types.ts";

/**
 * Validates and normalizes an object path within a GCS bucket.
 */
export function normalizeObjectPath(rawPath: string): string {
  const trimmed = rawPath?.trim().replace(/^\/+/, "");
  if (!trimmed) {
    throw new GcsError(
      "VALIDATION_ERROR",
      "GCS 파일 경로(objectPath/destination)가 비어 있습니다.",
      400
    );
  }
  if (trimmed.includes("..")) {
    throw new GcsError(
      "VALIDATION_ERROR",
      "GCS 파일 경로에 상위 디렉터리 참조('..')를 포함할 수 없습니다.",
      400
    );
  }
  return trimmed;
}

/**
 * Combines a folder prefix and filename into a safe GCS object path.
 */
export function buildGcsObjectPath(folder: string, fileName: string): string {
  const cleanFileName = fileName.trim().replace(/^\/+/, "");
  if (cleanFileName.includes("..")) {
    throw new GcsError(
      "VALIDATION_ERROR",
      "유효하지 않은 파일 이름입니다.",
      400
    );
  }
  const safeFileName = cleanFileName.replace(/\s+/g, "_");
  const cleanFolder = folder.trim().replace(/^\/+|\/+$/g, "");
  return normalizeObjectPath(
    cleanFolder ? `${cleanFolder}/${safeFileName}` : safeFileName
  );
}

/**
 * Uploads a File, Blob, Buffer, or Uint8Array to Google Cloud Storage.
 */
export async function uploadToGcs(
  options: GcsUploadOptions,
  storageOverride?: Storage
): Promise<GcsUploadResult> {
  const objectPath = normalizeObjectPath(options.destination);
  const bucketName = getDefaultBucketName(options.bucketName);
  const storage = storageOverride ?? getGcsClient();

  let buffer: Buffer;
  let contentType = options.contentType || "application/octet-stream";

  if (Buffer.isBuffer(options.file)) {
    buffer = options.file;
  } else if (options.file instanceof Uint8Array) {
    buffer = Buffer.from(options.file);
  } else if (options.file instanceof Blob) {
    if (!options.contentType && options.file.type) {
      contentType = options.file.type;
    }
    const arrayBuffer = await options.file.arrayBuffer();
    buffer = Buffer.from(arrayBuffer);
  } else {
    throw new GcsError(
      "VALIDATION_ERROR",
      "지원하지 않는 파일 입력 형식입니다. File, Blob, Buffer 중 하나를 전달해 주세요.",
      400
    );
  }

  if (buffer.byteLength === 0) {
    throw new GcsError(
      "VALIDATION_ERROR",
      "비어 있는 파일은 업로드할 수 없습니다.",
      400
    );
  }

  try {
    const bucket = storage.bucket(bucketName);
    const fileRef = bucket.file(objectPath);

    await fileRef.save(buffer, {
      resumable: false,
      contentType,
      metadata: options.metadata ? { metadata: options.metadata } : undefined,
    });

    return {
      bucket: bucketName,
      objectPath,
      gsUri: `gs://${bucketName}/${objectPath}`,
      publicUrl: `https://storage.googleapis.com/${bucketName}/${encodeURI(
        objectPath
      )}`,
      contentType,
      size: buffer.byteLength,
    };
  } catch (err) {
    if (err instanceof GcsError) throw err;
    const message =
      err instanceof Error ? err.message : "GCS 파일 업로드 중 오류가 발생했습니다.";
    throw new GcsError("STORAGE_ERROR", message, 500, err);
  }
}

/**
 * Generates a V4 Signed URL for direct client upload (`write`), download (`read`), or deletion (`delete`).
 */
export async function generateSignedUrl(
  options: GcsSignedUrlOptions,
  storageOverride?: Storage
): Promise<GcsSignedUrlResult> {
  const objectPath = normalizeObjectPath(options.objectPath);
  const bucketName = getDefaultBucketName(options.bucketName);
  const expiresInSeconds = options.expiresInSeconds ?? 900; // default 15 minutes

  if (expiresInSeconds <= 0 || expiresInSeconds > 7 * 24 * 3600) {
    throw new GcsError(
      "VALIDATION_ERROR",
      "Signed URL 만료 시간(expiresInSeconds)은 1초 이상 7일(604800초) 이하여야 합니다.",
      400
    );
  }

  if (options.action === "write" && !options.contentType?.trim()) {
    throw new GcsError(
      "VALIDATION_ERROR",
      "업로드(write)용 Signed URL 생성 시 contentType 지정이 필요합니다.",
      400
    );
  }

  const storage = storageOverride ?? getGcsClient();
  const expiresTimestamp = Date.now() + expiresInSeconds * 1000;

  try {
    const fileRef = storage.bucket(bucketName).file(objectPath);
    const [url] = await fileRef.getSignedUrl({
      version: "v4",
      action: options.action,
      expires: expiresTimestamp,
      ...(options.contentType ? { contentType: options.contentType } : {}),
    });

    return {
      url,
      bucket: bucketName,
      objectPath,
      action: options.action,
      expiresAt: new Date(expiresTimestamp).toISOString(),
    };
  } catch (err) {
    if (err instanceof GcsError) throw err;
    const message =
      err instanceof Error
        ? err.message
        : "GCS Signed URL 발급 중 오류가 발생했습니다.";
    throw new GcsError("STORAGE_ERROR", message, 500, err);
  }
}

/**
 * Downloads an object from GCS into a Buffer.
 */
export async function downloadFromGcs(
  options: GcsObjectRefOptions,
  storageOverride?: Storage
): Promise<Buffer> {
  const objectPath = normalizeObjectPath(options.objectPath);
  const bucketName = getDefaultBucketName(options.bucketName);
  const storage = storageOverride ?? getGcsClient();

  try {
    const [buffer] = await storage
      .bucket(bucketName)
      .file(objectPath)
      .download();
    return buffer;
  } catch (err) {
    if (err instanceof GcsError) throw err;
    const message =
      err instanceof Error
        ? err.message
        : "GCS 파일 다운로드 중 오류가 발생했습니다.";
    throw new GcsError("STORAGE_ERROR", message, 500, err);
  }
}

/**
 * Deletes an object from GCS.
 */
export async function deleteFromGcs(
  options: GcsObjectRefOptions,
  storageOverride?: Storage
): Promise<void> {
  const objectPath = normalizeObjectPath(options.objectPath);
  const bucketName = getDefaultBucketName(options.bucketName);
  const storage = storageOverride ?? getGcsClient();

  try {
    await storage.bucket(bucketName).file(objectPath).delete();
  } catch (err) {
    if (err instanceof GcsError) throw err;
    const message =
      err instanceof Error ? err.message : "GCS 파일 삭제 중 오류가 발생했습니다.";
    throw new GcsError("STORAGE_ERROR", message, 500, err);
  }
}
