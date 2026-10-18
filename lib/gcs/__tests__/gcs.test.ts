import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildGcsObjectPath,
  deleteFromGcs,
  downloadFromGcs,
  generateSignedUrl,
  uploadToGcs,
} from "../service.ts";
import { GcsError } from "../types.ts";

describe("GCS Service Layer (with Mock Storage)", () => {
  const createMockStorage = () => {
    const savedCalls: Array<{
      bucketName: string;
      objectPath: string;
      buffer?: Buffer;
      options?: unknown;
    }> = [];
    const deletedPaths: string[] = [];

    const storage = {
      bucket: (bucketName: string) => ({
        file: (objectPath: string) => ({
          save: async (buffer: Buffer, options?: unknown) => {
            savedCalls.push({ bucketName, objectPath, buffer, options });
          },
          download: async () => [Buffer.from("downloaded-file-bytes")],
          delete: async () => {
            deletedPaths.push(`${bucketName}/${objectPath}`);
          },
          getSignedUrl: async (cfg: { action: string; expires: number }) => [
            `https://storage.googleapis.com/${bucketName}/${objectPath}?action=${cfg.action}`,
          ],
        }),
      }),
    };

    return { storage, savedCalls, deletedPaths };
  };

  it("sanitizes and builds GCS object paths cleanly", () => {
    const path = buildGcsObjectPath("uploads/images/", "/profile photo.png");
    assert.equal(path, "uploads/images/profile_photo.png");

    assert.throws(
      () => buildGcsObjectPath("uploads", "../secret.txt"),
      (err: unknown) => {
        assert.ok(err instanceof GcsError);
        assert.equal(err.code, "VALIDATION_ERROR");
        return true;
      }
    );
  });

  it("uploads Buffer or File/Blob to GCS bucket and returns metadata", async () => {
    const mock = createMockStorage();
    const blob = new Blob(["hello gcs world"], { type: "text/plain" });

    const res = await uploadToGcs(
      {
        file: blob,
        destination: "docs/hello.txt",
        bucketName: "test-bucket",
      },
      mock.storage as never
    );

    assert.equal(res.bucket, "test-bucket");
    assert.equal(res.objectPath, "docs/hello.txt");
    assert.equal(res.gsUri, "gs://test-bucket/docs/hello.txt");
    assert.equal(res.publicUrl, "https://storage.googleapis.com/test-bucket/docs/hello.txt");
    assert.equal(res.contentType, "text/plain");
    assert.equal(mock.savedCalls.length, 1);
  });

  it("generates V4 signed URL for read and write", async () => {
    const mock = createMockStorage();
    const res = await generateSignedUrl(
      {
        objectPath: "uploads/test.png",
        action: "write",
        contentType: "image/png",
        expiresInSeconds: 600,
        bucketName: "test-bucket",
      },
      mock.storage as never
    );

    assert.ok(res.url.includes("https://storage.googleapis.com/test-bucket/uploads/test.png"));
    assert.equal(res.action, "write");
    assert.equal(res.objectPath, "uploads/test.png");
  });

  it("downloads and deletes objects from GCS", async () => {
    const mock = createMockStorage();
    const downloaded = await downloadFromGcs(
      { objectPath: "docs/hello.txt", bucketName: "test-bucket" },
      mock.storage as never
    );
    assert.equal(downloaded.toString("utf-8"), "downloaded-file-bytes");

    await deleteFromGcs(
      { objectPath: "docs/hello.txt", bucketName: "test-bucket" },
      mock.storage as never
    );
    assert.deepEqual(mock.deletedPaths, ["test-bucket/docs/hello.txt"]);
  });
});
