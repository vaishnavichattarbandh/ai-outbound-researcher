import { UpstreamError } from "./scraper";

function getErrorStatus(error: unknown): number | undefined {
  if (typeof error === "object" && error !== null && "status" in error && typeof error.status === "number") {
    return error.status;
  }
  return undefined;
}

export function geminiApiError(error: unknown): UpstreamError {
  const status = getErrorStatus(error);
  const detail = error instanceof Error ? error.message : String(error);
  if (status === 401) return new UpstreamError("Gemini rejected the API key (HTTP 401). Check your key in API Settings.", 401);
  if (status === 403) return new UpstreamError(`Gemini API access was denied (HTTP 403): ${detail}`, 403);
  if (status === 429) return new UpstreamError("Gemini rate limit hit (HTTP 429). Try again shortly.", 429);
  if (status !== undefined) return new UpstreamError(`Gemini API request failed (HTTP ${status}): ${detail}`, 502);
  if (/API key|permission|401|403/i.test(detail)) {
    return new UpstreamError(`Gemini API authorization failed: ${detail}`, 401);
  }
  if (/429|quota|rate/i.test(detail)) return new UpstreamError(`Gemini API rate limit hit: ${detail}`, 429);
  return new UpstreamError(`Gemini API request failed: ${detail}`, 502);
}

export async function requestGemini<T>(request: () => Promise<T>): Promise<T> {
  try {
    return await request();
  } catch (error) {
    throw geminiApiError(error);
  }
}
