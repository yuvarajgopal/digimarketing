import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

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

function getS3Client() {
  return new S3Client({
    region: process.env.S3_REGION || "us-east-1",
    endpoint: process.env.S3_ENDPOINT || undefined,
    forcePathStyle: !!process.env.S3_ENDPOINT,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY || "",
      secretAccessKey: process.env.S3_SECRET_KEY || "",
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
  const bucket = process.env.S3_BUCKET || "digimarketing";

  const client = getS3Client();
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimeType,
    })
  );

  const endpoint = process.env.S3_ENDPOINT;
  const url = endpoint
    ? `${endpoint}/${bucket}/${key}`
    : `https://${bucket}.s3.${process.env.S3_REGION || "us-east-1"}.amazonaws.com/${key}`;

  return { url, path: key };
}

export async function storeFile(file: StorageFile, folder?: string): Promise<StoredFile> {
  if (process.env.STORAGE_TYPE === "s3") {
    return storeFileS3(file, folder);
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
      Bucket: process.env.S3_BUCKET || "digimarketing",
      Key: key,
    })
  );
}

export async function deleteFile(filePath: string): Promise<void> {
  if (process.env.STORAGE_TYPE === "s3") {
    return deleteFileS3(filePath);
  }
  return deleteFileLocal(filePath);
}

export async function getFileBuffer(filePath: string): Promise<Buffer> {
  return fs.readFile(filePath);
}
