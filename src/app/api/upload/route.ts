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
  const clientId = (formData.get("clientId") as string) || undefined;

  if (files.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  // If clientId provided, fetch client name for filename prefix
  let clientPrefix = "";
  if (clientId) {
    const client = await db.client.findUnique({ where: { id: clientId }, select: { name: true } });
    if (client) {
      clientPrefix = client.name.replace(/[^a-zA-Z0-9]/g, "_") + "_";
    }
  }

  const assets = [];

  for (const file of files) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = clientPrefix ? `${clientPrefix}${file.name}` : file.name;
    const stored = await storeFile(
      {
        buffer,
        originalName: fileName,
        mimeType: file.type,
        size: file.size,
      },
      folder
    );

    const asset = await db.asset.create({
      data: {
        name: fileName,
        type: getAssetType(file.type),
        mimeType: file.type,
        size: file.size,
        url: stored.url,
        folder,
        clientId,
      },
    });

    assets.push(asset);
  }

  return NextResponse.json({ assets });
}
