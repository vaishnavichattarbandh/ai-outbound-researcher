# AI Outbound Researcher — Technical Documentation

## 1. Project overview

AI Outbound Researcher is a full-stack web application that turns a target
company domain, buyer persona, and sender value proposition into an
evidence-oriented account brief and editable outbound sequence.

The goal is to reduce repetitive pre-call research while avoiding outreach
that presents unsupported AI-generated claims as facts. Live research combines
website content and search results, checks generated evidence against those
sources, and shows the cited source links for user review.

This is a research and drafting assistant, not an autonomous sales agent. Users
should verify current sources, validate inferred pain points, and edit generated
copy before sending it.

## 2. Technology stack

| Area | Technology | Why it is used |
| --- | --- | --- |
| Application language | TypeScript | Types across the UI, API route, and research data reduce mismatches in multi-step flows and make refactoring safer. |
| UI library | React 19 | Component-based UI and hooks support interactive forms, progress states, dialogs, editable copy, and history. |
| Web framework | Next.js 15 App Router | Provides the React application and server-side API route in one project, so a separate backend service is not required for this app. |
| Styling | Tailwind CSS 3 | Utility classes make responsive layouts and consistent card-based styling quick to maintain. |
| CSS processing | PostCSS and Autoprefixer | Process Tailwind output and add browser-compatible CSS prefixes. |
| Runtime validation | Zod | Validates and normalizes user requests, research briefs, and streamed events at runtime; TypeScript types alone cannot validate external JSON. |
| Generative AI | Google GenAI SDK with Gemini | Produces structured account analysis and outreach copy from supplied evidence and sender context. The configured model is `gemini-3.8-flash` with low thinking effort. |
| Website enrichment | Jina Reader | Retrieves readable Markdown from a public company website without requiring a custom HTML parser for each site. |
| Search enrichment | Serper.dev | Supplies recent news and company hiring/careers search results when a Serper key is available. |
| Icons | Lucide React | Provides consistent, lightweight interface icons. |
| Typography | Instrument Sans through `next/font` | Loads the app's primary font through Next.js font handling. |
| Browser persistence | `localStorage` | Stores BYOK keys, sender context, and up to five recent unique-domain briefs on the user's device. |
| Build/package tooling | Node.js and npm | Installs dependencies and runs the Next.js development and production commands. |
| Deployment target | Vercel (documented target) | Supports Next.js deployment and environment-variable configuration. A deployment is not implied by the source code alone. |

Configuration is in `package.json`, `tsconfig.json`, `tailwind.config.ts`,
`postcss.config.mjs`, and `next.config.ts`.

## 3. High-level architecture

```text
Browser (Next.js / React UI)
  ├─ Demo Mode: loads bundled sample briefs; no research API call
  ├─ Live Research: sends validated research inputs to /api/research
  ├─ localStorage: BYOK keys, sender context, recent brief history
  └─ Editable brief, CSV/JSON/Markdown export, local AI Assistant
             │
             ▼
Next.js API route (Node.js)
  ├─ Validates request with Zod
  ├─ Selects BYOK or configured server keys
  ├─ Fetches Jina website content and Serper results concurrently
  ├─ Sends source material and sender context to Gemini
  ├─ Validates generated brief and evidence against fetched sources
  └─ Streams stage updates and the final brief as NDJSON
             │
             ├──────── Jina Reader
             ├──────── Serper.dev (optional)
             └──────── Google Gemini
```

The application has no database. Its API route is under
`src/app/api/research/route.ts`; reusable research, validation, and export logic
is in `src/lib/`.

## 4. User workflow

### 4.1 Demo Mode

Demo Mode displays bundled sample briefs for supported sample companies. It
does not call Jina, Serper, or Gemini and does not require API keys. The
selected persona is applied to the demo sample so users can try the interface
before configuring live research.

### 4.2 Live single-account research

The user provides a company domain and target persona, then optionally edits
the sender context and outreach tone. The server:

1. Normalizes and validates the domain and request fields.
2. Requests website content from Jina Reader and, if configured, news and
   hiring search results from Serper at the same time.
3. Continues with whichever enrichment sources succeeded. If no usable source
   returns data, the API reports an error instead of presenting an empty
   research result.
4. Asks Gemini for structured company analysis and an outreach sequence.
5. Validates the output and checks each signal's URL and evidence excerpt
   against the fetched source. Minor differences in phrasing or punctuation
   may be normalized or repaired using text from the cited source.
6. If generation remains invalid but source text is available, returns a
   conservative fallback brief and records a validation warning in metadata.
7. Sends progress updates for website, news, hiring, and Gemini stages, then
   streams the result to the browser.

Website content is capped at 12,000 characters for prompt size. Jina Reader
and Serper requests have timeouts. News search is restricted to the last year;
hiring search is scoped to the target domain. Dates are included only when the
search provider supplies them.

### 4.3 Brief contents

A successful brief can contain:

- Company summary and ICP fit score from 1 to 10.
- Separate GTM velocity, product complexity, and signal recency sub-scores.
- Trigger signals labeled as website, recent news, or hiring/growth, with
  source URL, evidence excerpt, relevance to persona, confidence, and available
  publication date.
