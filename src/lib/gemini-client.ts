import { GoogleGenAI } from "@google/genai";
import { UpstreamError } from "./scraper";
import { rawGeminiPayload } from "./gemini-response";

export const GEMINI_REQUEST_TIMEOUT_MS = 8_000;
const GEMINI_RETRY_DELAY_MS = 600;

function getErrorStatus(error: unknown): number | undefined {
  if (typeof error === "object" && error !== null && "status" in error && typeof error.status === "number") {
    return error.status;
  }
  return undefined;
}

export function createGeminiClient(apiKey: string): GoogleGenAI {
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      timeout: GEMINI_REQUEST_TIMEOUT_MS,
      retryOptions: { attempts: 1 },
    },
  });
}

export function geminiApiError(error: unknown): UpstreamError {
  const status = getErrorStatus(error);
  const detail = error instanceof Error ? error.message : String(error);
  if (status === 401) return new UpstreamError("Gemini rejected the API key (HTTP 401). Check your key in API Settings.", 401);
  if (status === 403) return new UpstreamError(`Gemini API access was denied (HTTP 403): ${detail}`, 403);
  if (status === 429) return new UpstreamError("Gemini is under heavy demand or has reached a rate limit (HTTP 429). Please try again shortly.", 429);
  if (status === 503) return new UpstreamError("Gemini is temporarily unavailable (HTTP 503). Please try again shortly.", 503);
  if (status === 504 || (error instanceof Error && /timeout|timed out|abort/i.test(`${error.name} ${detail}`))) {
    return new UpstreamError("The Gemini request timed out. Please try again with a shorter request.", 504);
  }
  if (status !== undefined) return new UpstreamError(`Gemini API request failed (HTTP ${status}): ${detail}`, 502);
  if (/API key|permission|401|403/i.test(detail)) {
    return new UpstreamError(`Gemini API authorization failed: ${detail}`, 401);
  }
  if (/429|quota|rate|resource exhausted/i.test(detail)) {
    return new UpstreamError("Gemini is under heavy demand or has reached a rate limit. Please try again shortly.", 429);
  }
  return new UpstreamError(`Gemini API request failed: ${detail}`, 502);
}

export async function requestGemini<T>(request: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await request();
    } catch (error) {
      const status = getErrorStatus(error);
      const payload = rawGeminiPayload(error);
      if (attempt === 0 && (status === 429 || status === 503)) {
        console.warn("Gemini request hit a temporary demand limit; retrying once", { status, payload });
        await new Promise((resolve) => setTimeout(resolve, GEMINI_RETRY_DELAY_MS));
        continue;
      }
      console.error("Gemini API request failed", { status: status ?? null, payload });
      throw geminiApiError(error);
    }
  }
}
