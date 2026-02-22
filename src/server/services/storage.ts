import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";

export interface StorageFile {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  size: number;
}

export interface StoredFile {
  url: string;
  path: string;
}

const UPLOAD_DIR = process.env.STORAGE_LOCAL_PATH || "./uploads";

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

function isS3Configured(): boolean {
  return !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.AWS_S3_BUCKET);
}

function useS3(): boolean {
  if (process.env.STORAGE_TYPE === "local") return false;
  if (process.env.STORAGE_TYPE === "s3") return true;
  return isS3Configured();
}

function getS3Client() {
  return new S3Client({
    region: process.env.AWS_S3_REGION || "us-east-1",
    endpoint: process.env.S3_ENDPOINT || undefined,
    forcePathStyle: !!process.env.S3_ENDPOINT,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    },
  });
}

async function storeFileLocal(file: StorageFile, folder?: string): Promise<StoredFile> {
  const ext = path.extname(file.originalName);
  const hash = crypto.randomBytes(16).toString("hex");
  const fileName = `${hash}${ext}`;
  const subDir = folder || "general";
  const fullDir = path.join(UPLOAD_DIR, subDir);
  await ensureDir(fullDir);
  const filePath = path.join(fullDir, fileName);
  await fs.writeFile(filePath, file.buffer);
  return {
    url: `/api/uploads/${subDir}/${fileName}`,
    path: filePath,
  };
}

async function storeFileS3(file: StorageFile, folder?: string): Promise<StoredFile> {
  const ext = path.extname(file.originalName);
  const hash = crypto.randomBytes(16).toString("hex");
  const fileName = `${hash}${ext}`;
  const subDir = folder || "general";
  const key = `${subDir}/${fileName}`;
  const bucket = process.env.AWS_S3_BUCKET || "digimarketing";
  const region = process.env.AWS_S3_REGION || "us-east-1";

  const client = getS3Client();
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimeType,
    })
  );

  return { url: `/api/uploads/${key}`, path: key };
}

export async function storeFile(file: StorageFile, folder?: string): Promise<StoredFile> {
  if (useS3()) {
    try {
      return await storeFileS3(file, folder);
    } catch (err) {
      console.error("[storage] S3 upload failed, falling back to local storage:", err);
      return storeFileLocal(file, folder);
    }
  }
  return storeFileLocal(file, folder);
}

async function deleteFileLocal(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch {
    // File may already be deleted
  }
}

async function deleteFileS3(key: string): Promise<void> {
  const client = getS3Client();
  await client.send(
    new DeleteObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET || "digimarketing",
      Key: key,
    })
  );
}

/** Extract the S3 key from a full S3 URL, or return null if not an S3 URL */
function extractS3Key(url: string): string | null {
  const bucket = process.env.AWS_S3_BUCKET || "digimarketing";
  const region = process.env.AWS_S3_REGION || "us-east-1";
  const prefix = `https://${bucket}.s3.${region}.amazonaws.com/`;
  if (url.startsWith(prefix)) {
    return url.slice(prefix.length);
  }
  // Custom endpoint pattern
  const endpoint = process.env.S3_ENDPOINT;
  if (endpoint) {
    const customPrefix = `${endpoint}/${bucket}/`;
    if (url.startsWith(customPrefix)) {
      return url.slice(customPrefix.length);
    }
  }
  return null;
}

/** Extract the local file path from a local upload URL, or return null */
function extractLocalPath(url: string): string | null {
  const prefix = "/api/uploads/";
  if (url.startsWith(prefix)) {
    return path.join(UPLOAD_DIR, url.slice(prefix.length));
  }
  return null;
}

export async function deleteFile(fileUrl: string): Promise<void> {
  // Try legacy direct S3 URL
  const s3Key = extractS3Key(fileUrl);
  if (s3Key) {
    try {
      await deleteFileS3(s3Key);
    } catch (err) {
      console.error("[storage] S3 delete failed (non-fatal):", err);
    }
    return;
  }

  // Proxy URLs (/api/uploads/...) — try local first, then S3
  const localPath = extractLocalPath(fileUrl);
  if (localPath) {
    await deleteFileLocal(localPath);
    // Also try S3 with the relative key (e.g. "assets/hash.png")
    if (useS3()) {
      const relKey = fileUrl.slice("/api/uploads/".length);
      try {
        await deleteFileS3(relKey);
      } catch (err) {
        // S3 file may not exist — that's fine
      }
    }
    return;
  }

  // Raw path fallback
  if (useS3()) {
    try {
      await deleteFileS3(fileUrl);
    } catch (err) {
      console.error("[storage] S3 delete failed (non-fatal):", err);
    }
  }
  await deleteFileLocal(fileUrl);
}

export async function getFileBuffer(filePath: string): Promise<Buffer> {
  return fs.readFile(filePath);
}
