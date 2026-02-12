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

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldRetry(error: unknown): boolean {
  if (!(error instanceof AxiosError)) {
    return true;
  }

  const status = error.response?.status;
  if (!status) {
    return true;
  }

  return status >= 500 || status === 429;
}

export function createHttpClient() {
  const allowInsecureTls = process.env.ALLOW_INSECURE_TLS === "1";

  const httpsAgent = allowInsecureTls
    ? new https.Agent({ rejectUnauthorized: false })
    : undefined;

  if (allowInsecureTls) {
    console.warn("ALLOW_INSECURE_TLS=1 detected. TLS certificate validation is disabled.");
  }

  return {
    async fetchHtml(url: string, attempts = DEFAULT_ATTEMPTS): Promise<string> {
      let lastError: unknown;

      for (let attempt = 0; attempt < attempts; attempt += 1) {
        try {
          const response = await axios.get<string>(url, {
            timeout: DEFAULT_TIMEOUT_MS,
            headers: DEFAULT_HEADERS,
            responseType: "text",
            transformResponse: [(value) => value],
            httpsAgent,
            validateStatus: (status) => status >= 200 && status < 400,
          });

          return response.data;
        } catch (error) {
          lastError = error;

          if (!shouldRetry(error) || attempt === attempts - 1) {
            break;
          }

          const backoff = BASE_DELAY_MS * 2 ** attempt;
          await delay(backoff);
        }
      }

      if (lastError instanceof Error) {
        throw new Error(`Failed to fetch ${url}: ${lastError.message}`);
      }

      throw new Error(`Failed to fetch ${url}: Unknown error`);
    },
  };
}
