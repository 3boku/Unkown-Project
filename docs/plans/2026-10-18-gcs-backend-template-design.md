# Next.js Google Cloud Storage (GCS) Backend Template Design

- **Date**: 2026-10-18
- **Target Project**: Next.js 16.4.2 App Router (`unn`)
- **SDK**: `@google-cloud/storage`

## 1. Goal & Scope
Provide a modular backend template for Google Cloud Storage (GCS) supporting:
1. Flexible Authentication:
   - Inline Service Account credentials (`GCP_CLIENT_EMAIL` + `GCP_PRIVATE_KEY` + `GCP_PROJECT_ID`)
   - Service Account key file (`GOOGLE_APPLICATION_CREDENTIALS`)
   - Local `gcloud` CLI Application Default Credentials (`gcloud auth application-default login`)
2. File Upload (`Buffer` / `File` / `Blob`), Download (`Buffer`), Deletion, and V4 Signed URL (`read` / `write`) generation.
3. App Router API Endpoints:
   - `POST /api/gcs/upload` & `DELETE /api/gcs/upload`
   - `POST /api/gcs/signed-url`

## 2. File Structure
```text
lib/
└── gcs/
    ├── types.ts
    ├── client.ts
    ├── service.ts
    ├── index.ts
    └── __tests__/
        └── gcs.test.ts
app/
└── api/
    └── gcs/
        ├── upload/
        │   └── route.ts
        └── signed-url/
            └── route.ts
```
