import { z } from "zod";
import { OutboundBriefSchema, ResearchRequestSchema, type OutboundBrief, type ResearchRequest } from "./schemas";

const STORAGE_KEY = "aor:history:v1";
const MAX_HISTORY = 5;

export type HistoryEntry = {
  id: string;
  savedAt: string;
  domain: string;
  request: ResearchRequest;
  brief: OutboundBrief;
};

const HistorySchema = z.array(z.object({
  id: z.string(),
  savedAt: z.string(),
  domain: z.string(),
  request: ResearchRequestSchema,
  brief: OutboundBriefSchema,
}));

function deduplicateHistory(entries: HistoryEntry[]): HistoryEntry[] {
  const seenDomains = new Set<string>();
  return entries.filter((entry) => {
    const domainKey = entry.domain.trim().toLowerCase();
    if (seenDomains.has(domainKey)) return false;
    seenDomains.add(domainKey);
    return true;
  }).slice(0, MAX_HISTORY);
}

export function loadHistory(): HistoryEntry[] {
  try {
    const raw = typeof window === "undefined" ? null : localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    const result = HistorySchema.safeParse(parsed);
    return result.success ? deduplicateHistory(result.data) : [];
  } catch {
    return [];
  }
}

export function saveHistoryEntry(entry: Omit<HistoryEntry, "id" | "savedAt">): HistoryEntry[] {
  const history = loadHistory();
  const nextEntry: HistoryEntry = {
    ...entry,
    id: `${Date.now()}-${entry.domain}`,
    savedAt: new Date().toISOString(),
  };
  const next = deduplicateHistory([nextEntry, ...history]);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    return history;
  }
  return next;
}
