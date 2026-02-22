import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join, resolve, extname } from "path";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const UPLOAD_DIR = process.env.STORAGE_LOCAL_PATH || "./uploads";

const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".avi": "video/x-msvideo",
  ".pdf": "application/pdf",
};

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

async function fetchFromS3(key: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) return null;
  try {
    const client = getS3Client();
    const response = await client.send(
      new GetObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET || "digimarketing",
        Key: key,
      })
    );
    const bytes = await response.Body?.transformToByteArray();
    if (!bytes) return null;
    return {
      buffer: Buffer.from(bytes),
      contentType: response.ContentType || "application/octet-stream",
    };
  } catch {
    return null;
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const segments = params.path;
  const filePath = join(UPLOAD_DIR, ...segments);

  // Prevent directory traversal
  const resolved = resolve(filePath);
  const uploadRoot = resolve(UPLOAD_DIR);
  if (!resolved.startsWith(uploadRoot)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Try local file first
  try {
    const buffer = await readFile(resolved);
    const ext = extname(resolved).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    // Local file not found — fall back to S3
  }

  // Try S3 using the path segments as the S3 key
  const s3Key = segments.join("/");
  const s3Result = await fetchFromS3(s3Key);
  if (s3Result) {
    return new NextResponse(s3Result.buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": s3Result.contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  }

  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
