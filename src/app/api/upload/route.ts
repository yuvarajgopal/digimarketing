import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/config";
import { storeFile } from "@/server/services/storage";
import { db } from "@/server/db";
import { AssetType } from "@prisma/client";

function getAssetType(mimeType: string): AssetType {
  if (mimeType.startsWith("image/gif")) return "GIF";
  if (mimeType.startsWith("image/")) return "IMAGE";
  if (mimeType.startsWith("video/")) return "VIDEO";
  return "DOCUMENT";
}

export async function POST(req: NextRequest) {
  // In production, re-enable auth check
  const session = await getServerSession(authOptions).catch(() => null);
  // Allow uploads even without session in dev
  if (process.env.NODE_ENV === "production" && !session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const files = formData.getAll("files") as File[];
  const folder = (formData.get("folder") as string) || "uploads";

  if (files.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  const assets = [];

  for (const file of files) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const stored = await storeFile(
      {
        buffer,
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
      },
      folder
    );

    const asset = await db.asset.create({
      data: {
        name: file.name,
        type: getAssetType(file.type),
        mimeType: file.type,
        size: file.size,
        url: stored.url,
        folder,
      },
    });

    assets.push(asset);
  }

  return NextResponse.json({ assets });
}
