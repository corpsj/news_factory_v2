import type { SupabaseClient } from "@supabase/supabase-js";
import pLimit from "p-limit";
import sharp from "sharp";

const MAX_BYTES = 20 * 1024 * 1024;
const MIN_DIMENSION = 50;
const IMAGE_TIMEOUT_MS = 8000;
const IMAGE_CONCURRENCY = 2;

type FetchBinaryWithSignal = (
  url: string,
  options?: { referer?: string; signal?: AbortSignal },
) => Promise<Buffer>;

export type ProcessImagesOptions = {
  imageUrls: string[];
  originId: string;
  articleDate: string;
  fetchBinary: (url: string, options?: { referer?: string }) => Promise<Buffer>;
  supabase: SupabaseClient;
  signal?: AbortSignal;
};

function combineSignals(
  parentSignal?: AbortSignal,
): { signal: AbortSignal; cleanup: () => void } {
  const timeoutSignal = AbortSignal.timeout(IMAGE_TIMEOUT_MS);

  if (!parentSignal) {
    return { signal: timeoutSignal, cleanup: () => undefined };
  }

  if (parentSignal.aborted) {
    return { signal: parentSignal, cleanup: () => undefined };
  }

  const controller = new AbortController();
  const abort = () => controller.abort();

  parentSignal.addEventListener("abort", abort, { once: true });
  timeoutSignal.addEventListener("abort", abort, { once: true });

  return {
    signal: controller.signal,
    cleanup: () => {
      parentSignal.removeEventListener("abort", abort);
      timeoutSignal.removeEventListener("abort", abort);
    },
  };
}

export async function processImages(options: ProcessImagesOptions): Promise<string[]> {
  const { imageUrls, originId, articleDate, fetchBinary, supabase, signal } = options;
  const siteId = originId.split("-")[0] ?? originId;
  const month = articleDate.slice(0, 7);
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const limit = pLimit(IMAGE_CONCURRENCY);
  const fetchBinaryWithSignal = fetchBinary as unknown as FetchBinaryWithSignal;
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
        const { signal: timeoutSignal, cleanup } = combineSignals(signal);
        const referer = new URL(url).origin;

        let buffer: Buffer;
        try {
          buffer = await fetchBinaryWithSignal(url, { referer, signal: timeoutSignal });
        } finally {
          cleanup();
        }

        if (buffer.byteLength > MAX_BYTES) {
          console.warn("[images] Skipping oversized image:", url, buffer.byteLength);
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

        if (!baseUrl) {
          console.warn("[images] Missing NEXT_PUBLIC_SUPABASE_URL; skipping public URL build:", path);
          return;
        }

        publicUrlsByIndex[index] = `${baseUrl}/storage/v1/object/public/press-images/${path}`;
      } catch (error) {
        console.error("[images] Failed to process image:", url, error);
      }
    }),
  );

  try {
    await Promise.all(tasks);
  } catch {
    return publicUrlsByIndex.filter((value): value is string => Boolean(value));
  }

  return publicUrlsByIndex.filter((value): value is string => Boolean(value));
}
