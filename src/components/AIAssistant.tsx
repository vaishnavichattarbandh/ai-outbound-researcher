"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { Loader2, MessageCircle, Send, Sparkles, Trash2 } from "lucide-react";
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

export default function AIAssistant({ context, onOpenSettings }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-gemini-api-key": apiKey },
        body: JSON.stringify({ messages: nextMessages.slice(-12), context }),
      });
      const rawPayload = await response.text();
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
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void ask(input);
  };

  return (
    <details className="mt-4 rounded-xl border border-white/70 bg-white/70 shadow-lg shadow-slate-900/5 backdrop-blur-md">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 text-sm font-medium">
        <span className="inline-flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-accent" />
          AI Assistant
          <span className="font-normal text-muted">— ask a question or get help with your outreach</span>
        </span>
        <span className="shrink-0 text-xs text-muted">Gemini</span>
      </summary>
      <div className="border-t border-white/60 p-4">
        {context?.activeBrief && (
          <p className="mb-3 text-xs text-muted">
            Context: {context.activeBrief.companyName}
            {context.targetPersona ? ` · ${context.targetPersona}` : ""}
          </p>
        )}

        {messages.length === 0 ? (
          <div className="flex flex-wrap gap-2">
            {STARTERS.map((starter) => (
              <button
                key={starter}
                type="button"
                disabled={loading}
                onClick={() => void ask(starter)}
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white/70 px-3 py-1.5 text-xs text-muted hover:border-accent hover:bg-accent-soft hover:text-accent disabled:opacity-50"
              >
                <Sparkles className="h-3 w-3" />
                {starter}
              </button>
            ))}
          </div>
        ) : (
          <div className="mb-4 max-h-80 space-y-3 overflow-y-auto" aria-live="polite">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <p className={`max-w-[90%] whitespace-pre-wrap rounded-xl px-3 py-2 text-sm leading-relaxed ${message.role === "user" ? "bg-accent text-white" : "border border-line bg-white text-ink"}`}>
                  {message.content}
                </p>
              </div>
            ))}
            {loading && <p className="text-sm text-muted">Thinking…</p>}
          </div>
        )}

        {error && (
          <div role="alert" className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            <p>{error}</p>
            {/API key/i.test(error) && (
              <button type="button" onClick={onOpenSettings} className="mt-1 font-medium underline underline-offset-2">
                Open API Settings
              </button>
            )}
          </div>
        )}

        <form onSubmit={submit} className="mt-4 flex items-end gap-2">
          <label className="sr-only" htmlFor="assistant-question">Ask the AI Assistant</label>
          <textarea
            id="assistant-question"
            rows={2}
            maxLength={3000}
            value={input}
            onChange={(event) => { setInput(event.target.value); setError(""); }}
            placeholder="Ask anything, or ask about this account..."
            className="min-h-11 flex-1 resize-y rounded-lg border border-line bg-white px-3 py-2.5 text-sm placeholder:text-muted/70 focus:border-accent"
          />
          <button type="submit" disabled={loading || !input.trim()} aria-label="Send question" className="inline-flex h-11 items-center gap-2 rounded-lg bg-accent px-3 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            <span className="hidden sm:inline">{loading ? "Thinking" : "Ask"}</span>
          </button>
        </form>
        {(messages.length > 0 || error) && (
          <button
            type="button"
            disabled={loading}
            onClick={() => { setMessages([]); setInput(""); setError(""); }}
            className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted hover:text-ink disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" /> Clear conversation
          </button>
        )}
      </div>
    </details>
  );
}
