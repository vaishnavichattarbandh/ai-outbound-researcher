import { ResearchRequestSchema, type ResearchRequest } from "./schemas";

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"' && field.length === 0) {
      quoted = true;
    } else if (char === ",") {
      row.push(field.trim());
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(field.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (quoted) throw new Error("CSV contains an unclosed quoted field.");
  row.push(field.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

export function parseBatchCsv(
  text: string,
  context: NonNullable<ResearchRequest["senderContext"]>,
  tone: ResearchRequest["tone"],
): ResearchRequest[] {
  const rows = parseCsvRows(text);
  if (rows.length < 2) throw new Error("Add a header row and at least one company.");
  const headers = rows[0].map((header) => header.replace(/^\uFEFF/, "").trim().toLowerCase());
  const required = ["company_name", "domain", "persona"];
  const indexes = required.map((header) => headers.indexOf(header));
  if (indexes.some((index) => index < 0)) {
    throw new Error("CSV must include these columns: company_name, domain, persona.");
  }
  if (rows.length - 1 > 100) throw new Error("Batch upload is limited to 100 accounts per file.");

  return rows.slice(1).map((row, index) => {
    const [companyIndex, domainIndex, personaIndex] = indexes;
    const targetCompanyName = row[companyIndex] ?? "";
    const companyDomain = row[domainIndex] ?? "";
    const targetPersona = row[personaIndex] ?? "";
    const result = ResearchRequestSchema.safeParse({
      companyDomain,
      targetCompanyName,
      targetPersona,
      senderValueProp: context.valueProposition,
      senderContext: context,
      tone,
    });
    if (!result.success) {
      const problem = result.error.issues[0]?.message ?? "Invalid company details";
      throw new Error(`CSV row ${index + 2}: ${problem}`);
    }
    return result.data;
  });
}
