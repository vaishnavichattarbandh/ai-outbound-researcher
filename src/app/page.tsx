"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Info, KeyRound, LockKeyhole, Workflow, X } from "lucide-react";
import { z } from "zod";
import ResearchForm from "@/components/ResearchForm";
import BriefDisplay from "@/components/BriefDisplay";
import AIAssistant from "@/components/AIAssistant";
import ByokModal from "@/components/ByokModal";
import { DEMO_DATA, personalizeDemoEntry } from "@/lib/demo-data";
import { loadKeys } from "@/lib/keys";
import { loadHistory, saveHistoryEntry, type HistoryEntry } from "@/lib/history";
import { toBatchCsv, download } from "@/lib/export";
import { formatZodIssues, OutboundBriefSchema, type OutboundBrief, type ResearchRequest } from "@/lib/schemas";

const STAGES = [
  { key: "website", label: "Reading company website" },
  { key: "news", label: "Searching recent news" },
  { key: "hiring", label: "Checking hiring signals" },
  { key: "gemini", label: "Scoring fit and writing sequence" },
] as const;
type StageKey = (typeof STAGES)[number]["key"];
type StageStatus = "pending" | "running" | "complete" | "failed" | "skipped";
type Mode = "demo" | "live";
type ApiError = { message: string; status?: number; fieldErrors?: Record<string, string[] | undefined> };
type BatchResult = { request: ResearchRequest; brief?: OutboundBrief; error?: string };
const ApiErrorSchema = z.object({
  error: z.string().optional(),
  fieldErrors: z.record(z.array(z.string())).optional(),
});
const StreamEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("progress"),
    stage: z.enum(["website", "news", "hiring", "gemini"]),
    status: z.enum(["running", "complete", "failed", "skipped"]),
  }),
  z.object({ type: z.literal("result"), data: z.unknown() }),
  z.object({ type: z.literal("error"), error: z.string(), status: z.number() }),
]);

function initialStages(): Record<StageKey, StageStatus> {
  return { website: "pending", news: "pending", hiring: "pending", gemini: "pending" };
}

class ResearchError extends Error {
  constructor(message: string, public status?: number, public fieldErrors?: ApiError["fieldErrors"]) {
    super(message);
  }
}

function researchErrorMessage(error: unknown): string {
  if (error instanceof TypeError && /fetch/i.test(error.message)) {
    return "Could not reach the research server. Make sure the app is running and open the localhost URL shown in your terminal.";
  }
  return error instanceof Error ? error.message : "Network error. Check your connection and try again.";
}

