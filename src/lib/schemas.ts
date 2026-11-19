import { z } from "zod";

/** Strip protocol, www., path, query and trailing slashes. */
export function normalizeDomain(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split(/[/?#]/)[0]
    .replace(/\/+$/, "");
}

const DOMAIN_RE = /^(?!-)[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/;
export const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
export const SOURCE_TYPES = ["Website", "Recent News", "Hiring/Growth"] as const;
export const TONES = ["Direct", "Consultative", "Casual"] as const;

export const DEFAULT_SENDER_CONTEXT = {
  companyName: "Your Company",
  productPitch: "AI-powered account research and personalized outbound messaging.",
  valueProposition: "We help sales teams turn verified account signals into relevant outreach.",
};

export const ResearchRequestSchema = z.object({
  companyDomain: z
    .string({ required_error: "Company domain is required" })
    .trim()
    .min(1, "Company domain is required")
    .transform(normalizeDomain)
    .refine((d) => DOMAIN_RE.test(d), "Enter a valid domain, e.g. razorpay.com"),
  targetPersona: z.string().trim().min(2, "Target persona is required").max(120),
  senderValueProp: z.string().trim().min(5, "Describe what you offer").max(600),
  targetCompanyName: z.string().trim().max(160).optional(),
  senderContext: z.object({
    companyName: z.string().trim().min(1).max(120),
    productPitch: z.string().trim().min(5).max(600),
    valueProposition: z.string().trim().min(5).max(600),
  }).optional(),
  tone: z.enum(TONES).default("Consultative"),
});
export type ResearchRequest = z.infer<typeof ResearchRequestSchema>;

const emailSchema = z.object({
  subjectLine: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).refine((s) => wordCount(s) <= 120, "Email body should be no longer than 120 words"),
});

export const OutboundBriefSchema = z.object({
  companyName: z.string().min(1),
  oneLineSummary: z.string().min(1),
  icpFitScore: z.number().int().min(1).max(10),
  icpFitReasoning: z.string().min(1),
  icpFitBreakdown: z.object({
    gtmVelocity: z.object({ score: z.number().int().min(1).max(10), reasoning: z.string().min(1) }),
    productComplexity: z.object({ score: z.number().int().min(1).max(10), reasoning: z.string().min(1) }),
    signalRecency: z.object({ score: z.number().int().min(1).max(10), reasoning: z.string().min(1) }),
  }),
  triggerSignals: z
    .array(
      z.object({
        signal: z.string().trim().min(1),
        sourceType: z.enum(SOURCE_TYPES),
        relevanceToPersona: z.string().trim().min(1),
        sourceUrl: z.string().url(),
        evidenceExcerpt: z.string().trim().min(1).max(2000),
        publishedAt: z.string().optional(),
        confidence: z.enum(["High", "Medium", "Low"]),
      })
    )
    .min(1)
    .max(6),
  hypothesizedPainPoints: z.array(z.string().trim().min(1)).min(1).max(5),
  outboundSequence: z.object({
    day1ColdEmail: emailSchema,
    day2LinkedIn: z.object({
      connectionNote: z.string().trim().min(1).max(500),
      followUpDm: z.string().trim().min(1).max(1200),
    }),
    day5BumpEmail: emailSchema,
  }),
  tone: z.enum(TONES),
  meta: z
    .object({
      enrichmentSource: z.enum(["full", "search-only", "website-only", "demo"]),
      latencyMs: z.number(),
      researchedAt: z.string().optional(),
      searchStatus: z.enum(["available", "partial", "unavailable", "not-configured", "no-results"]).optional(),
      searchError: z.string().optional(),
      validationIssue: z.string().optional(),
    })
    .optional(),
});
export type OutboundBrief = z.infer<typeof OutboundBriefSchema>;
export type TriggerSignal = OutboundBrief["triggerSignals"][number];

export function formatZodIssues(issues: readonly z.ZodIssue[]): string[] {
  return issues.map((issue) => `${issue.path.join(".") || "(root)"} [${issue.code}]: ${issue.message}`);
}

export const CopyRegenerationRequestSchema = ResearchRequestSchema.extend({
  action: z.enum(["sequence", "signal"]),
  currentBrief: OutboundBriefSchema,
  tone: z.enum(TONES),
  signalIndex: z.number().int().min(0).optional(),
});
