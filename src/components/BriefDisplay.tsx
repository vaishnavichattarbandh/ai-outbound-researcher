"use client";

import { useState } from "react";
import { Check, Copy, Download, ExternalLink, RefreshCw, Send, ShieldCheck } from "lucide-react";
import { z } from "zod";
import type { OutboundBrief, ResearchRequest } from "@/lib/schemas";
import { DEFAULT_SENDER_CONTEXT, TONES, wordCount } from "@/lib/schemas";
import { download, toCsv, toMarkdown } from "@/lib/export";
import { loadKeys } from "@/lib/keys";

function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  const [error, setError] = useState(false);
  return (
    <span className="inline-flex items-center gap-1">
      <button
        onClick={async () => {
          setError(false);
          try {
            await navigator.clipboard.writeText(text);
            setDone(true);
            setTimeout(() => setDone(false), 1500);
          } catch {
            setError(true);
          }
        }}
        className="inline-flex items-center gap-1.5 rounded-md border border-line bg-white px-2.5 py-1.5 text-xs font-medium hover:border-accent hover:bg-accent-soft"
      >
        {done ? <Check className="h-3.5 w-3.5 text-good" /> : <Copy className="h-3.5 w-3.5" />}
        {done ? "Copied" : label}
      </button>
      {error && <span role="status" className="text-xs text-red-700">Clipboard unavailable</span>}
    </span>
  );
}

function ScoreRing({ score }: { score: number }) {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const color = score >= 8 ? "#13795B" : score >= 5 ? "#2447F5" : "#A15C07";
  return (
    <svg viewBox="0 0 80 80" className="h-20 w-20 shrink-0" role="img" aria-label={`ICP fit ${score} out of 10`}>
      <circle cx="40" cy="40" r={radius} fill="none" stroke="#D9DEE5" strokeWidth="7" />
      <circle cx="40" cy="40" r={radius} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - score / 10)} transform="rotate(-90 40 40)" />
      <text x="40" y="46" textAnchor="middle" fontSize="22" fontWeight="600" fill="#14181F">{score}</text>
    </svg>
  );
}

const sourceStyle: Record<string, string> = {
  Website: "bg-accent-soft text-accent",
  "Recent News": "bg-amber-50 text-warn",
  "Hiring/Growth": "bg-emerald-50 text-good",
};
const sequenceResponseSchema = z.object({
  outboundSequence: z.object({
    day1ColdEmail: z.object({ subjectLine: z.string(), body: z.string() }),
    day2LinkedIn: z.object({ connectionNote: z.string(), followUpDm: z.string() }),
    day5BumpEmail: z.object({ subjectLine: z.string(), body: z.string() }),
  }),
});

