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
      "GCS_BUCKET_NAME 환경변수가 설정되지 않았습니다. .env.local 또는 Cloud Run 환경변수에 GCS_BUCKET_NAME을 설정해 주세요.",
      500
    );
  }

  return bucket;
}

/**
 * Initializes and returns a singleton Google Cloud Storage client.
 *
 * Default behavior uses Application Default Credentials (ADC):
 * - Local dev: `gcloud auth application-default login`
 * - Cloud Run: Attached Service Account (`--service-account=unn@kr-devsummit26icn-504.iam.gserviceaccount.com`)
 *
 * Also supports optional explicit keyFilename or inline credentials if provided.
 */
export function getGcsClient(): Storage {
  if (cachedStorage) {
    return cachedStorage;
  }

  const projectId = process.env.GCP_PROJECT_ID?.trim() || undefined;
  const clientEmail = process.env.GCP_CLIENT_EMAIL?.trim();
  const privateKeyRaw = process.env.GCP_PRIVATE_KEY?.trim();
  const keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();

  // .env.local에 GOOGLE_APPLICATION_CREDENTIALS="" 처럼 빈 문자열이 들어가 있을 때
  // google-auth-library가 빈 파일 경로로 오인하지 않고 ADC(gcloud / Cloud Run 서비스 계정)를 쓰도록 정리합니다.
  if (!keyFilename && "GOOGLE_APPLICATION_CREDENTIALS" in process.env) {
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
  }

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