- Role-specific hypothesized pain points, explicitly treated as hypotheses.
- Day 1 cold email, Day 2 LinkedIn connection note and follow-up DM, and Day 5
  bump email.
- Research metadata such as enrichment sources, status, timestamp, latency,
  and, when applicable, a validation warning.

The user can edit subject lines and message bodies in the brief, change tone,
and regenerate the sequence or regenerate copy around a selected signal
without repeating website and search enrichment.

### 4.4 CSV batch research

Live Research supports sequential CSV processing of up to 100 accounts per
file. The required headers are:

```csv
company_name,domain,persona
Example Company,example.com,VP of Sales
```

The interface reports batch progress and allows successful results to be
downloaded together as one CSV. Batch requests still use the same live API and
provider keys as single-account research; batch mode is not a background job
queue.

### 4.5 Recent history and exports

The browser stores up to five recent briefs, deduplicated by case-insensitive
company domain. Running research or reopening a saved brief moves that domain
to the front of the list.

Briefs can be copied or exported as JSON, CSV, or Markdown. CSV fields are
quoted and escaped; spreadsheet-formula-like values are prefixed to reduce
formula injection risk when a CSV is opened in spreadsheet software.

The CRM, Instantly, and Smartlead destination selector currently displays a
success-style notice for a **simulated action only**. It does not connect to
those services or transmit data to them.

### 4.6 Built-in AI Assistant

The floating AI Assistant uses local, rule-based guidance from
`src/lib/local-assistant.ts`. It can respond to common GTM questions and use
the active brief as context. It does not call Gemini and does not require an
API key. Despite its name, it is not a general-purpose cloud chatbot.

## 5. Data validation and evidence handling

`src/lib/schemas.ts` defines the request and brief shapes with Zod. The same
schemas are used to reject malformed input and to validate outputs before
display or export. Gemini is asked for JSON matching a response schema, but
model output is still treated as untrusted input and validated by the server.

Evidence checks help reduce unsupported claims:

- Website evidence must cite the fetched website URL.
- News or hiring evidence must point to a fetched result of the matching type.
- The excerpt must match text in that source, allowing normalized matching
  and a source-derived replacement for minor wording differences.
- If generation fails validation, the server records the reason and can return
  a clearly conservative fallback based only on available source text.

These measures improve traceability but do not guarantee that every
interpretation is correct, that a source is current, or that a model-generated
summary has no errors. Users must open and review the citations.

## 6. API keys and privacy

### Browser-provided keys (BYOK)

Users may provide Gemini and Serper keys through API Settings. They are stored
in the browser's `localStorage`, and the UI masks the values in password
fields. The values are sent with live requests to this app's API route in
request headers; the app does not intentionally persist BYOK keys on the
server.

`localStorage` is **not encrypted**. Anyone with access to the browser profile
or JavaScript running on the same origin may be able to access it. Use a
trusted device, do not use this option on a shared/public computer, and remove
keys when finished.

### Server environment keys

An operator may configure `GEMINI_API_KEY` and `SERPER_API_KEY` as server
environment variables. These keys are used as fallback credentials when a
request does not provide a Gemini BYOK key. Never commit real key values to
source control. `.env.example` contains blank placeholders; `.gitignore`
ignores `.env` and `.env.*` while allowing `.env.example`.

### External data processing

In Live Research, the target domain is sent to the enrichment services. Fetched
website/search content and the user's research inputs are sent to Gemini to
produce the brief. Demo Mode does not make these research calls. Users should
review the privacy terms of the selected hosting and API providers before
using sensitive inputs.

## 7. Configuration

Copy `.env.example` to `.env.local` for local server-side fallback keys:

```dotenv
GEMINI_API_KEY=
SERPER_API_KEY=
RATE_LIMIT_PER_HOUR=5
```

| Variable | Required? | Purpose |
| --- | --- | --- |
| `GEMINI_API_KEY` | Required for live research when the user has not supplied a Gemini BYOK key | Server-side fallback for Gemini requests. |
| `SERPER_API_KEY` | Optional | Server-side fallback for live news and hiring search when using server credentials. |
| `RATE_LIMIT_PER_HOUR` | Optional; defaults to `5` | Maximum server-key live research requests per IP per hour in the current in-memory limiter. |

Demo Mode does not require server keys. Gemini is needed for live generation.
Serper is optional, but live news and hiring enrichment require a Serper key.
When using BYOK, provide the keys in API Settings.

## 8. Local development and deployment

### Prerequisites

- Node.js compatible with the project's Next.js version.
- npm.
- API keys for live research, if desired. Demo Mode works without them.

### Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. To use server fallback keys, create `.env.local`
from `.env.example`, add the keys there, then restart the development server.

### Build and start

```bash
npm run build
npm run start
```

### Vercel deployment

1. Push the project to a GitHub repository.
2. Import that repository into Vercel and allow framework auto-detection for
   Next.js.
3. Add server environment variables in the Vercel project settings. Do not
   commit them to GitHub.
4. Deploy and test Demo Mode and live research on the deployed URL.

