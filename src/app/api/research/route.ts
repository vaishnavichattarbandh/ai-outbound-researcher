import { NextRequest, NextResponse } from "next/server";
import { CopyRegenerationRequestSchema, ResearchRequestSchema } from "@/lib/schemas";
import { enrich, UpstreamError, type EnrichmentProgress } from "@/lib/scraper";
import { regenerateSequence, synthesize } from "@/lib/synthesizer";

export const runtime = "nodejs";
export const maxDuration = 30;

// In-memory limiter: fine for a demo; use Upstash/Redis for multi-instance production.
const hits = new Map<string, number[]>();
const WINDOW_MS = 60 * 60 * 1000;

function rateLimited(ip: string): boolean {
  const max = Number(process.env.RATE_LIMIT_PER_HOUR ?? 5);
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= max) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  return false;
}

export async function POST(req: NextRequest) {
  const started = Date.now();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const isRegeneration = !!body && typeof body === "object" && "action" in body;
  const regeneration = isRegeneration ? CopyRegenerationRequestSchema.safeParse(body) : undefined;
  const researchRequest = isRegeneration ? undefined : ResearchRequestSchema.safeParse(body);
  const parsed = regeneration ?? researchRequest;
  if (!parsed?.success) {
    return NextResponse.json(
      { error: "Invalid input", fieldErrors: parsed && !parsed.success ? parsed.error.flatten().fieldErrors : undefined },
      { status: 400 }
    );
  }

  // Keys: BYOK headers are used per-request and never stored. Server keys are the fallback.
  const byokGemini = req.headers.get("x-gemini-api-key")?.trim();
  const byokSerper = req.headers.get("x-serper-api-key")?.trim();
  const usingServerKeys = !byokGemini;

  if (usingServerKeys) {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "No API key configured. Use Demo Mode or add your own free Gemini key in API Settings." },
        { status: 401 }
      );
    }
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
    if (rateLimited(ip)) {
      return NextResponse.json(
        { error: "Free live limit reached. Switch to Demo Mode or enter your own free Gemini key." },
        { status: 429 }
      );
    }
  }
  const geminiKey = byokGemini || process.env.GEMINI_API_KEY!;
  const serperKey = byokSerper || (usingServerKeys ? process.env.SERPER_API_KEY : undefined);

  if (regeneration?.success) {
    try {
      const sequence = await regenerateSequence(
        geminiKey,
        regeneration.data,
        regeneration.data.currentBrief,
        regeneration.data.tone,
        regeneration.data.signalIndex,
      );
      return NextResponse.json({ outboundSequence: sequence });
    } catch (err) {
      if (err instanceof UpstreamError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      console.error("copy regeneration error", err);
      return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
    }
  }

  const streamProgress = req.headers.get("accept")?.includes("application/x-ndjson");
  if (!researchRequest?.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const data = researchRequest.data;
  if (streamProgress) {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        const send = (event: object) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        const onProgress: EnrichmentProgress = (stage, status) => send({ type: "progress", stage, status });
        void (async () => {
          try {
            const context = await enrich(data.companyDomain, serperKey, onProgress);
            const brief = await synthesize(geminiKey, data, context, (_stage, status) => {
              send({ type: "progress", stage: "gemini", status });
            });
            send({
              type: "result",
              data: {
                ...brief,
                meta: {
                  enrichmentSource: context.source,
                  latencyMs: Date.now() - started,
                  researchedAt: new Date().toISOString(),
                  searchStatus: context.searchStatus,
                  searchError: context.searchError,
                },
              },
            });
          } catch (err) {
            if (err instanceof UpstreamError) {
              send({ type: "error", error: err.message, status: err.status });
            } else {
              console.error("research stream error", err);
              send({ type: "error", error: "Unexpected server error", status: 500 });
            }
          } finally {
            controller.close();
          }
        })();
      },
    });
    return new NextResponse(stream, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
      },
    });
  }

  try {
    const context = await enrich(data.companyDomain, serperKey);
    const brief = await synthesize(geminiKey, data, context);
    return NextResponse.json({
      ...brief,
      meta: {
        enrichmentSource: context.source,
        latencyMs: Date.now() - started,
        researchedAt: new Date().toISOString(),
        searchStatus: context.searchStatus,
        searchError: context.searchError,
      },
    });
  } catch (err) {
    if (err instanceof UpstreamError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("research route error", err);
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}
