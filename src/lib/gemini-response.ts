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
