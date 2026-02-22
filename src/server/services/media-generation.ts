import { fal } from "@fal-ai/client";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { storeFile } from "@/server/services/storage";

// ─── Provider detection ──────────────────────────────────────
const FAL_ENABLED = process.env.FAL_ENABLED === "true";
const NANO_ENABLED = process.env.NANO_ENABLED === "true";

// Configure fal.ai client
if (FAL_ENABLED && process.env.FAL_KEY) {
  fal.config({ credentials: process.env.FAL_KEY });
}

// Configure Gemini client
let gemini: GoogleGenerativeAI | null = null;
if (NANO_ENABLED && process.env.GEMINI_API_KEY) {
  gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
}

function getProvider(): "nano" | "fal" {
  if (NANO_ENABLED && gemini) return "nano";
  if (FAL_ENABLED) return "fal";
  throw new Error("No image generation provider enabled. Set FAL_ENABLED=true or NANO_ENABLED=true in .env.local");
}

// ─── Types ───────────────────────────────────────────────────
export interface GeneratedImage {
  url: string;
  width: number;
  height: number;
}

export interface GeneratedVideo {
  url: string;
  duration: number;
}

const ASPECT_RATIO_MAP: Record<string, { width: number; height: number }> = {
  "1:1": { width: 1024, height: 1024 },
  "16:9": { width: 1344, height: 768 },
  "9:16": { width: 768, height: 1344 },
  "4:5": { width: 896, height: 1120 },
};

// ─── Nano Banana (Gemini) helpers ────────────────────────────

async function nanoGenerateImage(
  prompt: string,
  aspectRatio: string,
): Promise<GeneratedImage> {
  if (!gemini) throw new Error("Gemini API key not configured");

  const model = gemini.getGenerativeModel({
    model: "gemini-2.0-flash-exp-image-generation",
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"] as any,
    } as any,
  });

  const dims = ASPECT_RATIO_MAP[aspectRatio] || ASPECT_RATIO_MAP["1:1"];
  const fullPrompt = `Generate an image with aspect ratio ${aspectRatio} (${dims.width}x${dims.height}). ${prompt}`;

  const result = await model.generateContent(fullPrompt);
  const response = result.response;
  const parts = response.candidates?.[0]?.content?.parts || [];

  for (const part of parts) {
    const inline = (part as any).inlineData;
    if (inline?.mimeType?.startsWith("image/")) {
      // Save base64 image to storage and return URL
      const buffer = Buffer.from(inline.data, "base64");
      const ext = inline.mimeType.includes("png") ? ".png" : ".jpg";
      const fileName = `nano_${Date.now()}${ext}`;
      const stored = await storeFile(
        { buffer, originalName: fileName, mimeType: inline.mimeType, size: buffer.length },
        "assets",
      );
      return { url: stored.url, width: dims.width, height: dims.height };
    }
  }

  throw new Error("Nano Banana: no image returned from Gemini");
}

async function nanoEditImage(
  imageBuffer: Buffer,
  imageMimeType: string,
  prompt: string,
): Promise<GeneratedImage> {
  if (!gemini) throw new Error("Gemini API key not configured");

  const model = gemini.getGenerativeModel({
    model: "gemini-2.0-flash-exp-image-generation",
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"] as any,
    } as any,
  });

  const result = await model.generateContent([
    { text: `Edit this image: ${prompt}` },
    {
      inlineData: {
        mimeType: imageMimeType,
        data: imageBuffer.toString("base64"),
      },
    },
  ]);

  const response = result.response;
  const parts = response.candidates?.[0]?.content?.parts || [];

  for (const part of parts) {
    const inline = (part as any).inlineData;
    if (inline?.mimeType?.startsWith("image/")) {
      const buffer = Buffer.from(inline.data, "base64");
      const ext = inline.mimeType.includes("png") ? ".png" : ".jpg";
      const fileName = `nano_edit_${Date.now()}${ext}`;
      const stored = await storeFile(
        { buffer, originalName: fileName, mimeType: inline.mimeType, size: buffer.length },
        "assets",
      );
      return { url: stored.url, width: 1024, height: 1024 };
    }
  }

  throw new Error("Nano Banana: no edited image returned from Gemini");
}

// ─── Fal.ai helpers ──────────────────────────────────────────

