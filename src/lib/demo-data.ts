import { DEFAULT_SENDER_CONTEXT, type OutboundBrief, type ResearchRequest } from "./schemas";

/**
 * Pre-baked sample briefs for zero-key Demo Mode.
 * Written from publicly known positioning; refresh them with a real run
 * (copy the JSON export) before showing them as "live" research.
 */
export type DemoEntry = { label: string; request: ResearchRequest; brief: OutboundBrief };

const meta = { enrichmentSource: "demo" as const, latencyMs: 0 };
const senderContext = {
  ...DEFAULT_SENDER_CONTEXT,
  companyName: "SignalForge",
  productPitch: "AI account research that turns verified company signals into outbound messaging.",
  valueProposition: "We help sales teams spend less time researching and send more relevant outreach.",
};

type DemoCompany = {
  label: string;
  companyDomain: string;
  summary: string;
  fitReasoning: string;
  signals: Array<{
    signal: string;
    sourceType: "Website" | "Recent News" | "Hiring/Growth";
    sourceUrl: string;
    evidenceExcerpt: string;
    confidence: "High" | "Medium" | "Low";
  }>;
};

function createDemoEntry(company: DemoCompany): DemoEntry {
  return {
    label: company.label,
    request: {
      companyDomain: company.companyDomain,
      targetPersona: "VP of Engineering",
      senderValueProp: senderContext.valueProposition,
      senderContext,
      tone: "Consultative",
    },
    brief: {
      companyName: company.label,
      oneLineSummary: company.summary,
      icpFitScore: 7,
      icpFitReasoning: company.fitReasoning,
      icpFitBreakdown: {
        gtmVelocity: { score: 7, reasoning: "The multi-product positioning creates ongoing needs to prioritize target accounts." },
        productComplexity: { score: 8, reasoning: "Several products and buyer use cases call for tailored account conversations." },
        signalRecency: { score: 5, reasoning: "These illustrative sample signals have not been checked for current publication dates." },
      },
      triggerSignals: company.signals.map((signal) => ({
        ...signal,
        relevanceToPersona: "The product and audience context can inform account-specific outreach.",
      })),
      hypothesizedPainPoints: [
        "Connecting technical adoption signals to the right account conversations.",
        "Prioritizing engineering initiatives without relying on broad, unverified assumptions.",
      ],
      outboundSequence: {
        day1ColdEmail: {
          subjectLine: "technical adoption signals",
          body: `I noticed ${company.label}: ${company.summary} Engineering leaders may be looking for relevant technical adoption signals across target accounts. We help teams research those signals and tailor the next conversation. Would a short example be useful?`,
        },
        day2LinkedIn: {
          connectionNote: `Noticed ${company.label}'s work across its products. I help engineering leaders connect account signals to relevant next steps.`,
          followUpDm: `${company.label}'s product context could make account-specific research useful. How do you currently prioritize the signals worth acting on?`,
        },
        day5BumpEmail: {
          subjectLine: "a useful account signal",
          body: `Following up on technical adoption and team priorities at ${company.label}. We help teams research account signals and tailor relevant outreach for engineering leaders. Would a brief example be useful?`,
        },
      },
      tone: "Consultative",
      meta,
    },
  };
}