function scoreSpamRisk(brief: OutboundBrief): { level: "Low" | "Moderate" | "High"; reasons: string[] } {
  const sequence = brief.outboundSequence;
  const subjectLines = [sequence.day1ColdEmail.subjectLine, sequence.day5BumpEmail.subjectLine];
  const messages = [
    sequence.day1ColdEmail.body,
    sequence.day2LinkedIn.connectionNote,
    sequence.day2LinkedIn.followUpDm,
    sequence.day5BumpEmail.body,
  ];
  const allCopy = [...subjectLines, ...messages].join(" ");
  const reasons = new Set<string>();
  const genericPhrases = [
    /hope this (email|message) finds you well/i,
    /game[- ]changer|revolutionary|cutting[- ]edge|unlock (your|the)/i,
    /leverage|synergy|best[- ]in[- ]class|seamlessly/i,
    /just checking in|bumping this to the top/i,
    /limited time|act now|guaranteed results|click here/i,
  ];
  if (genericPhrases.some((pattern) => pattern.test(allCopy))) reasons.add("Contains common AI or sales clichés");
  if ((allCopy.match(/!/g) ?? []).length > 2 || /[A-Z]{5,}/.test(allCopy)) reasons.add("Excessive punctuation or all-caps wording");
  if (/https?:\/\//i.test(allCopy)) reasons.add("Includes a link in the initial sequence");
  if (subjectLines.some((subject) => subject.length > 65)) reasons.add("A subject line is unusually long");
  if (messages.some((message) => wordCount(message) > 75)) reasons.add("A message is long and may be harder to scan");
  if (!messages.some((message) => brief.triggerSignals.some((signal) => {
    const keyTerms = signal.signal.toLowerCase().split(/\W+/).filter((word) => word.length > 5);
    return keyTerms.some((word) => message.toLowerCase().includes(word));
  }))) reasons.add("Outreach has few specific account details");
  const level = reasons.size >= 3 ? "High" : reasons.size >= 1 ? "Moderate" : "Low";
  if (reasons.size === 0) reasons.add("No obvious cliché, link, or length flags detected");
  return { level, reasons: [...reasons] };
}

export default function BriefDisplay({
  brief,
  domain,
  persona,
  valueProp,
  request,
}: {
  brief: OutboundBrief;
  domain: string;
  persona: string;
  valueProp: string;
  request: ResearchRequest;
}) {
  const [sequence, setSequence] = useState(brief.outboundSequence);
  const [tone, setTone] = useState(brief.tone);
  const [scoreOpen, setScoreOpen] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [activeSignal, setActiveSignal] = useState<number | null>(null);
  const [regenerationError, setRegenerationError] = useState("");
  const [deliveryAction, setDeliveryAction] = useState("");
  const [toast, setToast] = useState("");
  const editableBrief: OutboundBrief = { ...brief, tone, outboundSequence: sequence };
  const senderContext = request.senderContext ?? { ...DEFAULT_SENDER_CONTEXT, valueProposition: request.senderValueProp };
  const slug = domain.replace(/\W+/g, "-");
  const source = brief.meta?.enrichmentSource;
  const spamRisk = scoreSpamRisk(editableBrief);

  const regenerate = async (signalIndex?: number) => {
    setRegenerating(true);
    setActiveSignal(signalIndex ?? null);
    setRegenerationError("");
    const keys = loadKeys();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (keys.gemini) headers["x-gemini-api-key"] = keys.gemini;
    try {
      const response = await fetch("/api/research", {
        method: "POST",
        headers,
        body: JSON.stringify({
          ...request,
          tone,
          action: signalIndex === undefined ? "sequence" : "signal",
          signalIndex,
          currentBrief: editableBrief,
        }),
      });
      const data: unknown = await response.json();
      if (!response.ok) {
        const errorData = z.object({ error: z.string().optional() }).safeParse(data);
        throw new Error(errorData.success ? errorData.data.error ?? "Could not regenerate sequence." : "Could not regenerate sequence.");
      }
      const parsed = sequenceResponseSchema.safeParse(data);
      if (!parsed.success) throw new Error("The server returned an invalid sequence. Please try again.");
      setSequence(parsed.data.outboundSequence);
    } catch (error) {
      setRegenerationError(error instanceof Error ? error.message : "Could not regenerate sequence. Please try again.");
    } finally {
      setRegenerating(false);
      setActiveSignal(null);
    }
  };

  const emailField = (
    name: string,
    value: string,
    onChange: (value: string) => void,
    ariaLabel: string,
  ) => (
    <label className="mt-3 block text-sm text-muted">
      {name}
      <textarea aria-label={ariaLabel} rows={2} className="mt-1 w-full resize-y rounded-md border border-line px-3 py-2 text-sm text-ink" value={value} onChange={(event) => onChange(event.target.value)} />
      <span className="mt-1 flex justify-between text-xs text-muted">
        <span>{wordCount(value)} words</span>
        <span>{value.length} characters</span>
      </span>
    </label>
  );
  const bodyField = (value: string, onChange: (value: string) => void, ariaLabel: string, limit: number) => (
    <>
      <textarea aria-label={ariaLabel} rows={5} className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm leading-relaxed text-ink" value={value} onChange={(event) => onChange(event.target.value)} />
      <p className={`mt-1 flex justify-between text-xs ${wordCount(value) >= limit ? "text-red-700" : "text-muted"}`}>
        <span>{wordCount(value)}{limit < 301 ? ` / ${limit - 1}` : ""} words</span>
        <span>{value.length} characters</span>
      </p>
    </>
  );

  return (
    <article className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {source === "demo" && <span className="rounded-full bg-ink px-3 py-1 font-medium text-white">Demo Mode — Sample Output</span>}
        {source === "search-only" && <span className="rounded-full bg-amber-100 px-3 py-1 font-medium text-warn">Enriched via Live Search Signals</span>}
        {source === "full" && <span className="rounded-full bg-emerald-100 px-3 py-1 font-medium text-good">{brief.meta?.searchStatus === "partial" ? "Website + partial live search" : "Website + search signals"}</span>}
        {source === "website-only" && <span className="rounded-full bg-amber-100 px-3 py-1 font-medium text-warn">Website only</span>}
        {brief.meta && source !== "demo" && <span className="text-muted">{(brief.meta.latencyMs / 1000).toFixed(1)}s</span>}
        {brief.meta?.researchedAt && <span className="text-muted">Researched {new Date(brief.meta.researchedAt).toLocaleString()}</span>}
        <span className="ml-auto flex flex-wrap gap-2">
          <CopyButton text={toMarkdown(editableBrief, domain, persona, valueProp)} label="Copy brief" />
          <label className="inline-flex items-center gap-1.5 rounded-md border border-line bg-white/80 px-2.5 py-1.5 font-medium">
            <Send className="h-3.5 w-3.5" />
            <span className="sr-only">Simulated outbound destination</span>
            <select aria-label="Simulated outbound destination" value={deliveryAction} onChange={(event) => {
              const destination = event.target.value;
              if (!destination) return;
              setDeliveryAction("");
              setToast(`Demo action complete: ${destination} is simulated; connect an integration to push live.`);
              setTimeout(() => setToast(""), 4000);
            }} className="max-w-40 bg-transparent text-xs outline-none">
              <option value="">Push / Export…</option>
              <option value="CRM sequence">Push to CRM / Sequence</option>
              <option value="Instantly">Export to Instantly</option>
              <option value="Smartlead">Export to Smartlead</option>
            </select>
          </label>
          <button onClick={() => download(`${slug}.json`, JSON.stringify({ ...editableBrief, companyDomain: domain, targetPersona: persona, senderValueProp: valueProp, senderContext }, null, 2), "application/json")} className="inline-flex items-center gap-1.5 rounded-md border border-line bg-white px-2.5 py-1.5 font-medium hover:border-accent hover:bg-accent-soft">
            <Download className="h-3.5 w-3.5" /> JSON
          </button>
          <button onClick={() => download(`${slug}.csv`, toCsv(editableBrief, domain, persona, valueProp, senderContext.companyName, senderContext.productPitch), "text/csv")} className="inline-flex items-center gap-1.5 rounded-md border border-line bg-white px-2.5 py-1.5 font-medium hover:border-accent hover:bg-accent-soft">
            <Download className="h-3.5 w-3.5" /> CSV
          </button>
        </span>
      </div>
      {toast && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-good">{toast}</p>}

      {source !== "demo" && brief.meta?.searchStatus && brief.meta.searchStatus !== "available" && (
        <p role="note" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-warn">
          {brief.meta.searchError ?? (brief.meta.searchStatus === "not-configured" ? "No Serper key is configured; this brief uses website content only." : brief.meta.searchStatus === "no-results" ? "Live search returned no matching signals; this brief uses website content only." : brief.meta.searchStatus === "partial" ? "Some live search sources were unavailable, so results may be incomplete." : "Live search was unavailable, so this brief may rely on website content only.")}
        </p>
      )}

      <section className="flex items-start gap-5 rounded-xl border border-white/70 bg-white/70 p-6 shadow-lg shadow-slate-900/5 backdrop-blur-md">
        <div className="relative" onMouseEnter={() => setScoreOpen(true)} onMouseLeave={() => setScoreOpen(false)}>
          <button type="button" aria-label={`ICP fit score ${brief.icpFitScore} out of 10; show breakdown`} aria-expanded={scoreOpen} onFocus={() => setScoreOpen(true)} onBlur={() => setScoreOpen(false)} onClick={() => setScoreOpen(true)} className="rounded-full focus-visible:outline">
            <ScoreRing score={brief.icpFitScore} />
          </button>
          {scoreOpen && (
            <div role="dialog" aria-label="ICP fit score breakdown" className="absolute left-0 top-full z-20 mt-2 w-72 rounded-lg border border-line bg-white p-4 text-sm shadow-lg">
              <h3 className="font-semibold">Fit score breakdown</h3>
              {([
                ["GTM Velocity", brief.icpFitBreakdown.gtmVelocity],
                ["Product Complexity", brief.icpFitBreakdown.productComplexity],
                ["Signal Recency", brief.icpFitBreakdown.signalRecency],
              ] as const).map(([label, item]) => (
                <div key={label} className="mt-3">
                  <p className="font-medium">{label} <span className="text-accent">{item.score}/10</span></p>
                  <p className="text-xs text-muted">{item.reasoning}</p>
                </div>
              ))}
            </div>
          )}
        </div>
        <div>
          <h2 className="text-2xl font-semibold">{brief.companyName}</h2>
          <p className="mt-1 text-muted">{brief.oneLineSummary}</p>
          <p className="mt-3 text-sm">{brief.icpFitReasoning}</p>
        </div>
      </section>

      <section>
        <div className="mb-3">
          <h3 className="font-semibold">Evidence-backed trigger signals</h3>
          <p className="mt-1 text-xs text-muted">Verify source evidence before outreach. Search-based signals may be inferences.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {brief.triggerSignals.map((trigger, index) => {
            const directSite = trigger.sourceType === "Website";
            return (
              <div key={`${trigger.sourceUrl}-${index}`} className="rounded-xl border border-white/70 bg-white/70 p-4 shadow-md shadow-slate-900/5 backdrop-blur-md">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${sourceStyle[trigger.sourceType]}`}>{trigger.sourceType}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${directSite ? "bg-emerald-50 text-good" : "bg-amber-50 text-warn"}`}>{directSite ? "Direct Site Copy" : "News/Careers Inference"}</span>
                  <span className="rounded-full bg-paper px-2.5 py-0.5 text-xs text-muted">{trigger.confidence} confidence</span>
                </div>
                <p className="mt-2 text-sm font-medium">{trigger.signal}</p>
                <p className="mt-1 text-sm text-muted">{trigger.relevanceToPersona}</p>
                <blockquote className="mt-3 border-l-2 border-line pl-3 text-xs italic text-muted">“{trigger.evidenceExcerpt}”</blockquote>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="rounded-full bg-paper px-2.5 py-1 text-xs text-muted">
                    Freshness · {trigger.publishedAt ? `Published ${trigger.publishedAt}` : directSite ? "Site copy · date unavailable" : "Date unavailable"}
                  </span>
                  <a href={trigger.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-accent hover:underline">Open source <ExternalLink className="h-3 w-3" /></a>
                </div>
                {source !== "demo" && (
                  <button type="button" disabled={regenerating} onClick={() => regenerate(index)} className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-xs font-medium hover:border-accent disabled:opacity-50">
                    <RefreshCw className={`h-3.5 w-3.5 ${activeSignal === index ? "animate-spin" : ""}`} />
                    Regenerate around this signal
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-xl border border-white/70 bg-white/70 p-6 shadow-lg shadow-slate-900/5 backdrop-blur-md">
        <h3 className="font-semibold">Hypothesized pain points</h3>
        <p className="mt-1 text-xs text-muted">Role-based hypotheses, not confirmed facts about this company.</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{brief.hypothesizedPainPoints.map((point, index) => <li key={index}>{point}</li>)}</ul>
      </section>

      <section className="space-y-4 rounded-xl border border-white/70 bg-white/70 p-6 shadow-lg shadow-slate-900/5 backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold">Multi-touch sequence</h3>
            <p className="mt-1 text-xs text-muted">Tailored for {senderContext.companyName}: {senderContext.productPitch}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {TONES.map((option) => (
              <button key={option} type="button" aria-pressed={tone === option} onClick={() => setTone(option)} className={`rounded-full border px-3 py-1.5 text-xs ${tone === option ? "border-accent bg-accent-soft text-accent" : "border-line text-muted hover:border-accent"}`}>{option}</button>
            ))}
            {source !== "demo" && (
              <button type="button" disabled={regenerating} onClick={() => regenerate()} className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50">
                <RefreshCw className={`h-3.5 w-3.5 ${regenerating && activeSignal === null ? "animate-spin" : ""}`} />
                Regenerate sequence
              </button>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-line p-4">
            <h4 className="font-medium">Day 1 · Cold email</h4>
            {emailField("Subject", sequence.day1ColdEmail.subjectLine, (value) => setSequence((current) => ({ ...current, day1ColdEmail: { ...current.day1ColdEmail, subjectLine: value } })), "Day 1 email subject")}
            <label className="mt-3 block text-sm text-muted">Body</label>
            {bodyField(sequence.day1ColdEmail.body, (value) => setSequence((current) => ({ ...current, day1ColdEmail: { ...current.day1ColdEmail, body: value } })), "Day 1 cold email body", 80)}
            <CopyButton text={`Subject: ${sequence.day1ColdEmail.subjectLine}\n\n${sequence.day1ColdEmail.body}`} label="Copy email" />
          </div>

          <div className="rounded-lg border border-line p-4">
            <h4 className="font-medium">Day 2 · LinkedIn</h4>
            <label className="mt-3 block text-sm text-muted">Connection note</label>
            {bodyField(sequence.day2LinkedIn.connectionNote, (value) => setSequence((current) => ({ ...current, day2LinkedIn: { ...current.day2LinkedIn, connectionNote: value } })), "LinkedIn connection note", 301)}
            <p className="text-right text-xs text-muted">{sequence.day2LinkedIn.connectionNote.length} / 300 characters</p>
            <label className="mt-3 block text-sm text-muted">Follow-up DM</label>
            {bodyField(sequence.day2LinkedIn.followUpDm, (value) => setSequence((current) => ({ ...current, day2LinkedIn: { ...current.day2LinkedIn, followUpDm: value } })), "LinkedIn follow-up DM", 1000)}
            <p className="text-right text-xs text-muted">{sequence.day2LinkedIn.followUpDm.length} characters</p>
            <CopyButton text={`Connection note: ${sequence.day2LinkedIn.connectionNote}\n\nFollow-up: ${sequence.day2LinkedIn.followUpDm}`} label="Copy LinkedIn touches" />
          </div>

          <div className="rounded-lg border border-line p-4 md:col-span-2">
            <h4 className="font-medium">Day 5 · Bump email</h4>
            <div className="grid gap-3 md:grid-cols-2">
              <div>{emailField("Subject", sequence.day5BumpEmail.subjectLine, (value) => setSequence((current) => ({ ...current, day5BumpEmail: { ...current.day5BumpEmail, subjectLine: value } })), "Day 5 email subject")}</div>
              <div>
                <label className="mt-3 block text-sm text-muted">Body</label>
                {bodyField(sequence.day5BumpEmail.body, (value) => setSequence((current) => ({ ...current, day5BumpEmail: { ...current.day5BumpEmail, body: value } })), "Day 5 bump email body", 80)}
              </div>
            </div>
            <CopyButton text={`Subject: ${sequence.day5BumpEmail.subjectLine}\n\n${sequence.day5BumpEmail.body}`} label="Copy bump email" />
          </div>
        </div>
      </section>
      <section className={`rounded-xl border p-4 ${spamRisk.level === "Low" ? "border-emerald-200 bg-emerald-50/70" : spamRisk.level === "Moderate" ? "border-amber-200 bg-amber-50/70" : "border-red-200 bg-red-50/70"}`}>
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4" />
          <h3 className="font-semibold">Spam risk check · {spamRisk.level}</h3>
        </div>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          {spamRisk.reasons.map((reason) => <li key={reason}>{reason}</li>)}
        </ul>
        <p className="mt-2 text-xs text-muted">Heuristic copy review only—not a deliverability test or inbox-placement guarantee. Verify sending domain authentication and test with your provider.</p>
      </section>
      {regenerationError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">{regenerationError}</p>}
    </article>
  );
}