async function falGenerateImage(
  prompt: string,
  aspectRatio: string,
): Promise<GeneratedImage> {
  const dims = ASPECT_RATIO_MAP[aspectRatio] || ASPECT_RATIO_MAP["1:1"];

  const result = await fal.subscribe("fal-ai/flux/schnell", {
    input: {
      prompt,
      image_size: { width: dims.width, height: dims.height },
      num_images: 1,
    },
  }) as any;

  const image = result.data?.images?.[0] || result.images?.[0];
  if (!image?.url) {
    throw new Error("Image generation failed: no image returned");
  }

  return { url: image.url, width: dims.width, height: dims.height };
}

async function falEditImage(
  imageUrl: string,
  prompt: string,
  strength: number,
): Promise<GeneratedImage> {
  const result = await fal.subscribe("fal-ai/flux/dev/image-to-image", {
    input: {
      image_url: imageUrl,
      prompt,
      strength,
      num_images: 1,
    },
  }) as any;

  const image = result.data?.images?.[0] || result.images?.[0];
  if (!image?.url) {
    throw new Error("Image editing failed: no image returned");
  }

  return { url: image.url, width: image.width || 1024, height: image.height || 1024 };
}

// ─── Public API (provider-agnostic) ──────────────────────────

export async function generateImage(
  prompt: string,
  aspectRatio: "1:1" | "16:9" | "9:16" | "4:5" = "1:1"
): Promise<GeneratedImage> {
  const provider = getProvider();
  if (provider === "nano") {
    return nanoGenerateImage(prompt, aspectRatio);
  }
  return falGenerateImage(prompt, aspectRatio);
}

export async function generateVideo(
  prompt: string,
  imageUrl?: string,
  duration: 5 | 10 = 5
): Promise<GeneratedVideo> {
  // Video generation only available via Fal.ai
  if (!FAL_ENABLED) {
    throw new Error("Video generation requires FAL_ENABLED=true (Nano Banana does not support video generation yet)");
  }

  const videoInput = {
    prompt,
    image_url: imageUrl || "",
    duration: `${duration}` as const,
  };

  const result = await fal.subscribe("fal-ai/kling-video/v2/master/image-to-video", {
    input: videoInput,
  }) as any;

  const video = result.data?.video || result.video;
  if (!video?.url) {
    throw new Error("Video generation failed: no video returned");
  }

  return { url: video.url, duration };
}

export async function editImage(
  imageUrl: string,
  prompt: string,
  strength: number = 0.75,
): Promise<GeneratedImage> {
  const provider = getProvider();

  if (provider === "nano") {
    // For Nano, we need to download the image first and send as base64
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error("Failed to fetch source image for editing");
    const buffer = Buffer.from(await response.arrayBuffer());
    const mimeType = response.headers.get("content-type") || "image/png";
    return nanoEditImage(buffer, mimeType, prompt);
  }

  return falEditImage(imageUrl, prompt, strength);
}

/**
 * Upload a buffer to Fal.ai CDN storage so it can be used as input for models.
 * Only works when Fal is enabled.
 */
export async function uploadToFalStorage(buffer: Buffer, contentType: string = "image/png"): Promise<string> {
  if (!FAL_ENABLED) {
    throw new Error("uploadToFalStorage requires FAL_ENABLED=true");
  }
  const blob = new Blob([new Uint8Array(buffer)], { type: contentType });
  const url = await fal.storage.upload(blob);
  return url;
}

export async function generateAdVariations(
  sourceImageUrl: string,
  prompts: string[],
): Promise<GeneratedImage[]> {
  const provider = getProvider();
  const results: GeneratedImage[] = [];

  for (const prompt of prompts) {
    try {
      if (provider === "nano") {
        const img = await nanoGenerateImage(
          `${prompt}. Inspired by the reference image style.`,
          "1:1",
        );
        results.push(img);
      } else {
        const result = await fal.subscribe("fal-ai/flux/schnell", {
          input: {
            prompt: `${prompt}. Inspired by the reference image style.`,
            image_size: { width: 1024, height: 1024 },
            num_images: 1,
          },
        }) as any;

        const image = result.data?.images?.[0] || result.images?.[0];
        if (image?.url) {
          results.push({ url: image.url, width: 1024, height: 1024 });
        }
      }
    } catch (err) {
      console.error("Variation generation failed for prompt:", prompt, err);
    }
  }

  return results;
}
