import { Storage, type StorageOptions } from "@google-cloud/storage";
import { GcsError } from "./types.ts";

let cachedStorage: Storage | null = null;

/**
 * Returns the configured default GCS bucket name from environment variables.
 */
export function getDefaultBucketName(bucketOverride?: string): string {
  const bucket =
    bucketOverride?.trim() || process.env.GCS_BUCKET_NAME?.trim() || "";

  if (!bucket) {
    throw new GcsError(
      "CONFIG_ERROR",
      "GCS_BUCKET_NAME 환경변수가 설정되지 않았습니다. .env 파일에 GCS_BUCKET_NAME을 설정해 주세요.",
      500
    );
  }

  return bucket;
}

/**
 * Initializes and returns a singleton Google Cloud Storage client.
 *
 * Authentication priority:
 * 1. Inline Service Account env vars (`GCP_CLIENT_EMAIL` + `GCP_PRIVATE_KEY`)
 * 2. Key file path (`GOOGLE_APPLICATION_CREDENTIALS`)
 * 3. Application Default Credentials (`gcloud auth application-default login`)
 */
export function getGcsClient(): Storage {
  if (cachedStorage) {
    return cachedStorage;
  }

  const projectId = process.env.GCP_PROJECT_ID?.trim() || undefined;
  const clientEmail = process.env.GCP_CLIENT_EMAIL?.trim();
  const privateKeyRaw = process.env.GCP_PRIVATE_KEY?.trim();
  const keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();

  const options: StorageOptions = {};

  if (projectId) {
    options.projectId = projectId;
  }

  if (clientEmail && privateKeyRaw) {
    options.credentials = {
      client_email: clientEmail,
      private_key: privateKeyRaw.replace(/\\n/g, "\n"),
    };
  } else if (keyFilename) {
    options.keyFilename = keyFilename;
  }

  cachedStorage = new Storage(options);
  return cachedStorage;
}
