type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function read(record: JsonRecord, key: string): unknown {
  try {
    return record[key];
  } catch {
    return undefined;
  }
}

function serializeStructured(value: unknown): string | undefined {
  if (!isRecord(value)) return undefined;
  try {
    if (Object.keys(value).length === 0) return undefined;
    return JSON.stringify(value);
  } catch {
    return undefined;
  }
}

function extractText(value: unknown, seen = new Set<object>(), depth = 0): string | undefined {
  if (depth > 8) return undefined;
  if (typeof value === "string") return value.trim() || undefined;
  if (Array.isArray(value)) {
    const texts = value
      .map((item) => extractText(item, seen, depth + 1))
      .filter((text): text is string => !!text);
    return texts.length ? texts.join("\n") : undefined;
  }
  if (!isRecord(value) || seen.has(value)) return undefined;
  seen.add(value);

  if (read(value, "thought") === true || read(value, "type") === "thought") return undefined;

  for (const key of ["text", "output_text", "outputText", "answer"]) {
    const direct = read(value, key);
    if (typeof direct === "string" && direct.trim()) return direct.trim();
  }

  const parsed = read(value, "parsed");
  if (parsed !== undefined && parsed !== null) {
    const parsedText = extractText(parsed, seen, depth + 1) ?? serializeStructured(parsed);
    if (parsedText) return parsedText;
  }
  const structuredAnswer = read(value, "answer");
  if (structuredAnswer !== undefined && structuredAnswer !== null) {
    const answerText = serializeStructured(structuredAnswer);
    if (answerText) return answerText;
  }

  for (const key of ["parts", "content", "candidates", "steps", "output", "response", "result", "message", "data"]) {
    const nested = read(value, key);
    if (nested === undefined || nested === null) continue;
    const nestedText = extractText(nested, seen, depth + 1);
    if (nestedText) return nestedText;
    if (key === "output") {
      const structuredOutput = serializeStructured(nested);
      if (structuredOutput) return structuredOutput;
    }
  }
  return undefined;
}

export function extractGeminiText(response: unknown): string | undefined {
  return extractText(response);
}

export function extractGeminiErrorMessage(payload: unknown, depth = 0): string | undefined {
  if (depth > 5 || !isRecord(payload)) return undefined;
  for (const key of ["error", "message", "detail"]) {
    const message = read(payload, key);
    if (typeof message === "string" && message.trim()) return message.trim();
  }
  for (const key of ["error", "details", "data", "response"]) {
    const message = extractGeminiErrorMessage(read(payload, key), depth + 1);
    if (message) return message;
  }
  return undefined;
}

export function rawGeminiPayload(error: unknown): unknown {
  if (!isRecord(error)) {
    return error instanceof Error ? { name: error.name, message: error.message } : error;
  }
  for (const key of ["error", "payload", "responseBody"]) {
    const payload = read(error, key);
    if (payload !== undefined) return payload;
  }
  return { name: read(error, "name"), message: read(error, "message") };
}
