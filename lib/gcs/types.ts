export type GcsErrorCode =
  | "CONFIG_ERROR"
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "STORAGE_ERROR";

export class GcsError extends Error {
  code: GcsErrorCode;
  statusCode: number;
  details?: unknown;

  constructor(
    code: GcsErrorCode,
    message: string,
    statusCode = 500,
    details?: unknown
  ) {
    super(message);
    this.name = "GcsError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export interface GcsUploadOptions {
  file: File | Blob | Buffer | Uint8Array;
  destination: string;
  contentType?: string;
  bucketName?: string;
  metadata?: Record<string, string>;
}

export interface GcsUploadResult {
  bucket: string;
  objectPath: string;
  gsUri: string;
  publicUrl: string;
  contentType: string;
  size: number;
}

export interface GcsSignedUrlOptions {
  objectPath: string;
  action: "read" | "write" | "delete";
  expiresInSeconds?: number;
  contentType?: string;
  bucketName?: string;
}

export interface GcsSignedUrlResult {
  url: string;
  bucket: string;
  objectPath: string;
  action: "read" | "write" | "delete";
  expiresAt: string;
}

export interface GcsObjectRefOptions {
  objectPath: string;
  bucketName?: string;
}

export interface GcsApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: GcsErrorCode | string;
    message: string;
  };
}
