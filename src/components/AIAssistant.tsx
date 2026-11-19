"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { MessageCircle, Send, Sparkles, Trash2, X } from "lucide-react";
import { getLocalAssistantResponse } from "@/lib/local-assistant";
import type { AssistantContext } from "@/lib/local-assistant";

type Message = { role: "user" | "model"; content: string };
type Props = { context?: AssistantContext };

const STARTERS = [
  "What is the strongest signal here?",
  "How can I tailor this sequence to the persona?",
  "What should I verify before reaching out?",
  "Help me improve my opening line.",
];

export default function AIAssistant({ context }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const ask = (question: string) => {
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) return;
    const nextMessages = [...messages, { role: "user" as const, content: trimmedQuestion }];
    const localAnswer = getLocalAssistantResponse(trimmedQuestion, context);
    setMessages([...nextMessages, { role: "model", content: localAnswer }]);
    setInput("");
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
                <p className="text-xs text-muted">Instant built-in guidance · no key required</p>
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
                    onClick={() => ask(starter)}
                    className="inline-flex items-center gap-1 rounded-full border border-line bg-white/70 px-2.5 py-1.5 text-xs text-muted hover:border-accent hover:bg-accent-soft hover:text-accent"
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
              </div>
            )}

            <form onSubmit={submit} className="mt-auto flex shrink-0 items-end gap-2 pt-3">
              <label className="sr-only" htmlFor="assistant-question">Ask the AI Assistant</label>
              <textarea
                id="assistant-question"
                rows={1}
                maxLength={3000}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask anything, or ask about this account..."
                className="min-h-11 max-h-28 flex-1 resize-y rounded-lg border border-line bg-white px-3 py-2 text-sm leading-5 placeholder:text-muted/70 focus:border-accent"
              />
              <button type="submit" disabled={!input.trim()} aria-label="Send question" className="inline-flex h-11 shrink-0 items-center gap-2 rounded-lg bg-accent px-3 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50">
                <Send className="h-4 w-4" />
                <span>Ask</span>
              </button>
            </form>
            {messages.length > 0 && (
              <button
                type="button"
                onClick={() => { setMessages([]); setInput(""); }}
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
