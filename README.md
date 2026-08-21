# Tail Compass MVP

"Plan the journey. We'll look after the tail."

An AI-ready pet travel copilot with a reliable, deterministic demo flow. It checks a pet against curated policy constraints, explains conflicts, recommends an available compatible option, and builds a practical itinerary.

## What is implemented

**The journey** — Can we travel? → How should we travel? → What could go wrong? →
How do we fix it? → Where should we stay? → What can we do? → What do we prepare? →
Create a Tail Memory.

- Six-field minimum input; 15 optional fields, none of them blocking
- Progressive questions that fire only when the answer changes a decision
- Transport comparison with per-class eligibility, evidence and dates
- Source-backed policy data (Air India read from the operator's own pages)
- Deterministic constraint engine — the AI extracts facts, the engine decides
- Compass Check: policy text → structured rules → conflict → fix
- Conflict detection, compatible-alternative discovery, stay switching, replan
- Itinerary generated from structured data, then editable (add/edit/remove/reorder)
- Preparation checklist and an optional, clearly-labelled Tail Memory

## The data rule

Every external fact carries `source`, `sourceUrl`, `lastVerified`,
`verificationStatus` and `confidence`. Statuses are OFFICIAL, VERIFIED, CURATED,
DEMO and NOT_VERIFIED. Synthetic rows are labelled DEMO. Where we have not read a
primary source, limits are `null` and the UI says "Check with the operator" —
never "Allowed". We do not invent hotels, airline rules, prices or testimonials.

## Run locally

1. Install Node.js 18+.
2. Open this folder in VS Code/Codex.
3. Run:
   npm install
   npm test
   npm run dev
4. Open the local URL shown by Vite.

## Optional AI extraction (free)

Compass Check always works without AI, using the local parser in `src/readiness.js`.
To add AI extraction at no cost, use LM Studio on your own machine:

1. Open LM Studio and download any instruct model.
2. Go to the Developer tab and click **Start Server** (it listens on port 1234).
3. Load the model.
4. Copy `.env.example` to `.env` and leave the defaults as they are.
5. Run `npm run dev`.

To use a hosted provider instead, point `AI_BASE_URL` at any OpenAI-compatible
endpoint and set `AI_API_KEY`. The key is read only by the local Node server and
is never sent to the browser.

If the AI is unreachable, the app falls back to the local parser and says so.

## Next build tasks

1. Replace the isolated demo policy parser with an LLM structured-output endpoint.
2. Move seed data to Supabase/Postgres.
3. Add source_url/last_verified_at/confidence fields to all production records.
4. Add true alternative/replan generation.
5. Add map only after the core flow is stable.
6. Add a server-side AI endpoint; never expose API keys in frontend code.

This is a hackathon prototype and uses clearly labelled demo data.
