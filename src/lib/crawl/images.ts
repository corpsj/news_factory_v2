import type { SupabaseClient } from "@supabase/supabase-js";
import pLimit from "p-limit";
import sharp from "sharp";

const MAX_BYTES = 20 * 1024 * 1024;
const MIN_DIMENSION = 200;
const IMAGE_TIMEOUT_MS = 15000;
const IMAGE_CONCURRENCY = 2;
const MAX_RETRIES = 2;


export type ProcessImagesOptions = {
  imageUrls: string[];
  originId: string;
  articleDate: string;
  fetchBinary: (url: string, options?: { referer?: string }) => Promise<Buffer>;
  supabase: SupabaseClient;
  signal?: AbortSignal;
};


export async function processImages(options: ProcessImagesOptions): Promise<string[]> {
  const { imageUrls, originId, articleDate, fetchBinary, supabase, signal } = options;
  const siteId = originId.split("-")[0] ?? originId;
  const month = articleDate.slice(0, 7);
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  if (!baseUrl) {
    console.warn("[images] Missing SUPABASE_URL; skipping image processing");
    return [];
  }
  const limit = pLimit(IMAGE_CONCURRENCY);
  const publicUrlsByIndex: Array<string | null> = new Array(imageUrls.length).fill(null);

  const tasks = imageUrls.map((url, index) =>
    limit(async () => {
      if (signal?.aborted) {
        return;
      }

      if (url.startsWith("data:")) {
        return;
      }

      try {
        const referer = new URL(url).origin;

        let buffer: Buffer | null = null;
        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
          try {
            buffer = await Promise.race([
              fetchBinary(url, { referer }),
              new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error("[images] Download timeout")), IMAGE_TIMEOUT_MS),
              ),
            ]);
            break;
          } catch (dlError) {
            if (attempt < MAX_RETRIES) {
              await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
              continue;
            }
            throw dlError;
          }
        }

        if (!buffer) return;

        if (buffer.byteLength > MAX_BYTES) {
          return;
        }

        const metadata = await sharp(buffer).metadata();
        const width = metadata.width ?? 0;
        const height = metadata.height ?? 0;

        if (metadata.format === "svg") {
          return;
        }

        if (width < MIN_DIMENSION || height < MIN_DIMENSION) {
          return;
        }

        const webpBuffer = await sharp(buffer)
          .resize({
            width: 1920,
            height: 1920,
            fit: "inside",
            withoutEnlargement: true,
          })
          .webp({ quality: 80 })
          .toBuffer();

        const path = `${siteId}/${month}/${originId}/${index}.webp`;
        const { error } = await supabase.storage.from("press-images").upload(path, webpBuffer, {
          contentType: "image/webp",
          upsert: true,
        });

        if (error) {
          throw new Error(error.message);
        }

        publicUrlsByIndex[index] = `${baseUrl}/storage/v1/object/public/press-images/${path}`;
      } catch (error) {
        console.error("[images] Failed to process image:", url, error);
      }
    }),
  );

  try {
    await Promise.all(tasks);
  } catch (error) {
    console.error("[images] Image processing batch failed:", error);
    return publicUrlsByIndex.filter((value): value is string => Boolean(value));
  }

  return publicUrlsByIndex.filter((value): value is string => Boolean(value));
}
