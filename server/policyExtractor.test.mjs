import assert from "node:assert/strict";
import { extractPolicyWithAI } from "./policyExtractor.mjs";
import { evaluateExtractedPolicy } from "../src/readiness.js";

const constraints = {
  pet_allowed: true, max_weight_kg: 20, min_weight_kg: null,
  breed_restrictions: [], species_allowed: ["dog"], pet_fee_inr: 1000,
  allowed_areas: [], restaurant_access: false, supervision_required: null,
  raw_facts: ["Dogs are welcome", "Pets above 20 kg are not permitted"],
  unknown_fields: ["min_weight_kg", "breed_restrictions", "allowed_areas", "supervision_required"], confidence: 0.9
};

// Always pass an explicit fetchImpl so tests never touch a real server.
const reply = (content, status = 200) => async () => new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status });
const local = { baseUrl: "http://localhost:1234/v1", model: "test-model" };

const valid = await extractPolicyWithAI("Dogs are welcome.", { ...local, fetchImpl: reply(JSON.stringify(constraints)) });
assert.equal(valid.success, true);
assert.equal(valid.source, "ai");
assert.equal(valid.constraints.max_weight_kg, 20);

// Small local models wrap JSON in markdown fences or chatter. Recover both.
assert.equal((await extractPolicyWithAI("Policy", { ...local, fetchImpl: reply("```json\n" + JSON.stringify(constraints) + "\n```") })).success, true);
assert.equal((await extractPolicyWithAI("Policy", { ...local, fetchImpl: reply("Sure! Here you go: " + JSON.stringify(constraints) + " Hope that helps.") })).success, true);

// Decisions are made by readiness.js, never by the model.
assert.equal(evaluateExtractedPolicy({ name: "Bruno", species: "Dog", weight: "24" }, valid.constraints).status, "BLOCKED");
assert.equal(evaluateExtractedPolicy({ name: "Bruno", species: "Dog", weight: "24" }, { ...valid.constraints, max_weight_kg: 30 }).status, "COMPATIBLE");

// A hosted provider with no key is treated as not configured.
assert.equal((await extractPolicyWithAI("Policy", { baseUrl: "https://api.example.com/v1", apiKey: "" })).success, false);

// LM Studio not running.
const offline = await extractPolicyWithAI("Policy", { ...local, fetchImpl: async () => { throw new Error("ECONNREFUSED"); } });
assert.equal(offline.success, false);
assert.match(offline.error, /LM Studio/);

// Both attempts fail.
assert.equal((await extractPolicyWithAI("Policy", { ...local, fetchImpl: reply("nope", 500) })).success, false);

// A model that rejects the strict schema succeeds on the plain retry.
let calls = 0;
const retryFetch = async () => {
  calls += 1;
  return calls === 1
    ? new Response("schema not supported", { status: 400 })
    : new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(constraints) } }] }), { status: 200 });
};
assert.equal((await extractPolicyWithAI("Policy", { ...local, fetchImpl: retryFetch })).success, true);
assert.equal(calls, 2);

// Bad types are rejected; legitimate nulls are kept.
assert.equal((await extractPolicyWithAI("Policy", { ...local, fetchImpl: reply(JSON.stringify({ ...constraints, max_weight_kg: "20" })) })).success, false);
assert.equal((await extractPolicyWithAI("Policy", { ...local, fetchImpl: reply(JSON.stringify({ ...constraints, max_weight_kg: null })) })).constraints.max_weight_kg, null);
assert.equal((await extractPolicyWithAI("Policy", { ...local, fetchImpl: reply("not json at all") })).success, false);

// The older OpenAI Responses shape still parses.
assert.equal((await extractPolicyWithAI("Policy", { ...local, fetchImpl: async () => new Response(JSON.stringify({ output_text: JSON.stringify(constraints) }), { status: 200 }) })).success, true);

console.log("Server policy extraction tests passed.");
