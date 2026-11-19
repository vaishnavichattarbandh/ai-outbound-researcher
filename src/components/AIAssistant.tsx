"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { Loader2, MessageCircle, Send, Sparkles, Trash2, X } from "lucide-react";
import { extractGeminiErrorMessage, extractGeminiText } from "@/lib/gemini-response";
import type { OutboundBrief } from "@/lib/schemas";
import { loadKeys } from "@/lib/keys";

type Message = { role: "user" | "model"; content: string };
type AssistantContext = {
  companyDomain?: string;
  targetPersona?: string;
  activeBrief?: OutboundBrief;
  senderValueProposition?: string;
};
type Props = { context?: AssistantContext; onOpenSettings: () => void };

const STARTERS = [
  "What is the strongest signal here?",
  "How can I tailor this sequence to the persona?",
  "What should I verify before reaching out?",
  "Help me improve my opening line.",
];
const RETRY_DELAYS_MS = [400, 900] as const;

export default function AIAssistant({ context, onOpenSettings }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const ask = async (question: string) => {
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion || loading) return;
    const apiKey = loadKeys().gemini;
    if (!apiKey) {
      setError("Add your Gemini API key in API Settings to use the AI Assistant.");
      return;
    }

    const nextMessages = [...messages, { role: "user" as const, content: trimmedQuestion }];
    setMessages(nextMessages);
    setInput("");
    setError("");
    setLoading(true);
    setRetryCount(0);
    try {
      const requestBody = JSON.stringify({ messages: nextMessages.slice(-12), context });
      let response: Response;
      let rawPayload: string;
      for (let attempt = 0; ; attempt++) {
        response = await fetch("/api/assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-gemini-api-key": apiKey },
          body: requestBody,
        });
        rawPayload = await response.text();
        const shouldRetry = (response.status === 429 || response.status === 503) && attempt < RETRY_DELAYS_MS.length;
        if (!shouldRetry) break;
        setRetryCount(attempt + 1);
        console.warn("AI Assistant request will retry", { status: response.status, attempt: attempt + 1, payload: rawPayload });
        await new Promise((resolve) => window.setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
      }

      if (!response.ok && (response.status === 429 || response.status === 503)) {
        console.error("AI Assistant temporary API error persisted after retries", { status: response.status, payload: rawPayload });
        throw new Error(
          response.status === 429
            ? "Gemini is busy right now. Please wait a moment and try again."
            : "Gemini is temporarily unavailable. Please try again shortly.",
        );
      }

      let payload: unknown;
      try {
        payload = JSON.parse(rawPayload);
      } catch {
        console.error("AI Assistant API returned a non-JSON response", { status: response.status, payload: rawPayload });
        const detail = rawPayload.trim().slice(0, 500);
        throw new Error(
          response.ok
            ? `The assistant service returned a non-JSON response (HTTP ${response.status}). Check the server logs.`
            : `Assistant request failed (HTTP ${response.status})${detail ? `: ${detail}` : "."}`,
        );
      }
      if (!response.ok) {
        console.error("AI Assistant API returned an error", { status: response.status, payload });
        throw new Error(extractGeminiErrorMessage(payload) ?? `Assistant request failed (HTTP ${response.status}).`);
      }
      const answer = extractGeminiText(payload);
      if (!answer) {
        console.error("AI Assistant API response had no usable answer", { status: response.status, payload });
        throw new Error(`The assistant returned no readable answer (HTTP ${response.status}). Please try again.`);
      }
      setMessages((current) => [...current, { role: "model", content: answer }]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The assistant request failed. Please try again.");
    } finally {
      setLoading(false);
      setRetryCount(0);
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void ask(input);
  };

  return (
    <>
      {isOpen && (
        <section
          id="ai-assistant-chat"
          role="dialog"
          aria-label="AI Assistant"
          className="fixed bottom-20 right-4 z-40 flex h-[min(34rem,calc(100vh_-_7rem))] w-[calc(100vw_-_2rem)] max-w-sm flex-col overflow-hidden rounded-xl border border-white/80 bg-white/90 shadow-2xl shadow-slate-900/20 backdrop-blur-xl sm:right-6"
        >
          <header className="flex shrink-0 items-center justify-between border-b border-line/70 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-accent">
                <Sparkles className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-ink">AI Assistant</h2>
                <p className="text-xs text-muted">Gemini · outreach help or general Q&amp;A</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close AI Assistant"
              className="rounded-lg p-2 text-muted transition hover:bg-slate-100 hover:text-ink"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          <div className="flex min-h-0 flex-1 flex-col p-3">
            {context?.activeBrief && (
              <p
                className="mb-2 shrink-0 truncate text-xs text-muted"
                title={`${context.activeBrief.companyName}${context.targetPersona ? ` · ${context.targetPersona}` : ""}`}
              >
                Context: {context.activeBrief.companyName}
                {context.targetPersona ? ` · ${context.targetPersona}` : ""}
              </p>
            )}

            {messages.length === 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {STARTERS.map((starter) => (
                  <button
                    key={starter}
                    type="button"
                    disabled={loading}
                    onClick={() => void ask(starter)}
                    className="inline-flex items-center gap-1 rounded-full border border-line bg-white/70 px-2.5 py-1.5 text-xs text-muted hover:border-accent hover:bg-accent-soft hover:text-accent disabled:opacity-50"
                  >
                    <Sparkles className="h-3 w-3 shrink-0" />
                    {starter}
                  </button>
                ))}
              </div>
            ) : (
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-1" role="log" aria-live="polite" aria-relevant="additions text">
                {messages.map((message, index) => (
                  <div key={`${message.role}-${index}`} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                    <p className={`max-w-[90%] whitespace-pre-wrap rounded-xl px-3 py-2 text-sm leading-relaxed ${message.role === "user" ? "bg-accent text-white" : "border border-line bg-white text-ink"}`}>
                      {message.content}
                    </p>
                  </div>
                ))}
                {loading && (
                  <p className="flex items-center gap-2 text-sm text-muted">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {retryCount ? `Retrying (${retryCount}/${RETRY_DELAYS_MS.length})…` : "Thinking…"}
                  </p>
                )}
              </div>
            )}

            {error && (
              <div role="alert" className="mt-2 shrink-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                <p>{error}</p>
                {/API key/i.test(error) && (
                  <button type="button" onClick={onOpenSettings} className="mt-1 font-medium underline underline-offset-2">
                    Open API Settings
                  </button>
                )}
              </div>
            )}

            <form onSubmit={submit} className="mt-auto flex shrink-0 items-end gap-2 pt-3">
              <label className="sr-only" htmlFor="assistant-question">Ask the AI Assistant</label>
              <textarea
                id="assistant-question"
                rows={1}
                maxLength={3000}
                value={input}
                onChange={(event) => { setInput(event.target.value); setError(""); }}
                placeholder="Ask anything, or ask about this account..."
                className="min-h-11 max-h-28 flex-1 resize-y rounded-lg border border-line bg-white px-3 py-2.5 text-sm placeholder:text-muted/70 focus:border-accent"
              />
              <button type="submit" disabled={loading || !input.trim()} aria-label="Send question" className="inline-flex h-11 shrink-0 items-center gap-2 rounded-lg bg-accent px-3 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                <span>{loading ? "Wait" : "Ask"}</span>
              </button>
            </form>
            {(messages.length > 0 || error) && (
              <button
                type="button"
                disabled={loading}
                onClick={() => { setMessages([]); setInput(""); setError(""); }}
                className="mt-2 inline-flex shrink-0 items-center gap-1.5 self-start text-xs text-muted hover:text-ink disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" /> Clear conversation
              </button>
            )}
          </div>
        </section>
      )}
      <button
        type="button"
        aria-label={isOpen ? "Close AI Assistant" : "Open AI Assistant"}
        aria-expanded={isOpen}
        aria-controls={isOpen ? "ai-assistant-chat" : undefined}
        onClick={() => setIsOpen((open) => !open)}
        className="fixed bottom-4 right-4 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-xl shadow-accent/30 transition hover:scale-105 hover:bg-accent/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:right-6"
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>
    </>
  );
}