export const DEMO_DATA: Record<string, DemoEntry> = {
  "razorpay.com": {
    label: "Razorpay",
    request: {
      companyDomain: "razorpay.com",
      targetPersona: "VP of Marketing",
      senderValueProp: "We help fintech marketing teams turn product-led signals into pipeline with automated account research.",
      senderContext,
      tone: "Consultative",
    },
    brief: {
      companyName: "Razorpay",
      oneLineSummary: "Helps online businesses in India accept payments and manage money, from checkout to payouts and banking.",
      icpFitScore: 8,
      icpFitReasoning:
        "Broad product suite (payments, banking, lending) sold to many merchant segments, so marketing must tailor outreach per segment. Large and active hiring footprint suggests growth-stage GTM investment.",
      icpFitBreakdown: {
        gtmVelocity: { score: 8, reasoning: "The careers page suggests continued hiring across GTM-related teams." },
        productComplexity: { score: 9, reasoning: "Payments, banking and lending span distinct merchant needs." },
        signalRecency: { score: 6, reasoning: "The example includes active careers and product signals, but has no verified dates." },
      },
      triggerSignals: [
        {
          signal: "Website positions a multi-product suite spanning payments, business banking and lending for merchants.",
          sourceType: "Website",
          relevanceToPersona: "Multiple products and segments mean campaigns need segment-specific messaging and attribution.",
          sourceUrl: "https://razorpay.com",
          evidenceExcerpt: "Website positions a multi-product suite spanning payments, business banking and lending for merchants.",
          confidence: "High",
        },
        {
          signal: "Careers page lists ongoing openings across product, engineering and go-to-market teams.",
          sourceType: "Hiring/Growth",
          relevanceToPersona: "Team growth usually means new campaign owners who need faster account insight.",
          sourceUrl: "https://razorpay.com/jobs/",
          evidenceExcerpt: "Careers page lists ongoing openings across product, engineering and go-to-market teams.",
          confidence: "Medium",
        },
        {
          signal: "Frequent product announcements for new payment methods and merchant tools.",
          sourceType: "Recent News",
          relevanceToPersona: "Each launch needs targeted outbound to the merchants it fits.",
          sourceUrl: "https://razorpay.com",
          evidenceExcerpt: "Frequent product announcements for new payment methods and merchant tools.",
          confidence: "Medium",
        },
      ],
      hypothesizedPainPoints: [
        "Prioritising which merchant segments to target for each new product launch.",
        "Marketing and sales spending hours on manual account research before outreach.",
        "Low reply rates when outbound copy is generic across industries.",
      ],
      outboundSequence: {
        day1ColdEmail: {
          subjectLine: "segment-specific launch outreach",
          body:
            "Saw Razorpay now sells payments, banking and lending to very different merchants. That usually means one launch email gets ignored by most of the list.\n\nWe automate account research so each segment gets outreach that names a real trigger from their site or news.\n\nWorth a quick look?",
        },
        day2LinkedIn: {
          connectionNote: "Noticed Razorpay's products serve distinct merchant needs. I work on helping GTM teams tailor account research.",
          followUpDm: "Razorpay's payments, banking and lending products point to different merchant audiences. How do you tailor launch outreach across them today?",
        },
        day5BumpEmail: {
          subjectLine: "merchant launch targeting",
          body: "Following up on the different merchant audiences across Razorpay's product suite. We help teams turn verified account signals into tailored outreach. Would a short example be useful?",
        },
      },
      tone: "Consultative",
      meta,
    },
  },
  "freshworks.com": {
    label: "Freshworks",
    request: {
      companyDomain: "freshworks.com",
      targetPersona: "Head of Growth",
      senderValueProp: "We give SaaS growth teams researched, signal-based outbound angles for each target account.",
      senderContext,
      tone: "Consultative",
    },
    brief: {
      companyName: "Freshworks",
      oneLineSummary: "Sells customer support, IT service and sales software to growing businesses.",
      icpFitScore: 7,
      icpFitReasoning:
        "Multi-product SaaS company with a self-serve and sales-led motion, so growth teams juggle several buyer types. Fit is strong but depends on how much outbound versus product-led growth they run.",
      icpFitBreakdown: {
        gtmVelocity: { score: 7, reasoning: "Multiple distinct go-to-market teams and roles are represented in the sample." },
        productComplexity: { score: 8, reasoning: "Support, IT and sales products serve different buying teams." },
        signalRecency: { score: 5, reasoning: "The sample signals have no verified publication dates." },
      },
      triggerSignals: [
        {
          signal: "Website emphasises AI features across its customer service and IT service products.",
          sourceType: "Website",
          relevanceToPersona: "AI messaging gives a fresh, specific hook for outbound to existing and lookalike accounts.",
          sourceUrl: "https://www.freshworks.com",
          evidenceExcerpt: "Website emphasises AI features across its customer service and IT service products.",
          confidence: "High",
        },
        {
          signal: "Multiple distinct product lines targeting support, IT and sales teams.",
          sourceType: "Website",
          relevanceToPersona: "Growth must route accounts to the right product and persona.",
          sourceUrl: "https://www.freshworks.com",
          evidenceExcerpt: "Multiple distinct product lines targeting support, IT and sales teams.",
          confidence: "High",
        },
        {
          signal: "Open roles posted across marketing and sales teams.",
          sourceType: "Hiring/Growth",
          relevanceToPersona: "Expanding GTM capacity raises demand for scalable research workflows.",
          sourceUrl: "https://www.freshworks.com/careers",
          evidenceExcerpt: "Open roles posted across marketing and sales teams.",
          confidence: "Medium",
        },
      ],
      hypothesizedPainPoints: [
        "Deciding which product to lead with for each target account.",
        "Self-serve sign-ups that never get sales-assist outreach because account context is missing.",
        "Pipeline reporting that cannot tie outbound touches to the signal that triggered them.",
      ],
      outboundSequence: {
        day1ColdEmail: {
          subjectLine: "which product to lead",
          body:
            "Freshworks sells support, IT and sales tools, so each account has a different best entry point. Picking it by guesswork costs replies.\n\nWe pull live signals per account and suggest the angle and product to lead with.\n\nWorth a quick look?",
        },
        day2LinkedIn: {
          connectionNote: "Saw Freshworks serves support, IT and sales teams. I help growth teams shape account-specific outreach.",
          followUpDm: "Freshworks serves several distinct buyer teams across its product lines. How does your team decide which product to lead with for each account?",
        },
        day5BumpEmail: {
          subjectLine: "choosing the lead product",
          body: "A quick follow-up on choosing the right product entry point for each account. Our research highlights verified triggers to help growth teams make that choice. Open to a short example?",
        },
      },
      tone: "Consultative",
      meta,
    },
  },
  "postman.com": {
    label: "Postman",
    request: {
      companyDomain: "postman.com",
      targetPersona: "VP of Marketing",
      senderValueProp: "We help developer-tool marketers find the accounts and signals behind team-level adoption.",
      senderContext,
      tone: "Consultative",
    },
    brief: {
      companyName: "Postman",
      oneLineSummary: "A platform developers and teams use to design, test and document APIs.",
      icpFitScore: 7,
      icpFitReasoning:
        "Developer-first product with strong bottom-up adoption, so the marketing challenge is converting individual users into team and enterprise accounts. Signal-based account research maps directly to that.",
      icpFitBreakdown: {
        gtmVelocity: { score: 7, reasoning: "The sample includes ongoing product and go-to-market hiring signals." },
        productComplexity: { score: 8, reasoning: "Individual, team and enterprise use cases create multiple adoption paths." },
        signalRecency: { score: 5, reasoning: "The illustrative signals have no verified publication dates." },
      },
      triggerSignals: [
        {
          signal: "Website highlights collaboration and enterprise features alongside the free individual tier.",
          sourceType: "Website",
          relevanceToPersona: "Shows a clear individual-to-team upgrade path that marketing must drive.",
          sourceUrl: "https://www.postman.com",
          evidenceExcerpt: "Website highlights collaboration and enterprise features alongside the free individual tier.",
          confidence: "High",
        },
        {
          signal: "Product messaging increasingly includes AI-assisted API workflows.",
          sourceType: "Website",
          relevanceToPersona: "A new narrative that needs targeted outreach to teams building with APIs and AI.",
          sourceUrl: "https://www.postman.com",
          evidenceExcerpt: "Product messaging increasingly includes AI-assisted API workflows across technical teams.",
          confidence: "High",
        },
        {
          signal: "Careers page shows continued hiring across product and go-to-market roles.",
          sourceType: "Hiring/Growth",
          relevanceToPersona: "Growing GTM teams need repeatable ways to prioritise accounts.",
          sourceUrl: "https://www.postman.com/company/careers/",
          evidenceExcerpt: "Careers page shows continued hiring across product and go-to-market roles.",
          confidence: "Medium",
        },
      ],
      hypothesizedPainPoints: [
        "Spotting which free-tier teams are ready for a paid or enterprise conversation.",
        "Explaining new AI workflow features to the right technical buyers.",
        "Sales and marketing using different views of which accounts matter.",
      ],
      outboundSequence: {
        day1ColdEmail: {
          subjectLine: "free users to teams",
          body:
            "Postman's free tier spreads fast inside companies, but the jump from individual users to a team plan is hard to see from outside.\n\nWe research each target account's live signals so your outreach starts from something real.\n\nWorth a quick look?",
        },
        day2LinkedIn: {
          connectionNote: "Noticed Postman's collaboration and AI workflows. I help teams connect product signals to account-specific outreach.",
          followUpDm: "Postman speaks to both collaboration and AI-assisted API workflows. How do you decide which story fits each target account?",
        },
        day5BumpEmail: {
          subjectLine: "team adoption signals",
          body: "Following up on the path from individual API users to team adoption. We help marketers spot verified account signals and tailor the next conversation. Would an example be useful?",
        },
      },
      tone: "Consultative",
      meta,
    },
  },
  "stripe.com": createDemoEntry({
    label: "Stripe",
    companyDomain: "stripe.com",
    summary: "Provides payments, billing and financial infrastructure for internet businesses and platforms.",
    fitReasoning: "Its broad payments and billing products serve different business models, making role- and segment-specific account context useful.",
    signals: [
      {
        signal: "Stripe provides a suite of payments products for internet businesses and platforms.",
        sourceType: "Website",
        sourceUrl: "https://stripe.com",
        evidenceExcerpt: "Stripe provides a suite of payments products for internet businesses and platforms.",
        confidence: "High",
      },
      {
        signal: "Stripe Billing helps businesses manage recurring revenue and subscription operations.",
        sourceType: "Website",
        sourceUrl: "https://stripe.com/billing",
        evidenceExcerpt: "Stripe Billing helps businesses manage recurring revenue and subscription operations.",
        confidence: "High",
      },
      {
        signal: "Stripe Connect supports platforms and marketplaces that move money between parties.",
        sourceType: "Website",
        sourceUrl: "https://stripe.com/connect",
        evidenceExcerpt: "Stripe Connect supports platforms and marketplaces that move money between parties.",
        confidence: "High",
      },
    ],
  }),
  "vercel.com": createDemoEntry({
    label: "Vercel",
    companyDomain: "vercel.com",
    summary: "Provides a frontend cloud platform for deploying web applications and supporting modern development teams.",
    fitReasoning: "A developer-focused platform with team and enterprise workflows has distinct technical and business audiences to reach.",
    signals: [
      {
        signal: "Vercel provides a frontend cloud platform for building and deploying web applications.",
        sourceType: "Website",
        sourceUrl: "https://vercel.com",
        evidenceExcerpt: "Vercel provides a frontend cloud platform for building and deploying web applications.",
        confidence: "High",
      },
      {
        signal: "Vercel's platform includes deployment workflows, previews, and infrastructure for frontend teams.",
        sourceType: "Website",
        sourceUrl: "https://vercel.com/platform",
        evidenceExcerpt: "Vercel's platform includes deployment workflows, previews, and infrastructure for frontend teams.",
        confidence: "High",
      },
      {
        signal: "Vercel offers enterprise features for teams deploying production applications at scale.",
        sourceType: "Website",
        sourceUrl: "https://vercel.com/enterprise",
        evidenceExcerpt: "Vercel offers enterprise features for teams deploying production applications at scale.",
        confidence: "High",
      },
    ],
  }),
  "notion.so": createDemoEntry({
    label: "Notion",
    companyDomain: "notion.so",
    summary: "Combines documents, projects, and knowledge management in a connected workspace for teams.",
    fitReasoning: "Its individual-to-team adoption path and broad workspace use cases create varied opportunities for tailored outreach.",
    signals: [
      {
        signal: "Notion combines documents, projects, and knowledge into one connected workspace.",
        sourceType: "Website",
        sourceUrl: "https://www.notion.so/product",
        evidenceExcerpt: "Notion combines documents, projects, and knowledge into one connected workspace.",
        confidence: "High",
      },
      {
        signal: "Notion AI adds search and writing capabilities to the shared workspace.",
        sourceType: "Website",
        sourceUrl: "https://www.notion.so/product/ai",
        evidenceExcerpt: "Notion AI adds search and writing capabilities to the shared workspace.",
        confidence: "High",
      },
      {
        signal: "Notion offers team and enterprise plans for collaborative knowledge management.",
        sourceType: "Website",
        sourceUrl: "https://www.notion.so/pricing",
        evidenceExcerpt: "Notion offers team and enterprise plans for collaborative knowledge management.",
        confidence: "High",
      },
    ],
  }),
  "zoho.com": createDemoEntry({
    label: "Zoho",
    companyDomain: "zoho.com",
    summary: "Offers a broad suite of business applications spanning customer management, finance, and operations.",
    fitReasoning: "Its wide application portfolio serves buyers across many departments, making account selection and product-specific messaging important.",
    signals: [
      {
        signal: "Zoho offers a broad suite of business applications spanning sales, finance, and operations.",
        sourceType: "Website",
        sourceUrl: "https://www.zoho.com",
        evidenceExcerpt: "Zoho offers a broad suite of business applications spanning sales, finance, and operations.",
        confidence: "High",
      },
      {
        signal: "Zoho CRM supports customer-facing teams with sales automation and pipeline tools.",
        sourceType: "Website",
        sourceUrl: "https://www.zoho.com/crm",
        evidenceExcerpt: "Zoho CRM supports customer-facing teams with sales automation and pipeline tools.",
        confidence: "High",
      },
      {
        signal: "Zoho One bundles business applications across multiple departments in one suite.",
        sourceType: "Website",
        sourceUrl: "https://www.zoho.com/one",
        evidenceExcerpt: "Zoho One bundles business applications across multiple departments in one suite.",
        confidence: "High",
      },
    ],
  }),
};

