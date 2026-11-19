import type { OutboundBrief } from "./schemas";

type AssistantBriefContext = {
  companyName: string;
  oneLineSummary: string;
  triggerSignals: Array<Pick<OutboundBrief["triggerSignals"][number], "signal" | "relevanceToPersona" | "evidenceExcerpt">>;
  hypothesizedPainPoints: string[];
  outboundSequence: OutboundBrief["outboundSequence"];
};

export type AssistantContext = {
  companyDomain?: string;
  targetPersona?: string;
  activeBrief?: AssistantBriefContext;
  senderValueProposition?: string;
};

const ROLE_GUIDANCE: Array<{ match: RegExp; focus: string; pain: string }> = [
  { match: /engineering|cto|developer|technical/i, focus: "developer adoption, technical workflow, reliability, and delivery", pain: "reducing friction across engineering workflows" },
  { match: /revops|revenue operations|sales operations/i, focus: "clean data, routing, attribution, and reliable forecasting", pain: "improving data consistency and operational visibility" },
  { match: /sales|revenue/i, focus: "pipeline coverage, rep productivity, ramp time, and forecast quality", pain: "helping the team create more qualified pipeline without adding busywork" },
  { match: /growth|marketing/i, focus: "segmentation, experimentation, acquisition, and conversion", pain: "finding repeatable ways to improve conversion and growth" },
  { match: /founder|ceo|chief executive/i, focus: "focus, efficient execution, and predictable growth", pain: "getting more leverage from a focused team" },
];

const DEFINITIONS: Array<{ match: RegExp; definition: string }> = [
  { match: /\b(icp|ideal customer profile)\b/i, definition: "An ideal customer profile (ICP) describes the organizations most likely to benefit from an offering and become successful customers. It is about account fit; a persona describes the person you contact." },
  { match: /\b(persona|buyer persona)\b/i, definition: "A buyer persona is a practical description of a target role: its goals, constraints, responsibilities, and likely priorities. Use it to shape relevance, not to assume every person in that role has the same problem." },
  { match: /\b(trigger signal|trigger|buying signal)\b/i, definition: "A trigger signal is a recent, verifiable change that may make a conversation timely, such as a launch, hiring pattern, or expansion. Treat it as a reason to ask a relevant question, not proof of a need." },
  { match: /\b(value proposition|value prop)\b/i, definition: "A value proposition connects what you offer to a specific outcome for a particular buyer. Keep the actual offering intact, name a plausible outcome, and avoid promising results you cannot substantiate." },
  { match: /\b(call to action|cta)\b/i, definition: "A call to action (CTA) is the next step you ask the reader to take. For cold outreach, a small, low-pressure question is usually easier to answer than a large meeting request." },
  { match: /\b(revops|revenue operations)\b/i, definition: "Revenue Operations (RevOps) aligns the systems, processes, and data used across sales, marketing, and customer success so teams can operate and measure the revenue journey consistently." },
  { match: /\b(gtm|go.to.market)\b/i, definition: "Go-to-market (GTM) is how a company reaches, sells to, and serves its target customers. It includes the audience, positioning, channels, sales motion, and customer experience." },
  { match: /\b(pipeline|sales pipeline)\b/i, definition: "A sales pipeline is the set of active opportunities organized by stage. It helps teams see what may close, what is stalled, and where the next useful action is needed." },
];

function firstRoleGuidance(persona?: string) {
  return ROLE_GUIDANCE.find((role) => persona && role.match.test(persona));
}

function formatList(items: string[]): string {
  return items.map((item) => `- ${item}`).join("\n");
}

