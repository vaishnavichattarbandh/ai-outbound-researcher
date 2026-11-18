const KEY = "aor:keys";
export type StoredKeys = { gemini: string; serper: string };

export function loadKeys(): StoredKeys {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(KEY) : null;
    if (raw) return { gemini: "", serper: "", ...JSON.parse(raw) };
  } catch {}
  return { gemini: "", serper: "" };
}
export function saveKeys(k: StoredKeys) {
  try { localStorage.setItem(KEY, JSON.stringify(k)); } catch {}
}
export function clearKeys() {
  try { localStorage.removeItem(KEY); } catch {}
}