export default function Page() {
  const [mode, setMode] = useState<Mode>("demo");
  const [loading, setLoading] = useState(false);
  const [brief, setBrief] = useState<OutboundBrief | null>(null);
  const [domain, setDomain] = useState("");
  const [researchRequest, setResearchRequest] = useState<ResearchRequest | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [byokOpen, setByokOpen] = useState(false);
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
  const [hasKey, setHasKey] = useState(false);
  const [progress, setProgress] = useState(initialStages);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [batchResults, setBatchResults] = useState<BatchResult[]>([]);
  const [batchProgress, setBatchProgress] = useState({ total: 0, completed: 0, current: "" });
  const demoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setHasKey(!!loadKeys().gemini);
    setHistory(loadHistory());
  }, []);
  useEffect(() => () => { if (demoTimer.current) clearTimeout(demoTimer.current); }, []);

  const stopDemo = () => {
    if (demoTimer.current) clearTimeout(demoTimer.current);
    demoTimer.current = null;
  };

  const saveResult = (request: ResearchRequest, result: OutboundBrief, resultDomain: string) => {
    setHistory(saveHistoryEntry({ domain: resultDomain, request, brief: result }));
  };

  const runDemo = (selectedDomain: string, persona: string) => {
    stopDemo();
    const sample = DEMO_DATA[selectedDomain];
    const entry = personalizeDemoEntry(sample, persona);
    setError(null);
    setBrief(null);
    setLoading(true);
    setDomain(selectedDomain);
    setResearchRequest(entry.request);
    setProgress({ website: "complete", news: "skipped", hiring: "skipped", gemini: "running" });
    demoTimer.current = setTimeout(() => {
      demoTimer.current = null;
      setProgress({ website: "complete", news: "skipped", hiring: "skipped", gemini: "complete" });
      setBrief(entry.brief);
      saveResult(entry.request, entry.brief, selectedDomain);
      setLoading(false);
    }, 800);
  };

  const research = async (
    request: ResearchRequest,
    onProgress: (stage: StageKey, status: StageStatus) => void,
  ): Promise<OutboundBrief> => {
    const keys = loadKeys();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/x-ndjson",
    };
    if (keys.gemini) headers["x-gemini-api-key"] = keys.gemini;
    if (keys.serper) headers["x-serper-api-key"] = keys.serper;

    const response = await fetch("/api/research", { method: "POST", headers, body: JSON.stringify(request) });
    if (!response.ok) {
      const data: unknown = await response.json();
      const parsed = ApiErrorSchema.safeParse(data);
      throw new ResearchError(
        parsed.success ? parsed.data.error ?? "Research request failed." : "Research request failed.",
        response.status,
        parsed.success ? parsed.data.fieldErrors : undefined,
      );
    }
    if (!response.body) throw new Error("The browser could not read the live research stream.");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let result: OutboundBrief | null = null;
    const consumeLine = (line: string) => {
      if (!line.trim()) return;
      let payload: unknown;
      try {
        payload = JSON.parse(line);
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        const validator = `streamEvent [json_parse]: ${detail}`;
        console.error("Live research stream validation failed", { domain: request.companyDomain, validator });
        throw new ResearchError(`The research stream could not be parsed: ${validator}`, 502);
      }
      const parsedEvent = StreamEventSchema.safeParse(payload);
      if (!parsedEvent.success) {
        const validator = formatZodIssues(parsedEvent.error.issues).join("; ");
        console.error("Live research stream validation failed", { domain: request.companyDomain, validator });
        throw new ResearchError(`The research stream failed validation: ${validator}`, 502);
      }
      const event = parsedEvent.data;
      if (event.type === "progress") onProgress(event.stage, event.status);
      if (event.type === "error") throw new ResearchError(event.error, event.status);
      if (event.type === "result") {
        const parsedBrief = OutboundBriefSchema.safeParse(event.data);
        if (!parsedBrief.success) {
          const validator = formatZodIssues(parsedBrief.error.issues).join("; ");
          console.error("Live research brief validation failed", { domain: request.companyDomain, validator });
          throw new ResearchError(`The live research brief failed validation: ${validator}`, 502);
        }
        result = parsedBrief.data;
      }
    };

    try {
      while (true) {
        const { value, done } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) consumeLine(line);
        if (done) break;
      }
      if (buffer.trim()) consumeLine(buffer);
    } finally {
      reader.releaseLock();
    }
    if (!result) {
      const validator = "streamResult [missing_result]: research ended without a brief event";
      console.error("Live research stream validation failed", { domain: request.companyDomain, validator });
      throw new ResearchError(`The research stream failed validation: ${validator}`, 502);
    }
    return result;
  };

  const runLive = async (request: ResearchRequest) => {
    stopDemo();
    setError(null);
    setBrief(null);
    setResearchRequest(request);
    setLoading(true);
    setProgress(initialStages());
    try {
      const result = await research(request, (stage, status) => setProgress((current) => ({ ...current, [stage]: status })));
      const resultDomain = request.companyDomain;
      setBrief(result);
      setDomain(resultDomain);
      saveResult(request, result, resultDomain);
    } catch (caught) {
      setError(caught instanceof ResearchError
        ? { message: caught.message, status: caught.status, fieldErrors: caught.fieldErrors }
        : { message: researchErrorMessage(caught) });
    } finally {
      setLoading(false);
    }
  };

  const runBatch = async (requests: ResearchRequest[]) => {
    stopDemo();
    setError(null);
    setBrief(null);
    setBatchResults([]);
    setBatchProgress({ total: requests.length, completed: 0, current: requests[0]?.targetCompanyName ?? "" });
    setLoading(true);
    const results: BatchResult[] = [];

    for (const [index, request] of requests.entries()) {
      setBatchProgress({ total: requests.length, completed: index, current: request.targetCompanyName || request.companyDomain });
      setProgress(initialStages());
      try {
        const result = await research(request, (stage, status) => setProgress((current) => ({ ...current, [stage]: status })));
        results.push({ request, brief: result });
        saveResult(request, result, request.companyDomain);
      } catch (caught) {
        const message = researchErrorMessage(caught);
        results.push({ request, error: message });
      }
      setBatchResults([...results]);
      setBatchProgress({ total: requests.length, completed: index + 1, current: requests[index + 1]?.targetCompanyName ?? "" });
    }
    setLoading(false);
  };

  const openHistory = (entry: HistoryEntry) => {
    stopDemo();
    setHistory(saveHistoryEntry({ domain: entry.domain, request: entry.request, brief: entry.brief }));
    setBrief(entry.brief);
    setDomain(entry.domain);
    setResearchRequest(entry.request);
    setMode(entry.brief.meta?.enrichmentSource === "demo" ? "demo" : "live");
    setError(null);
  };

  const switchMode = (nextMode: Mode) => {
    setMode(nextMode);
    setBrief(null);
    setResearchRequest(null);
    setError(null);
    setBatchResults([]);
    if (nextMode === "live" && !loadKeys().gemini) setByokOpen(true);
  };
  const successfulBatch = batchResults.filter((item): item is BatchResult & { brief: OutboundBrief } => !!item.brief);
  const batchCsv = toBatchCsv(successfulBatch.map(({ request, brief: result }) => ({
    brief: result,
    domain: request.companyDomain,
    persona: request.targetPersona,
    valueProp: request.senderContext?.valueProposition ?? request.senderValueProp,
    senderCompany: request.senderContext?.companyName,
    senderProductPitch: request.senderContext?.productPitch,
  })));
  const assistantContext = brief && researchRequest ? {
    companyDomain: domain,
    targetPersona: researchRequest.targetPersona,
    activeBrief: brief,
    senderValueProposition: researchRequest.senderContext?.valueProposition ?? researchRequest.senderValueProp,
  } : undefined;

  return (
    <main className="mx-auto max-w-4xl px-4 pb-20">
      <header className="sticky top-0 z-30 -mx-4 mb-5 flex items-center justify-between border-b border-white/60 bg-white/70 px-4 py-4 shadow-sm shadow-slate-900/5 backdrop-blur-md">
        <div>
          <h1 className="text-xl font-semibold">AI Outbound Researcher</h1>
          <p className="text-sm text-muted">Live account signals to a ready-to-send brief.</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span title="Website content is capped to keep prompts concise" className="rounded-full border border-line/80 bg-white/60 px-2.5 py-1 text-[11px] font-medium text-muted">Lean context · 12k chars max</span>
          <button
            type="button"
            onClick={() => setHowItWorksOpen(true)}
            aria-haspopup="dialog"
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/60 bg-white/35 px-3 py-2 text-sm font-medium text-muted transition hover:border-accent/30 hover:bg-white/70 hover:text-ink"
          >
            <Info className="h-4 w-4" />
            How it works
          </button>
          <button onClick={() => setByokOpen(true)} className="inline-flex items-center gap-2 rounded-lg border border-white/70 bg-white/70 px-3 py-2 text-sm font-medium shadow-sm backdrop-blur-md hover:border-accent">
            <KeyRound className="h-4 w-4" />
            API Settings
            <span className={`h-2 w-2 rounded-full ${hasKey ? "bg-good" : "bg-line"}`} aria-label={hasKey ? "Key saved" : "No key saved"} />
          </button>
        </div>
      </header>

      {history.length > 0 && (
        <nav aria-label="Recent research" className="mb-5 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted">Recent:</span>
          {history.map((entry) => (
            <button key={entry.id} onClick={() => openHistory(entry)} className="max-w-48 truncate rounded-full border border-white/70 bg-white/65 px-3 py-1.5 text-xs shadow-sm backdrop-blur-md hover:border-accent hover:bg-accent-soft" title={`${entry.domain} · ${entry.savedAt}`}>
              {entry.brief.companyName} · {entry.domain}
            </button>
          ))}
        </nav>
      )}

      <div role="tablist" className="mb-4 inline-flex rounded-lg border border-white/70 bg-white/65 p-1 text-sm shadow-sm backdrop-blur-md">
        {(["demo", "live"] as const).map((nextMode) => (
          <button key={nextMode} role="tab" aria-selected={mode === nextMode} onClick={() => switchMode(nextMode)} disabled={loading} className={`rounded-md px-4 py-1.5 font-medium disabled:opacity-50 ${mode === nextMode ? "bg-ink text-white" : "text-muted hover:text-ink"}`}>
            {nextMode === "demo" ? "Demo Mode" : "Live research"}
          </button>
        ))}
      </div>

      <ResearchForm mode={mode} loading={loading} fieldErrors={error?.fieldErrors} onDemo={runDemo} onSubmit={runLive} onBatch={runBatch} />
      <AIAssistant context={assistantContext} onOpenSettings={() => setByokOpen(true)} />

      {loading && (
        <section className="mt-5 rounded-xl border border-white/70 bg-white/70 p-5 shadow-lg shadow-slate-900/5 backdrop-blur-md" aria-live="polite">
          {batchProgress.total > 0 && (
            <div className="mb-4">
              <div className="flex justify-between text-sm font-medium">
                <span>Batch research</span>
                <span>{batchProgress.completed} / {batchProgress.total}</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-paper">
                <div className="h-full bg-accent transition-all" style={{ width: `${(batchProgress.completed / batchProgress.total) * 100}%` }} />
              </div>
              {batchProgress.current && <p className="mt-1 text-xs text-muted">Now researching {batchProgress.current}</p>}
            </div>
          )}
          <ol className="grid gap-2 text-sm sm:grid-cols-2">
            {STAGES.map(({ key, label }) => {
              const status = progress[key];
              return (
                <li key={key} className={`flex items-center gap-2 ${status === "complete" ? "text-good" : status === "running" ? "font-medium text-accent" : status === "failed" ? "text-red-700" : "text-muted/70"}`}>
                  <span aria-hidden="true">{status === "complete" ? "✓" : status === "running" ? "◌" : status === "failed" ? "!" : status === "skipped" ? "–" : "○"}</span>
                  {label}{status === "skipped" ? " · skipped" : ""}
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {error && !error.fieldErrors && (
        <div role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <p>{error.message}</p>
          {error.status === 401 && <p className="mt-1">Check that your Gemini key is saved and valid in API Settings. If the error mentions Serper, check that key too.</p>}
          {error.status === 429 && <p className="mt-1">Your provider may be rate-limiting requests. Wait a minute or check your key’s quota.</p>}
          {error.status === 422 && <p className="mt-1">Check the domain and Serper key. The site may block reading; search fallback needs a working Serper key.</p>}
          {(error.status === 401 || error.status === 422) && <button onClick={() => setByokOpen(true)} className="mt-3 rounded-md border border-red-300 px-3 py-1.5">Check API keys</button>}
        </div>
      )}

      {batchResults.length > 0 && (
        <section className="mt-6 rounded-xl border border-white/70 bg-white/70 p-5 shadow-lg shadow-slate-900/5 backdrop-blur-md">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">Batch results</h2>
              <p className="text-sm text-muted">{successfulBatch.length} succeeded · {batchResults.length - successfulBatch.length} failed</p>
            </div>
            {successfulBatch.length > 0 && (
              <button onClick={() => download("outbound-research-batch.csv", batchCsv, "text/csv")} className="inline-flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm hover:border-accent">
                <Download className="h-4 w-4" /> Export successful briefs
              </button>
            )}
          </div>
          <ul className="mt-3 divide-y divide-line">
            {batchResults.map((item, index) => (
              <li key={`${item.request.companyDomain}-${index}`} className="flex justify-between gap-3 py-2 text-sm">
                <span>{item.request.targetCompanyName || item.request.companyDomain}</span>
                <span className={item.brief ? "text-good" : "text-red-700"}>{item.brief ? "Complete" : item.error}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {brief && !loading && researchRequest && (
        <div className="mt-8">
          <BriefDisplay key={domain} brief={brief} domain={domain} persona={researchRequest.targetPersona} valueProp={researchRequest.senderContext?.valueProposition ?? researchRequest.senderValueProp} request={researchRequest} />
        </div>
      )}

      {howItWorksOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-5 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setHowItWorksOpen(false);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") setHowItWorksOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="how-it-works-title"
            className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-white/70 bg-white/80 p-5 shadow-2xl shadow-slate-950/20 backdrop-blur-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/15 bg-accent-soft/70 px-2.5 py-1 text-xs font-medium text-accent">
                  <Workflow className="h-3.5 w-3.5" /> Capstone project
                </span>
                <h2 id="how-it-works-title" className="mt-2 text-2xl font-semibold">How it works</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">
                  AI Outbound Researcher replaces manual pre-call prospect research with verified company signals, so your outreach starts with relevant context instead of guesswork.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close How it works"
                onClick={() => setHowItWorksOpen(false)}
                className="rounded-lg border border-white/70 bg-white/60 p-2 text-muted hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <ol className="mt-4 space-y-2.5">
              <li className="flex gap-3 rounded-xl border border-white/70 bg-white/60 p-3.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-white">1</span>
                <div>
                  <h3 className="font-medium">Choose how to start</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">Try Demo Mode instantly, or add your own Gemini key (and optional Serper key) for live account research.</p>
                </div>
              </li>
              <li className="flex gap-3 rounded-xl border border-white/70 bg-white/60 p-3.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-white">2</span>
                <div>
                  <h3 className="font-medium">Review the evidence</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">Research combines company website content with available hiring and news signals. Review the source links and evidence excerpts before using a claim.</p>
                </div>
              </li>
              <li className="flex gap-3 rounded-xl border border-white/70 bg-white/60 p-3.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-white">3</span>
                <div>
                  <h3 className="font-medium">Customize and export</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">Edit the multi-touch sequence, choose a tone, then copy or export the finished brief for your workflow.</p>
                </div>
              </li>
            </ol>

            <div className="mt-3.5 flex gap-2.5 rounded-xl border border-emerald-200/70 bg-emerald-50/60 p-3">
              <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-good" />
              <p className="text-sm leading-snug text-muted">
                <span className="font-medium text-ink">Privacy-first BYOK.</span> Your API keys are kept in this browser and sent with your own requests; they are not stored on the app server. Browser localStorage is not encrypted, so use a trusted device.
              </p>
            </div>

            <button
              type="button"
              autoFocus
              onClick={() => setHowItWorksOpen(false)}
              className="mt-4 w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-accent/90"
            >
              Got it, try the app
            </button>
          </section>
        </div>
      )}

      <ByokModal
        open={byokOpen}
        onClose={() => setByokOpen(false)}
        onSaved={setHasKey}
        onTryDemo={() => { setByokOpen(false); switchMode("demo"); }}
      />
    </main>
  );
}
