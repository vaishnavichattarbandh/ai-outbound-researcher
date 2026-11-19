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

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
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
  const sequence = brief?.outboundSequence;
  const focus = role?.focus ?? "the goals and constraints of the selected role";
  const asksForCopy = /\b(opening line|subject line|draft|write|rewrite|edit|cold email)\b/i.test(normalized)
    || (/\b(improve|polish|tailor|personalize|adapt)\b/i.test(normalized) && /\b(opening|subject|email|copy|line|message)\b/i.test(normalized));

  if (/^(hi|hello|hey|good morning|good afternoon|good evening|thanks|thank you)\b/i.test(question.trim())) {
    return "Hi! I can help with account research, buyer-persona angles, outreach drafts, follow-ups, and common GTM terms. I can also use the active brief when one is available.";
  }

  if (/\b(what can you do|how can you help|what do you help with)\b/i.test(normalized)) {
    return "I can give quick, local help with the active company's signals, persona-specific pain hypotheses, value proposition, sequence edits, research checks, and common outbound/GTM questions. Ask a general question too; no Gemini key is required.";
  }

  if (/\b(sequence|cadence|touchpoint|multi.?touch)\b/i.test(normalized)
    && /\b(improve|review|critique|feedback|optimi[sz]e|better|tailor|personalize|adapt)\b/i.test(normalized)) {
    if (!sequence) {
      return `For a ${persona}-focused sequence, keep the first touch anchored to one verified signal, make the LinkedIn touch add a new angle, and use the final bump for a simple low-pressure question.`;
    }
    const subjectWords = wordCount(sequence.day1ColdEmail.subjectLine);
    const firstSentence = sequence.day1ColdEmail.body.split(/(?<=[.!?])\s+/)[0]?.slice(0, 180);
    const day2Length = sequence.day2LinkedIn.connectionNote.length;
    return [
      `Quick sequence review for ${persona}${company ? ` at ${company}` : ""}:`,
      `- Day 1 subject is ${subjectWords} words; ${subjectWords > 5 ? "consider shortening it to a few specific words" : "keep it specific and easy to scan"}.`,
      firstSentence ? `- Current email opening: “${firstSentence}”` : "",
      `- Day 2 connection note is ${day2Length} characters. Keep it focused on a shared, verified observation; let the separate follow-up DM add context rather than repeat the pitch.`,
      "- Day 5 should add a useful new angle or a graceful close, not simply resend the same ask.",
      signal ? `- Tie the sequence back to this brief signal: ${signal.signal}` : "- Add a recent, verifiable signal before making the sequence company-specific.",
      painPoints[0] ? `- Treat “${painPoints[0]}” as a hypothesis to test, not a fact about the buyer.` : "",
    ].filter(Boolean).join("\n");
  }

  if (/\b(demo mode|live research|sample compan(?:y|ies)|preset|how does this app work|how do i use this app|what does this app do)\b/i.test(normalized)) {
    return "Demo Mode loads ready-made example briefs so you can explore the workflow without research keys. Live Research gathers current company evidence and builds a brief and sequence. Choose a persona and provide your sender context for more relevant copy. The Assistant itself always works locally and needs no API key.";
  }

  if (/\b(batch|csv|spreadsheet|sample file)\b/i.test(normalized)) {
    return "Use the CSV batch tab to research multiple companies from a file with company_name, domain, and persona columns. The Download sample CSV button provides a six-row example. Review each result and its evidence before using generated outreach.";
  }

  if (/\b(api settings|api key|gemini key|serper key)\b/i.test(normalized)) {
    return "The AI Assistant is built in and works without API keys. API Settings are separate and are only relevant to live research features that need provider access; keys are stored in this browser. You can use Demo Mode to explore without configuring them.";
  }

  if (/\b(export|download|copy|save the sequence)\b/i.test(normalized) && /\b(app|brief|sequence|result|email|research)\b/i.test(normalized)) {
    return "After a brief is ready, use the actions on the result to copy or export the sequence. You can edit the generated copy first, then verify its source evidence and personalize it before sending.";
  }

  if (/\b(where|find|view|show)\b.*\b(evidence|source|signal)\b/i.test(normalized)) {
    return signals.length
      ? `Open the ${company ?? "company"} brief and review the Trigger Signals section. Start with: “${signal?.signal}”${signal?.evidenceExcerpt ? `\nEvidence excerpt: “${signal.evidenceExcerpt}”` : ""} Check the source link and date in the brief before using it.`
      : "Open a completed brief and review its Trigger Signals section for evidence excerpts and source links. Demo Mode provides sample evidence; Live Research uses the sources available for that run.";
  }

  if (/\b(select|change|choose|set)\b.{0,30}\bpersona\b|\bpersona selector\b/i.test(normalized)) {
    return `Use the Target Persona selector in the research form and choose the role closest to your intended buyer. The generated pain hypotheses and sequence then emphasize role-relevant priorities; verify those hypotheses with the person rather than treating them as facts.`;
  }

  if (/\b(this app|the app|feature|button|assistant|how do i use|where can i find)\b/i.test(normalized)) {
    return "This app creates B2B account briefs and outbound sequences. Demo Mode loads ready-made examples; Live Research gathers available company evidence. Choose a target persona and add sender context for more relevant copy. Review signal sources, edit the sequence, then copy or export it. The AI Assistant uses instant built-in guidance.";
  }

  if (asksForCopy) {
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

  const asksAboutActiveCompany = !!brief
    && normalized.includes(brief.companyName.toLowerCase())
    && /\b(what|who|tell|about|know|describe)\b/i.test(normalized);
  if ((/\b(company|brief|what do we know|summari[sz]e)\b/i.test(normalized) || asksAboutActiveCompany) && brief) {
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

  if (definition) return definition.definition;

  if (/\b(strategy|campaign|cadence|target(?:ing)?|response rate|reply rate|deliverability|prospecting|outbound)\b/i.test(normalized)) {
    if (/\b(deliverability|bounce|spam)\b/i.test(normalized)) {
      return "For deliverability, use a properly authenticated sending domain (SPF, DKIM, and DMARC), keep lists accurate, remove hard bounces, avoid sudden volume spikes, and make opt-out handling clear. Track delivery separately from opens or replies; do not rely on open rates alone.";
    }
    if (/\b(response rate|reply rate)\b/i.test(normalized)) {
      return `To improve replies from ${persona}, prioritize a small, well-fit list; lead with one verified, timely observation; connect it to ${focus}; keep the message short; and ask one easy-to-answer question. Test one change at a time and compare positive replies, not just opens.`;
    }
    return [
      `A practical outreach strategy for ${persona}${company ? ` at ${company}` : ""}:`,
      formatList([
        `Prioritize accounts with a clear fit and a recent signal relevant to ${focus}.`,
        signal ? `Use the brief's verified observation as the reason for reaching out: ${signal.signal}` : "Research a current, verifiable signal before writing company-specific copy.",
        `Frame ${painPoints[0] ? `“${painPoints[0]}”` : role?.pain ?? "a role-relevant challenge"} as a question, not an assumption.`,
        context?.senderValueProposition ? `Connect it to the actual offer: ${context.senderValueProposition}` : "State the sender's actual offer and one relevant outcome.",
        "Use a short multi-touch cadence where each follow-up adds something new; review positive replies and qualified conversations to improve it.",
      ]),
    ].join("\n\n");
  }

  if (/\b(sequence|follow.?up|linkedin|multi.?touch|touchpoint)\b/i.test(normalized)) {
    return [
      `For a ${persona}-focused sequence, keep each touch connected to ${focus} and add something new rather than repeating the same pitch.`,
      sequence
        ? `The brief already includes a Day 1 email, Day 2 LinkedIn note and follow-up, and Day 5 bump. Use the first touch to introduce the verified signal, the next to add a concise role-specific question, and the bump to offer a low-pressure next step.`
        : "A simple structure is: first touch with a verified observation and question; follow-up with one useful detail; final bump with a low-pressure next step.",
    ].join("\n\n");
  }

  if (/\b(prioriti[sz]e|time management|organize my work|plan my day|productivity)\b/i.test(normalized)) {
    return "A practical prioritization pass: 1) write down the outcome that matters most, 2) separate urgent commitments from optional work, 3) choose the smallest action that moves the outcome forward, and 4) defer or delegate the rest. If you share your task list and deadline, I can help sort it.";
  }

  if (/\b(meeting|prepare for|agenda)\b/i.test(normalized)) {
    return "For a useful meeting, define the decision or outcome first, review what is already known, prepare two or three focused questions, and end with an owner and next step. For a prospect meeting, add the buyer's role and any verified company signals without treating hypotheses as facts.";
  }

  return [
    "I can help with general questions as well as account research and outreach. My answers are built-in guidance, so I won't invent live facts.",
    `A useful next step is to identify the outcome you want, the facts or text to work from, and any constraints. Share those details and I can help organize them into a clear recommendation.`,
  ].join("\n\n");
}
