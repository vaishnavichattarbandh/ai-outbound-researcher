export type Snippet = {
  kind: "Recent News" | "Hiring/Growth";
  title: string;
  snippet: string;
  url: string;
  date?: string;
};

export type Enrichment = {
  websiteMarkdown: string;
  websiteUrl: string;
  snippets: Snippet[];
  source: "full" | "search-only" | "website-only";
  searchStatus: "available" | "partial" | "unavailable" | "not-configured" | "no-results";
  searchError?: string;
};
export type EnrichmentProgress = (
  stage: "website" | "news" | "hiring",
  status: "running" | "complete" | "failed" | "skipped"
) => void;

export class UpstreamError extends Error {
  constructor(message: string, public status = 502) {
    super(message);
  }
}

const MAX_CHARS = 12_000;
const JINA_TIMEOUT_MS = 6_000;
const SERPER_TIMEOUT_MS = 5_000;

async function fetchJina(domain: string): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), JINA_TIMEOUT_MS);
  try {
    const res = await fetch(`https://r.jina.ai/https://${domain}`, {
      headers: { Accept: "text/markdown", "X-Return-Format": "markdown" },
      signal: ctrl.signal,
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Jina ${res.status}`);
    const text = (await res.text()).trim();
    if (text.length < 200) throw new Error("Jina returned too little content");
    return text.length > MAX_CHARS ? text.slice(0, MAX_CHARS).replace(/\s+\S*$/, "") + "\n…[truncated]" : text;
  } finally {
    clearTimeout(timer);
  }
}

type SerperItem = { title?: string; snippet?: string; link?: string; date?: string };

async function serper(
  endpoint: "search" | "news",
  q: string,
  apiKey: string,
  kind: Snippet["kind"]
): Promise<Snippet[]> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), SERPER_TIMEOUT_MS);
  try {
    const res = await fetch(`https://google.serper.dev/${endpoint}`, {
      method: "POST",
      headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ q, num: 5 }),
      signal: ctrl.signal,
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Serper ${res.status}`);
    const json = await res.json();
    const items: SerperItem[] = json.news ?? json.organic ?? [];
    return items
      .filter((i) => i.link && i.title)
      .slice(0, 5)
      .map((i) => ({ kind, title: i.title!, snippet: i.snippet ?? "", url: i.link!, date: i.date }));
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Waterfall: website scrape + live news + hiring/growth search, all in parallel.
 * Any single source may fail; the request only fails if nothing at all came back.
 */
export async function enrich(
  domain: string,
  serperKey?: string,
  onProgress?: EnrichmentProgress,
): Promise<Enrichment> {
  const after = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const track = <T>(stage: "website" | "news" | "hiring", request: Promise<T>): Promise<T> => {
    onProgress?.(stage, "running");
    return request.then(
      (value) => {
        onProgress?.(stage, "complete");
        return value;
      },
      (error: unknown) => {
        onProgress?.(stage, "failed");
        throw error;
      }
    );
  };
  const [web, news, hiring] = await Promise.all([
    Promise.allSettled([track("website", fetchJina(domain))]).then((r) => r[0]),
    serperKey
      ? Promise.allSettled([track("news", serper("news", `${domain} (funding OR launch OR partnership OR acquisition) after:${after}`, serperKey, "Recent News"))]).then((r) => r[0])
      : Promise.resolve({ status: "rejected", reason: new Error("Serper key not configured") } as PromiseRejectedResult),
    serperKey
      ? Promise.allSettled([track("hiring", serper("search", `site:${domain} (hiring OR careers OR "open roles" OR jobs)`, serperKey, "Hiring/Growth"))]).then((r) => r[0])
      : Promise.resolve({ status: "rejected", reason: new Error("Serper key not configured") } as PromiseRejectedResult),
  ]);
  if (!serperKey) {
    onProgress?.("news", "skipped");
    onProgress?.("hiring", "skipped");
  }

  const websiteMarkdown = web.status === "fulfilled" ? (web.value as string) : "";
  const snippets = [news, hiring]
    .filter((r): r is PromiseFulfilledResult<Snippet[]> => r?.status === "fulfilled")
    .flatMap((r) => r.value);
  const searchResults = serperKey ? [news, hiring] : [];
  const failedSearches = searchResults.filter((r) => r?.status === "rejected");
  const hasSearchResults = searchResults.some((r) => r?.status === "fulfilled");
  const searchError = failedSearches.length
    ? failedSearches.some((r) => r?.status === "rejected" && /Serper (401|403)/.test(String(r.reason)))
      ? "Serper rejected its API key. Check the key in API Settings."
      : failedSearches.some((r) => r?.status === "rejected" && /Serper 429/.test(String(r.reason)))
        ? "Serper rate limit reached. Try again later."
        : "A live search request failed. Check the Serper key in API Settings."
    : undefined;
  const searchStatus = !serperKey
    ? "not-configured"
    : failedSearches.length && hasSearchResults
      ? "partial"
      : failedSearches.length
        ? "unavailable"
        : snippets.length
          ? "available"
          : "no-results";

  if (!websiteMarkdown && snippets.length === 0) {
    throw new UpstreamError(
      serperKey
        ? "Could not retrieve any data for this domain. Check the domain and try again."
        : "The website could not be read and no Serper key is set for search fallback. Add a Serper key in API Settings, or try Demo Mode.",
      422
    );
  }
  const source = websiteMarkdown
    ? snippets.length ? "full" : "website-only"
    : "search-only";
  return {
    websiteMarkdown,
    websiteUrl: `https://${domain}`,
    snippets,
    source,
    searchStatus,
    searchError,
  };
}