export const DEMO_DOMAINS = Object.keys(DEMO_DATA);

const PERSONA_MESSAGING: Record<string, { focus: string; pains: string[]; valueProp: string; subject: string }> = {
  "vp of engineering": {
    focus: "technical adoption and team priorities",
    pains: ["Connecting technical adoption signals to the right account conversations.", "Prioritizing engineering initiatives without relying on broad, unverified assumptions."],
    valueProp: "We help teams research technical account signals and give engineering leaders a relevant reason to engage.",
    subject: "technical adoption signals",
  },
  "vp of sales": {
    focus: "account prioritization and pipeline",
    pains: ["Prioritizing accounts with a timely reason for sales outreach.", "Helping reps tailor first touches instead of relying on generic account notes."],
    valueProp: "We help sales teams prioritize accounts using verified signals and write more relevant outreach.",
    subject: "sales account focus",
  },
  "head of revops": {
    focus: "consistent account data and routing",
    pains: ["Keeping account research consistent across routing and prioritization workflows.", "Giving revenue teams a shared, evidence-backed view of why an account matters."],
    valueProp: "We help RevOps standardize account research so routing and outreach start with consistent signals.",
    subject: "consistent account signals",
  },
  "head of growth": {
    focus: "segmentation and campaign conversion",
    pains: ["Finding account signals that support sharper campaign segments.", "Turning product and market context into relevant growth experiments."],
    valueProp: "We help growth teams connect account signals to focused campaigns and more relevant outreach.",
    subject: "growth signal targeting",
  },
  "founder/ceo": {
    focus: "efficient growth and pipeline priorities",
    pains: ["Focusing limited GTM time on accounts with a clear reason to engage.", "Building a repeatable pipeline motion without adding manual research work."],
    valueProp: "We help founders focus GTM time on accounts with a timely, evidence-backed reason to engage.",
    subject: "founder pipeline focus",
  },
};

