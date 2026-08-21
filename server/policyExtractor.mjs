import { validatePolicyConstraints } from "../src/readiness.js";

// Provider-agnostic policy extractor.
// Talks to any OpenAI-compatible /chat/completions endpoint.
// Default target is LM Studio running locally, which needs no API key and costs nothing.
// Override with AI_BASE_URL / AI_MODEL / AI_API_KEY in .env to use a hosted provider.

const DEFAULT_BASE_URL = "http://localhost:1234/v1";
const DEFAULT_MODEL = "local-model";

const POLICY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["pet_allowed", "max_weight_kg", "min_weight_kg", "breed_restrictions", "species_allowed", "pet_fee_inr", "allowed_areas", "restaurant_access", "supervision_required", "raw_facts", "unknown_fields", "confidence"],
  properties: {
    pet_allowed: { type: ["boolean", "null"] },
    max_weight_kg: { type: ["number", "null"], minimum: 0 },
    min_weight_kg: { type: ["number", "null"], minimum: 0 },
    breed_restrictions: { type: "array", items: { type: "string" } },
    species_allowed: { type: "array", items: { type: "string" } },
    pet_fee_inr: { type: ["number", "null"], minimum: 0 },
    allowed_areas: { type: "array", items: { type: "string" } },
    restaurant_access: { type: ["boolean", "null"] },
    supervision_required: { type: ["boolean", "null"] },
    raw_facts: { type: "array", items: { type: "string" } },
    unknown_fields: { type: "array", items: { type: "string" } },
    confidence: { type: "number", minimum: 0, maximum: 1 }
  }
};

const INSTRUCTIONS = "You extract factual pet-travel constraints from supplied policy text. Extract only information explicitly supported by the text. Never infer or invent a restriction. If a field is not mentioned, return null or an empty array. Do not decide whether a pet is compatible; only extract policy facts. Reply with JSON only, matching the requested schema.";

const LOCAL_HOST = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?(?:\/|$)/i;

function readContent(body) {
  const message = body?.choices?.[0]?.message;
  if (typeof message?.content === "string") return message.content;
  if (Array.isArray(message?.content)) return message.content.map(part => part?.text ?? "").join("");
  if (typeof body?.output_text === "string") return body.output_text;
  return body?.output?.flatMap(item => item.content || []).find(item => item.type === "output_text")?.text ?? null;
}

// Small local models often wrap JSON in prose or markdown fences. Recover what we can.
function parseJson(text) {
  if (typeof text !== "string") return null;
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try { return JSON.parse(cleaned); } catch { /* fall through */ }
  const braces = cleaned.match(/\{[\s\S]*\}/);
  if (!braces) return null;
  try { return JSON.parse(braces[0]); } catch { return null; }
}

function buildRequest(model, policyText, withSchema) {
  const payload = {
    model,
    temperature: 0,
    messages: [
      { role: "system", content: INSTRUCTIONS },
      { role: "user", content: policyText }
    ]
  };
  if (withSchema) {
    payload.response_format = { type: "json_schema", json_schema: { name: "pet_policy_constraints", strict: true, schema: POLICY_SCHEMA } };
  }
  return payload;
}

export async function extractPolicyWithAI(policyText, options = {}) {
  const baseUrl = String(options.baseUrl ?? process.env.AI_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
  const model = options.model ?? process.env.AI_MODEL ?? DEFAULT_MODEL;
  const apiKey = options.apiKey ?? process.env.AI_API_KEY ?? "";
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? 30_000;
  const isLocal = LOCAL_HOST.test(baseUrl);

  // Hosted providers need a key. LM Studio on localhost does not.
  if (!isLocal && !apiKey) return { success: false, source: "unavailable", error: "AI extraction is not configured." };

  const endpoint = `${baseUrl}/chat/completions`;
  const headers = { "Content-Type": "application/json" };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let response = await fetchImpl(endpoint, { method: "POST", headers, signal: controller.signal, body: JSON.stringify(buildRequest(model, policyText, true)) });

    // Some local models reject strict json_schema. Retry once in plain mode before giving up.
    if (!response.ok) {
      response = await fetchImpl(endpoint, { method: "POST", headers, signal: controller.signal, body: JSON.stringify(buildRequest(model, policyText, false)) });
    }
    if (!response.ok) {
      return { success: false, source: "unavailable", error: isLocal ? "Could not reach the local AI. Is LM Studio running with a model loaded?" : "AI extraction request failed." };
    }

    const parsed = parseJson(readContent(await response.json()));
    if (!parsed) return { success: false, source: "unavailable", error: "AI returned an invalid policy response." };

    const validated = validatePolicyConstraints(parsed, { source: "ai" });
    if (!validated.valid) return { success: false, source: "unavailable", error: "AI returned an invalid policy response." };
    return { success: true, source: "ai", constraints: validated.constraints };
  } catch {
    return { success: false, source: "unavailable", error: isLocal ? "Could not reach the local AI. Is LM Studio running with a model loaded?" : "AI extraction is temporarily unavailable." };
  } finally {
    clearTimeout(timeout);
  }
}

// Kept so older imports keep working.
export const extractPolicyWithOpenAI = extractPolicyWithAI;
