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
};

export const DEMO_DOMAINS = Object.keys(DEMO_DATA);
