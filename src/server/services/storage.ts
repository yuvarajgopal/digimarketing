import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

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

export async function storeFile(file: StorageFile, folder?: string): Promise<StoredFile> {
  const ext = path.extname(file.originalName);
  const hash = crypto.randomBytes(16).toString("hex");
  const fileName = `${hash}${ext}`;
  const subDir = folder || "general";
  const fullDir = path.join(UPLOAD_DIR, subDir);
  await ensureDir(fullDir);
  const filePath = path.join(fullDir, fileName);
  await fs.writeFile(filePath, file.buffer);
  return {
    url: `/uploads/${subDir}/${fileName}`,
    path: filePath,
  };
}

export async function deleteFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch {
    // File may already be deleted
  }
}

export async function getFileBuffer(filePath: string): Promise<Buffer> {
  return fs.readFile(filePath);
}
