"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Play, X } from "lucide-react";
import { clearKeys, loadKeys, saveKeys } from "@/lib/keys";

type Props = { open: boolean; onClose: () => void; onSaved: (hasKey: boolean) => void; onTryDemo: () => void };

export default function ByokModal({ open, onClose, onSaved, onTryDemo }: Props) {
  const [gemini, setGemini] = useState("");
  const [serper, setSerper] = useState("");
  const [savedGeminiSuffix, setSavedGeminiSuffix] = useState("");
  const [savedSerperSuffix, setSavedSerperSuffix] = useState("");
  const [hasSavedGemini, setHasSavedGemini] = useState(false);
  const [hasSavedSerper, setHasSavedSerper] = useState(false);

  useEffect(() => {
    if (open) {
      const k = loadKeys();
      setGemini("");
      setSerper("");
      setHasSavedGemini(!!k.gemini);
      setHasSavedSerper(!!k.serper);
      setSavedGeminiSuffix(k.gemini.slice(-4));
      setSavedSerperSuffix(k.serper.slice(-4));
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/40" onClick={onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="API settings"
        className="h-full w-full max-w-md overflow-y-auto border-l border-white/60 bg-white/80 p-6 shadow-2xl shadow-slate-950/20 backdrop-blur-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">API Settings</h2>
          <button onClick={onClose} aria-label="Close" className="rounded p-1 hover:bg-paper"><X className="h-5 w-5" /></button>
        </div>
        <p className="mt-2 text-sm text-muted">
          Keys are kept in this browser and sent with your requests; they are not saved on the app server. Password inputs stay masked. Browser storage is not encrypted, so use a trusted device.
        </p>

        <label className="mt-6 block text-sm font-medium">
          Gemini API key <span className="font-normal text-muted">(required for live research)</span>
          <input
            type="password" autoComplete="new-password" value={gemini} onChange={(e) => setGemini(e.target.value)}
            placeholder={hasSavedGemini ? `Saved key ••••${savedGeminiSuffix} — leave blank to keep` : "Paste Gemini key"}
            className="mt-1.5 w-full rounded-lg border border-line px-3 py-2.5 text-sm font-normal focus:border-accent"
          />
        </label>
        <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="mt-1.5 inline-flex items-center gap-1 text-xs text-accent hover:underline">
          Get a free key from Google AI Studio <ExternalLink className="h-3 w-3" />
        </a>

        <label className="mt-5 block text-sm font-medium">
          Serper API key <span className="font-normal text-muted">(optional)</span>
          <input
            type="password" autoComplete="new-password" value={serper} onChange={(e) => setSerper(e.target.value)}
            placeholder={hasSavedSerper ? `Saved key ••••${savedSerperSuffix} — leave blank to keep` : "Paste optional Serper key"}
            className="mt-1.5 w-full rounded-lg border border-line px-3 py-2.5 text-sm font-normal focus:border-accent"
          />
        </label>
        <p className="mt-1.5 text-xs text-muted">Adds live news and hiring signals. Without it, only the website is read.</p>

        <div className="mt-8 flex gap-3">
          <button
            onClick={() => {
              const existing = loadKeys();
              const next = {
                gemini: gemini.trim() || existing.gemini,
                serper: serper.trim() || existing.serper,
              };
              saveKeys(next);
              onSaved(!!next.gemini);
              setGemini("");
              setSerper("");
              onClose();
            }}
            className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent/90"
          >
            Save keys
          </button>
          <button
            onClick={() => { clearKeys(); setGemini(""); setSerper(""); setHasSavedGemini(false); setHasSavedSerper(false); onSaved(false); }}
            className="rounded-lg border border-line px-4 py-2.5 text-sm hover:bg-paper"
          >
            Remove keys
          </button>
        </div>
        {!hasSavedGemini && (
          <div className="mt-8 rounded-xl border border-accent/15 bg-accent-soft/70 p-4">
            <h3 className="font-medium">No Gemini key yet?</h3>
            <p className="mt-1 text-sm text-muted">Add your own key for live research, or try a sample brief without any keys.</p>
            <button onClick={onTryDemo} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-sm font-medium hover:border-accent">
              <Play className="h-4 w-4" /> Try Demo Mode
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}