export function getLocalAssistantResponse(question: string, context?: AssistantContext): string {
  const normalized = question.toLowerCase();
  const brief = context?.activeBrief;
  const persona = context?.targetPersona?.trim() || "your target buyer";
  const company = brief?.companyName || context?.companyDomain;
  const role = firstRoleGuidance(context?.targetPersona);
  const signals = brief?.triggerSignals ?? [];
  const signal = signals[0];
  const painPoints = brief?.hypothesizedPainPoints ?? [];
  const focus = role?.focus ?? "the goals and constraints of the selected role";

  if (/^(hi|hello|hey|good morning|good afternoon|good evening|thanks|thank you)\b/i.test(question.trim())) {
    return "Hi! I can help with account research, buyer-persona angles, outreach drafts, follow-ups, and common GTM terms. I can also use the active brief when one is available.";
  }

  if (/\b(what can you do|how can you help|what do you help with)\b/i.test(normalized)) {
    return "I can give quick, local help with the active company's signals, persona-specific pain hypotheses, value proposition, sequence edits, research checks, and common outbound/GTM questions. Ask a general question too; no Gemini key is required.";
  }

  if (/\b(opening line|subject line|draft|write|rewrite|improve|edit|cold email)\b/i.test(normalized)) {
    if (!signal) {
      return `For ${persona}, focus the opener on ${focus}. I don't have a verified trigger in the active brief, so avoid inventing one. Try: "I work with ${persona}s on [relevant outcome]. Is [specific challenge] a priority for your team this quarter?" Replace the bracketed parts with facts you can verify.`;
    }
    const observedSignal = signal.signal.slice(0, 220);
    const pain = painPoints[0] ?? role?.pain;
    const value = context?.senderValueProposition?.trim();
    return [
      `A concise opener for ${persona}${company ? ` at ${company}` : ""}, grounded in the brief:`,
      `“I noticed ${observedSignal}. For ${persona}s, ${pain ? `${pain} can be worth exploring` : focus} — ${value ? `we help teams ${value}` : "is that relevant to your priorities"}?”`,
      "Keep the signal as an observation, frame the pain as a question, and verify the source before sending.",
    ].join("\n\n");
  }

  if (/\b(strongest|best|most relevant|trigger|signal|why now)\b/i.test(normalized)) {
    if (!signal) return "There are no trigger signals in the active brief yet. Research a recent, verifiable company change first, then connect it to a question relevant to the selected persona.";
    return [
      `Best available signal for ${company ?? "this account"}: ${signal.signal}`,
      signal.evidenceExcerpt ? `Evidence in the brief: “${signal.evidenceExcerpt}”` : "",
      signal.relevanceToPersona ? `Why it may matter to ${persona}: ${signal.relevanceToPersona}` : `Use it as a timely opening for ${persona}, not as proof of a specific need.`,
    ].filter(Boolean).join("\n\n");
  }

  if (/\b(verify|check|fact.check|source|evidence|accurate|before reaching out)\b/i.test(normalized)) {
    const checklist = [
      "Open the cited source and confirm the wording and date are still accurate.",
      "Separate the observed fact from your interpretation; phrase the implication as a hypothesis.",
      `Check that the angle connects to ${persona}'s responsibilities (${focus}).`,
      "Remove unsupported metrics, customer claims, or assumptions about the person's current priorities.",
    ];
    if (signal?.evidenceExcerpt) checklist.unshift(`Re-check the brief's evidence excerpt: “${signal.evidenceExcerpt}”`);
    return `Before reaching out${company ? ` about ${company}` : ""}:\n${formatList(checklist)}`;
  }

  const asksForDefinition = /\b(what is|what are|define|meaning of|explain)\b/i.test(normalized)
    && !/\b(strongest|best|most relevant|why now)\b/i.test(normalized);
  const definition = DEFINITIONS.find((item) => item.match.test(normalized));
  if (asksForDefinition && definition) return definition.definition;

  if (/\b(research|prospect|before.*contact|account plan)\b/i.test(normalized)) {
    return [
      `A quick research plan${company ? ` for ${company}` : ""}:`,
      formatList([
        "Confirm the company's current product, audience, and recent changes from first-party sources.",
        `Find one timely signal that could matter to ${persona}; note its source and date.`,
        `Write one question connecting that signal to ${focus}, without assuming the buyer has a problem.`,
      ]),
    ].join("\n\n");
  }

  if (/\b(company|brief|what do we know|summari[sz]e)\b/i.test(normalized) && brief) {
    const details = [
      `${brief.companyName}: ${brief.oneLineSummary}`,
      signals.length ? `Signals to review:\n${formatList(signals.slice(0, 3).map((item) => item.signal))}` : "",
      painPoints.length ? `Role-specific pain points are hypotheses:\n${formatList(painPoints.slice(0, 3))}` : "",
    ].filter(Boolean);
    return details.join("\n\n");
  }

  if (/\b(persona|buyer|role|pain point|challenge|bottleneck)\b/i.test(normalized)) {
    const briefPain = painPoints.slice(0, 3);
    return [
      `${persona} is most likely to care about ${focus}.`,
      briefPain.length
        ? `The active brief's hypotheses to validate are:\n${formatList(briefPain)}`
        : `A reasonable starting hypothesis is ${role?.pain ?? "a goal or constraint directly tied to this role's responsibilities"}. Ask a question to validate it rather than stating it as fact.`,
    ].join("\n\n");
  }

  if (/\b(value proposition|value prop|positioning|benefit)\b/i.test(normalized)) {
    const value = context?.senderValueProposition?.trim();
    return [
      value ? `Your current value proposition is: ${value}` : "No sender value proposition is available in the active context.",
      `For ${persona}, connect that offering to ${focus}. Keep the product claim unchanged; tailor the outcome and example to the role.`,
    ].join("\n\n");
  }

  if (/\b(sequence|follow.?up|linkedin|outbound|multi.?touch|touchpoint)\b/i.test(normalized)) {
    const sequence = brief?.outboundSequence;
    return [
      `For a ${persona}-focused sequence, keep each touch connected to ${focus} and add something new rather than repeating the same pitch.`,
      sequence
        ? `The brief already includes a Day 1 email, Day 2 LinkedIn note and follow-up, and Day 5 bump. Use the first touch to introduce the verified signal, the next to add a concise role-specific question, and the bump to offer a low-pressure next step.`
        : "A simple structure is: first touch with a verified observation and question; follow-up with one useful detail; final bump with a low-pressure next step.",
    ].join("\n\n");
  }

  if (definition) return definition.definition;

  if (/\b(prioriti[sz]e|time management|organize my work|plan my day|productivity)\b/i.test(normalized)) {
    return "A practical prioritization pass: 1) write down the outcome that matters most, 2) separate urgent commitments from optional work, 3) choose the smallest action that moves the outcome forward, and 4) defer or delegate the rest. If you share your task list and deadline, I can help sort it.";
  }

  if (/\b(meeting|prepare for|agenda)\b/i.test(normalized)) {
    return "For a useful meeting, define the decision or outcome first, review what is already known, prepare two or three focused questions, and end with an owner and next step. For a prospect meeting, add the buyer's role and any verified company signals without treating hypotheses as facts.";
  }

  return [
    "I can still help without Gemini. My built-in assistant is best at common outreach, research, writing, and GTM questions.",
    `For ${question.trim().slice(0, 160)}, a useful starting point is to identify the outcome you want, the verified facts available, and the main constraint; then choose one concrete next step. Add those details and I can make the advice more specific.`,
  ].join("\n\n");
}