export function personalizeDemoEntry(entry: DemoEntry, selectedPersona: string): { request: ResearchRequest; brief: OutboundBrief } {
  const persona = selectedPersona.trim() || "GTM leader";
  const messaging = PERSONA_MESSAGING[persona.toLowerCase()] ?? {
    focus: "account priorities and relevant outreach",
    pains: [`Understanding which account signals matter to a ${persona}.`, `Turning company context into relevant next steps for a ${persona}.`],
    valueProp: `We help teams research account signals and tailor relevant outreach for ${persona} leaders.`,
    subject: "account research ideas",
  };
  const request: ResearchRequest = {
    ...entry.request,
    targetPersona: persona,
    senderValueProp: messaging.valueProp,
    senderContext: { ...(entry.request.senderContext ?? senderContext), valueProposition: messaging.valueProp },
  };
  const brief: OutboundBrief = {
    ...entry.brief,
    triggerSignals: entry.brief.triggerSignals.map((signal) => ({
      ...signal,
      relevanceToPersona: `Potentially relevant to ${persona}: ${messaging.focus}; validate whether this is a current priority.`,
    })),
    hypothesizedPainPoints: messaging.pains,
    outboundSequence: {
      day1ColdEmail: {
        subjectLine: messaging.subject,
        body: `Noticed ${entry.label}: ${entry.brief.oneLineSummary} For a ${persona}, ${messaging.pains[0].toLowerCase()} ${messaging.valueProp} Would a short example be useful?`,
      },
      day2LinkedIn: {
        connectionNote: `Noticed ${entry.label}'s work around ${messaging.focus}. I help ${persona} teams connect account signals to relevant next steps.`,
        followUpDm: `${entry.label}'s product context could make account-specific research useful. How do you currently prioritize the signals worth acting on?`,
      },
      day5BumpEmail: {
        subjectLine: "a useful account signal",
        body: `Following up on ${messaging.focus} at ${entry.label}. ${messaging.valueProp} Would a short example tailored to your priorities be useful?`,
      },
    },
  };
  return { request, brief };
}