Redeploy after changing production environment variables. Preview and
Development environments can have separate keys and values.

## 9. Why this design is useful

| Design choice | Benefit for this product | Tradeoff to understand |
| --- | --- | --- |
| Demo Mode with bundled briefs | Lets reviewers explore the complete interface without API setup or provider costs. | Sample evidence is illustrative and should not be treated as current company research. |
| Website plus search enrichment | Combines first-party company context with external news and hiring signals. | Providers can fail, return stale results, or have quotas and latency. |
| Source excerpts and links | Makes it easier to audit where a trigger came from and distinguish evidence from interpretation. | A citation does not guarantee that the interpretation or publication date is correct. |
| Zod validation and normalized recovery | Rejects malformed data while tolerating minor output variations and preserving a conservative fallback path. | Valid structure is not the same as factual correctness or good sales judgment. |
| Sender context and persona selection | Helps align wording to the sender's actual offer and the target role rather than using one generic pitch. | Persona-based pain points remain hypotheses and need human validation. |
| Editable multi-touch sequence | Gives users control over copy and supports a practical outreach workflow. | Users remain responsible for compliance, personalization, and final sending decisions. |
| BYOK option | Lets users supply their own provider credentials rather than relying solely on app-owner server quotas. | Keys are stored in browser `localStorage`, which is convenient but not encrypted. |
| Sequential CSV batch processing | Makes small list research easier without manually submitting each company. | It is synchronous in the browser/request flow, limited to 100 rows, and can take time or encounter provider limits. |
| No database | Keeps the prototype simple and minimizes server-side storage of research history. | History is device/browser-specific and is lost if local browser storage is cleared. |
| Next.js full-stack project | Keeps the UI and API route in one TypeScript codebase and simplifies deployment. | In-memory API state, including the current rate limiter, is not shared across server instances. |

## 10. Current limitations and production considerations

- **Rate limiting:** The limiter is in-memory and applies to server-key live
  research. Serverless instances do not share counters, and counters can reset
  when instances restart. For a reliable production-wide quota, use a shared
  store such as Redis/Upstash and validate forwarded client IP handling for
  the deployment platform.
- **BYOK limits:** BYOK avoids consuming the app's server-key rate limit, but
  users are still subject to their own provider quotas and terms.
- **No authentication or database:** Briefs and settings are kept in the
  browser; there is no user account, synchronized workspace, or server-side
  history.
- **No live CRM integration:** The destination dropdown is a UI simulation.
  Real integrations would need OAuth/API credential handling, provider
  permissions, user consent, and retry/error handling.
- **Spam-risk indicator:** This is a local heuristic for common phrases,
  links, capitalization, message length, and account-specific terms. It is not
  a deliverability test and does not verify SPF, DKIM, DMARC, sender reputation,
  or provider inbox placement.
- **AI reliability:** Generated analysis and copy require human review. The
  evidence checks verify matching text and source type; they do not prove an
  inferred pain point or business interpretation.
- **Provider availability:** Live research depends on external APIs, network
  access, keys, quotas, and each target site's accessibility.
- **Testing:** The project currently defines development, build, start, and
  lint scripts in `package.json`; it does not define a dedicated automated
  test script.

## 11. Main source files

| File | Responsibility |
| --- | --- |
| `src/app/page.tsx` | Main screen, mode selection, progress stream, batch workflow, history, and modal coordination. |
| `src/app/api/research/route.ts` | Request validation, credential selection, rate limit, enrichment/generation orchestration, and streamed API response. |
| `src/components/ResearchForm.tsx` | Demo and live inputs, sender context, tone, and CSV upload. |
| `src/components/BriefDisplay.tsx` | Evidence display, editable messages, copy/export actions, simulated destinations, and spam-risk heuristic. |
| `src/components/ByokModal.tsx` | Browser BYOK key settings and key removal UI. |
| `src/components/AIAssistant.tsx` | Assistant chat UI. |
| `src/lib/scraper.ts` | Jina Reader and Serper enrichment calls and source status handling. |
| `src/lib/synthesizer.ts` | Gemini prompting, output normalization, evidence checks, fallback brief, and sequence regeneration. |
| `src/lib/schemas.ts` | Zod request, brief, and regeneration schemas. |
| `src/lib/history.ts` | Local recent-brief persistence, domain deduplication, and five-entry cap. |
| `src/lib/csv-batch.ts` | CSV parsing and row validation. |
| `src/lib/export.ts` | Markdown, CSV, and batch CSV generation and browser download. |
| `src/lib/keys.ts` | Browser-local BYOK key storage. |
| `src/lib/local-assistant.ts` | Local, rule-based assistant responses. |

## 12. Summary

The app's central design principle is **evidence-supported drafting with human
review**: gather public signals, attach source context, produce structured
research and editable copy, then let the user verify and export the result.
Demo Mode lowers the setup barrier; BYOK offers a key-control option; and the
Next.js/TypeScript stack keeps the prototype in one maintainable codebase.
These are useful foundations, while shared rate limiting, authentication,
formal tests, monitoring, and real CRM integrations would be future production
work.
