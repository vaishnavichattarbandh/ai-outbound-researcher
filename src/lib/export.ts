import type { OutboundBrief } from "./schemas";

export function toMarkdown(b: OutboundBrief, domain?: string, persona?: string, valueProp?: string): string {
  const sequence = b.outboundSequence;
  return [
    `# ${b.companyName}${domain ? ` (${domain})` : ""}`,
    persona ? `**Target persona:** ${persona}` : "",
    valueProp ? `**Value proposition:** ${valueProp}` : "",
    b.oneLineSummary,
    `\n**ICP fit: ${b.icpFitScore}/10** — ${b.icpFitReasoning}`,
    `\n## Trigger signals`,
    ...b.triggerSignals.map(
      (t) => `- **${t.sourceType}:** ${t.signal} _(${t.relevanceToPersona})_\n  Evidence: “${t.evidenceExcerpt}”${t.publishedAt ? ` — Published: ${t.publishedAt}` : ""}${t.sourceUrl ? `\n  Source: ${t.sourceUrl}` : ""}`
    ),
    `\n## Hypothesized pain points`,
    ...b.hypothesizedPainPoints.map((p) => `- ${p}`),
    `\n## Day 1 Cold email\n**Subject:** ${sequence.day1ColdEmail.subjectLine}\n\n${sequence.day1ColdEmail.body}`,
    `\n## Day 2 LinkedIn connection note\n${sequence.day2LinkedIn.connectionNote}`,
    `\n## Day 2 LinkedIn follow-up\n${sequence.day2LinkedIn.followUpDm}`,
    `\n## Day 5 Bump email\n**Subject:** ${sequence.day5BumpEmail.subjectLine}\n\n${sequence.day5BumpEmail.body}`,
    b.meta?.researchedAt ? `\nResearched: ${b.meta.researchedAt}` : "",
  ].join("\n");
}

const esc = (v: string | number) => {
  const value = String(v);
  const safe = /^[\s]*[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
};

export function toCsv(
  b: OutboundBrief,
  domain = "",
  persona = "",
  valueProp = "",
  senderCompany = "",
  senderProductPitch = "",
): string {
  const head = [
    "Company Name", "Company Domain", "Target Persona", "Sender Company", "Sender Product Pitch",
    "Value Proposition", "ICP Fit Score",
    "ICP Fit Reasoning", "GTM Velocity Score", "Product Complexity Score", "Signal Recency Score",
    "Company Summary", "Trigger Signals (JSON)", "Hypothesized Pain Points", "Day 1 Cold Email Subject",
    "Day 1 Cold Email Body", "Day 2 LinkedIn Connection Note", "Day 2 LinkedIn Follow-up DM",
    "Day 5 Bump Email Subject", "Day 5 Bump Email Body", "Tone", "Research Source", "Researched At",
  ];
  const sequence = b.outboundSequence;
  const row = [
    b.companyName, domain, persona, senderCompany, senderProductPitch, valueProp, b.icpFitScore, b.icpFitReasoning,
    b.icpFitBreakdown.gtmVelocity.score, b.icpFitBreakdown.productComplexity.score, b.icpFitBreakdown.signalRecency.score,
    b.oneLineSummary,
    JSON.stringify(b.triggerSignals), b.hypothesizedPainPoints.join(" | "),
    sequence.day1ColdEmail.subjectLine, sequence.day1ColdEmail.body,
    sequence.day2LinkedIn.connectionNote, sequence.day2LinkedIn.followUpDm,
    sequence.day5BumpEmail.subjectLine, sequence.day5BumpEmail.body, b.tone,
    b.meta?.enrichmentSource ?? "", b.meta?.researchedAt ?? "",
  ];
  return head.join(",") + "\n" + row.map(esc).join(",");
}

export function toBatchCsv(
  entries: Array<{ brief: OutboundBrief; domain: string; persona: string; valueProp: string; senderCompany?: string; senderProductPitch?: string }>
): string {
  if (!entries.length) return "";
  const rows = entries.map((entry) => {
    const csv = toCsv(entry.brief, entry.domain, entry.persona, entry.valueProp, entry.senderCompany, entry.senderProductPitch);
    return csv.slice(csv.indexOf("\n") + 1);
  });
  const header = toCsv(entries[0].brief, entries[0].domain, entries[0].persona, entries[0].valueProp, entries[0].senderCompany, entries[0].senderProductPitch).split("\n")[0];
  return `${header}\n${rows.join("\n")}`;
}

export function download(filename: string, content: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}
