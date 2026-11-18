"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Loader2, Sparkles, Upload } from "lucide-react";
import { DEMO_DATA, DEMO_DOMAINS } from "@/lib/demo-data";
import { parseBatchCsv } from "@/lib/csv-batch";
import {
  DEFAULT_SENDER_CONTEXT,
  TONES,
  type ResearchRequest,
} from "@/lib/schemas";

const CONTEXT_KEY = "aor:sender-context:v1";
type Props = {
  mode: "demo" | "live";
  loading: boolean;
  fieldErrors?: Record<string, string[] | undefined>;
  onDemo: (domain: string) => void;
  onSubmit: (req: ResearchRequest) => void;
  onBatch: (requests: ResearchRequest[]) => void;
};

const inputCls =
  "w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm placeholder:text-muted/70 focus:border-accent";

export default function ResearchForm({ mode, loading, fieldErrors, onDemo, onSubmit, onBatch }: Props) {
  const [form, setForm] = useState({ companyDomain: "", targetPersona: "" });
  const [senderContext, setSenderContext] = useState(DEFAULT_SENDER_CONTEXT);
  const [tone, setTone] = useState<(typeof TONES)[number]>("Consultative");
  const [batchMode, setBatchMode] = useState(false);
  const [batchFile, setBatchFile] = useState<File | null>(null);
  const [batchError, setBatchError] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(CONTEXT_KEY);
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (parsed && typeof parsed === "object") {
          setSenderContext({ ...DEFAULT_SENDER_CONTEXT, ...parsed });
        }
      }
    } catch {
      setSenderContext(DEFAULT_SENDER_CONTEXT);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(CONTEXT_KEY, JSON.stringify(senderContext));
    } catch {
      // The form remains usable if browser storage is unavailable.
    }
  }, [senderContext]);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((current) => ({ ...current, [key]: e.target.value }));
  const setContext = (key: keyof typeof senderContext) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => setSenderContext((current) => ({ ...current, [key]: event.target.value }));

  if (mode === "demo") {
    return (
      <div className="rounded-xl border border-white/70 bg-white/70 p-6 shadow-lg shadow-slate-900/5 backdrop-blur-md">
        <h2 className="text-lg font-semibold">Try Live Demo (No API Key)</h2>
        <p className="mt-1 text-sm text-muted">
          Pick a company to see a full sample brief instantly. Nothing is sent to any API.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {DEMO_DOMAINS.map((domain) => (
            <button
              key={domain}
              disabled={loading}
              onClick={() => onDemo(domain)}
              className="rounded-lg border border-line bg-paper px-4 py-3 text-left transition hover:border-accent hover:bg-accent-soft disabled:opacity-50"
            >
              <span className="block font-medium">{DEMO_DATA[domain].label}</span>
              <span className="block text-sm text-muted">{domain}</span>
              <span className="mt-1 block text-xs text-muted">Persona: {DEMO_DATA[domain].request.targetPersona}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const err = (key: string) =>
    fieldErrors?.[key]?.[0] ? <p className="mt-1 text-xs text-red-700">{fieldErrors[key][0]}</p> : null;

  const researchRequest = (): ResearchRequest => ({
    ...form,
    senderValueProp: senderContext.valueProposition,
    senderContext,
    tone,
  });

  const fill = (request: ResearchRequest) => {
    setForm({ companyDomain: request.companyDomain, targetPersona: request.targetPersona });
    setSenderContext(request.senderContext ?? DEFAULT_SENDER_CONTEXT);
    setTone(request.tone);
  };

  const submitBatch = async () => {
    setBatchError("");
    if (!batchFile) {
      setBatchError("Choose a CSV file first.");
      return;
    }
    try {
      const requests = parseBatchCsv(await batchFile.text(), senderContext, tone);
      onBatch(requests);
    } catch (error) {
      setBatchError(error instanceof Error ? error.message : "Could not read the CSV file.");
    }
  };

  return (
    <div className="rounded-xl border border-white/70 bg-white/70 p-6 shadow-lg shadow-slate-900/5 backdrop-blur-md">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="font-semibold">Live research</h2>
        <div role="tablist" aria-label="Research mode" className="inline-flex rounded-lg border border-line bg-paper p-1 text-xs">
          <button type="button" role="tab" aria-selected={!batchMode} onClick={() => setBatchMode(false)} className={`rounded-md px-3 py-1.5 ${!batchMode ? "bg-ink text-white" : "text-muted"}`}>
            Single account
          </button>
          <button type="button" role="tab" aria-selected={batchMode} onClick={() => setBatchMode(true)} className={`rounded-md px-3 py-1.5 ${batchMode ? "bg-ink text-white" : "text-muted"}`}>
            CSV batch
          </button>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted">Fill sample inputs:</span>
        {DEMO_DOMAINS.map((domain) => (
          <button type="button" key={domain} onClick={() => fill(DEMO_DATA[domain].request)} className="rounded-full border border-line px-3 py-1 hover:border-accent hover:bg-accent-soft">
            {domain}
          </button>
        ))}
      </div>

      <details className="mb-5 rounded-lg border border-line bg-paper">
        <summary className="flex cursor-pointer list-none items-center justify-between p-4 text-sm font-medium">
          <span>Sender Context <span className="ml-1 font-normal text-muted">— personalize the sequence to your offering</span></span>
          <ChevronDown className="h-4 w-4 text-muted" />
        </summary>
        <div className="grid gap-4 border-t border-line p-4 sm:grid-cols-2">
          <label className="block text-sm font-medium">
            Your company name
            <input className={`${inputCls} mt-1.5 font-normal`} value={senderContext.companyName} onChange={setContext("companyName")} />
          </label>
          <label className="block text-sm font-medium">
            Product pitch
            <input className={`${inputCls} mt-1.5 font-normal`} value={senderContext.productPitch} onChange={setContext("productPitch")} />
          </label>
          <label className="block text-sm font-medium sm:col-span-2">
            Value proposition
            <textarea rows={2} className={`${inputCls} mt-1.5 font-normal`} value={senderContext.valueProposition} onChange={setContext("valueProposition")} />
            {err("senderValueProp")}
          </label>
          <p className="text-xs text-muted sm:col-span-2">Saved in this browser and included with your research request.</p>
        </div>
      </details>

      <div className="mb-5">
        <p className="text-sm font-medium">Outreach tone</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {TONES.map((option) => (
            <button key={option} type="button" aria-pressed={tone === option} onClick={() => setTone(option)} className={`rounded-full border px-3 py-1.5 text-sm ${tone === option ? "border-accent bg-accent-soft text-accent" : "border-line text-muted hover:border-accent"}`}>
              {option}
            </button>
          ))}
        </div>
      </div>

      {batchMode ? (
        <section className="rounded-lg border border-dashed border-line bg-paper p-5">
          <div className="flex items-start gap-3">
            <Upload className="mt-0.5 h-5 w-5 text-accent" />
            <div>
              <h3 className="font-medium">Upload accounts CSV</h3>
              <p className="mt-1 text-sm text-muted">Required columns: <code>company_name</code>, <code>domain</code>, <code>persona</code>. Up to 100 accounts; processed sequentially.</p>
            </div>
          </div>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => { setBatchFile(event.target.files?.[0] ?? null); setBatchError(""); }}
            className="mt-4 block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-white file:px-3 file:py-2 file:text-sm file:font-medium"
          />
          {batchError && <p role="alert" className="mt-2 text-sm text-red-700">{batchError}</p>}
          <button type="button" disabled={loading || !batchFile} onClick={submitBatch} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {loading ? "Processing batch" : "Research CSV"}
          </button>
        </section>
      ) : (
        <form onSubmit={(event) => { event.preventDefault(); onSubmit(researchRequest()); }}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium">
              Company domain
              <input className={`${inputCls} mt-1.5 font-normal`} placeholder="razorpay.com" value={form.companyDomain} onChange={set("companyDomain")} />
              {err("companyDomain")}
            </label>
            <label className="block text-sm font-medium">
              Target persona
              <input className={`${inputCls} mt-1.5 font-normal`} placeholder="VP of Marketing" value={form.targetPersona} onChange={set("targetPersona")} />
              {err("targetPersona")}
            </label>
          </div>

          <button type="submit" disabled={loading} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-60">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? "Researching" : "Research account"}
          </button>
        </form>
      )}
    </div>
  );
}
