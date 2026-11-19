# AI Outbound Researcher

Next.js 15 app: reads a company site (Jina Reader), pulls live news/hiring signals (Serper), and uses Gemini with runtime schema validation to produce an evidence-oriented outbound brief and editable sequence.

See [TECHNICAL_DOCUMENTATION.md](./TECHNICAL_DOCUMENTATION.md) for the architecture, technology choices, research flow, privacy and security notes, setup, deployment, tradeoffs, and current limitations.

## Setup
```bash
npm install
cp .env.example .env.local   # add GEMINI_API_KEY (free: https://aistudio.google.com/apikey) and optionally SERPER_API_KEY (https://serper.dev)
npm run dev                  # http://localhost:3000
```
Demo Mode works with no keys at all.

## Deploy to Vercel
1. Push to GitHub and import the repo at vercel.com/new (framework auto-detected).
2. Add env vars: `GEMINI_API_KEY`, `SERPER_API_KEY`, `RATE_LIMIT_PER_HOUR` (default 5).
3. Deploy. Visitors can use Demo Mode, or paste their own key via API Settings (kept in their browser only).

## Notes
- Jina URL format is `https://r.jina.ai/https://<domain>`.
- Live trigger claims include source URLs and evidence excerpts checked against the cited fetched source. Minor quote differences may be normalized; if model validation fails but evidence is available, a conservative fallback brief is returned. News searches are limited to the last 12 months; hiring searches are restricted to the target company domain.
- News publication dates are shown when the search provider supplies them. Website publication dates are not inferred when unavailable.
- Outreach sequences can be edited in place or regenerated around any verified signal without re-scraping. JSON and CRM-oriented CSV exports include the persona, sender context, evidence, and research timestamp.
- Live research supports saved sender context, selectable Direct/Consultative/Casual tone, three-part fit-score explanations, streamed enrichment progress, and a five-brief local history deduplicated by company domain.
- Upload a CSV with `company_name`, `domain`, and `persona` columns in Live Research to process up to 100 accounts sequentially and export successful briefs together.
- The built-in AI Assistant uses local rule-based guidance and does not call Gemini. CRM/sequence destinations are simulated; no live CRM integration is configured.
- Rate limiting is in-memory per instance; use Upstash Redis for strict limits on Vercel.
- Demo briefs in `src/lib/demo-data.ts` are samples; replace them with real exported JSON.
