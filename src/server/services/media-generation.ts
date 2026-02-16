import { fal } from "@fal-ai/client";

// Configure fal.ai client
if (process.env.FAL_KEY) {
  fal.config({ credentials: process.env.FAL_KEY });
}

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

export async function generateImage(
  prompt: string,
  aspectRatio: "1:1" | "16:9" | "9:16" | "4:5" = "1:1"
): Promise<GeneratedImage> {
  const dims = ASPECT_RATIO_MAP[aspectRatio];

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

  return {
    url: image.url,
    width: dims.width,
    height: dims.height,
  };
}

export async function generateVideo(
  prompt: string,
  imageUrl?: string,
  duration: 5 | 10 = 5
): Promise<GeneratedVideo> {
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

  return {
    url: video.url,
    duration,
  };
}

export async function editImage(
  imageUrl: string,
  prompt: string,
  strength: number = 0.75,
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

  return {
    url: image.url,
    width: image.width || 1024,
    height: image.height || 1024,
  };
}

export async function generateAdVariations(
  sourceImageUrl: string,
  prompts: string[],
): Promise<GeneratedImage[]> {
  const results: GeneratedImage[] = [];

  for (const prompt of prompts) {
    try {
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
    } catch (err) {
      console.error("Variation generation failed for prompt:", prompt, err);
    }
  }

  return results;
}
