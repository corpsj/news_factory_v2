import axios, { AxiosError } from "axios";
import https from "node:https";

const DEFAULT_TIMEOUT_MS = 25_000;
const DEFAULT_ATTEMPTS = 3;
const BASE_DELAY_MS = 1_000;

const DEFAULT_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
  Referer: "https://www.google.com/",
};

export type HttpClientOptions = {
  timeoutMs?: number;
  attempts?: number;
  baseDelayMs?: number;
  signal?: AbortSignal;
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldRetry(error: unknown): boolean {
  if (!(error instanceof AxiosError)) {
    return true;
  }

  if (error.code === "ERR_CANCELED") {
    return false;
  }

  const status = error.response?.status;
  if (!status) {
    return true;
  }

  return status >= 500 || status === 429;
}

export function createHttpClient(clientOptions?: HttpClientOptions) {
  const allowInsecureTls = process.env.ALLOW_INSECURE_TLS === "1";
  const timeoutMs = clientOptions?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxAttempts = clientOptions?.attempts ?? DEFAULT_ATTEMPTS;
  const baseDelay = clientOptions?.baseDelayMs ?? BASE_DELAY_MS;
  const signal = clientOptions?.signal;

  const httpsAgent = new https.Agent({
    keepAlive: true,
    maxSockets: 5,
    ...(allowInsecureTls ? { rejectUnauthorized: false } : {}),
  });

  return {
    async fetchHtml(url: string, attempts = maxAttempts): Promise<string> {
      let lastError: unknown;

      for (let attempt = 0; attempt < attempts; attempt += 1) {
        if (signal?.aborted) {
          throw new Error("Crawl aborted: deadline exceeded");
        }

        try {
          const response = await axios.get<string>(url, {
            timeout: timeoutMs,
            headers: DEFAULT_HEADERS,
            responseType: "text",
            transformResponse: [(value) => value],
            httpsAgent,
            validateStatus: (status) => status >= 200 && status < 400,
            signal,
          });

          return response.data;
        } catch (error) {
          lastError = error;

          if (!shouldRetry(error) || attempt === attempts - 1) {
            break;
          }

          const backoff = baseDelay * 2 ** attempt;
          await delay(backoff);
        }
      }

      if (lastError instanceof Error) {
        throw new Error(`Failed to fetch ${url}: ${lastError.message}`);
      }

      throw new Error(`Failed to fetch ${url}: Unknown error`);
    },
    async fetchBinary(url: string, binaryOptions?: { referer?: string; attempts?: number }): Promise<Buffer> {
      const binaryAttempts = binaryOptions?.attempts ?? maxAttempts;
      let lastError: unknown;

      for (let attempt = 0; attempt < binaryAttempts; attempt += 1) {
        if (signal?.aborted) {
          throw new Error("Crawl aborted: deadline exceeded");
        }

        try {
          const headers: Record<string, string> = {
            ...DEFAULT_HEADERS,
            Accept: "image/*,*/*;q=0.8",
          };
          if (binaryOptions?.referer) {
            headers["Referer"] = binaryOptions.referer;
          }

          const response = await axios.get<ArrayBuffer>(url, {
            timeout: timeoutMs,
            headers,
            responseType: "arraybuffer",
            httpsAgent,
            validateStatus: (status) => status >= 200 && status < 400,
            signal,
          });
          return Buffer.from(response.data);
        } catch (error) {
          lastError = error;

          if (!shouldRetry(error) || attempt === binaryAttempts - 1) {
            break;
          }

          const backoff = baseDelay * 2 ** attempt;
          await delay(backoff);
        }
      }

      if (lastError instanceof Error) {
        throw new Error(`Failed to fetch binary ${url}: ${lastError.message}`);
      }

      throw new Error(`Failed to fetch binary ${url}: Unknown error`);
    },
  };
}
