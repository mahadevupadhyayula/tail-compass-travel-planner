import assert from "node:assert/strict";
import { buildReadiness, evaluatePlace, evaluatePolicy, extractPolicyConstraints, findCompatibleAlternatives } from "./readiness.js";
import { defaultAccommodationId, itineraryTemplate, places } from "./demoData.js";
import { VERIFICATION } from "./data/provenance.js";

const bruno = { name: "Bruno", weight: "24" };
assert.equal(evaluatePlace(bruno, { name: "20 kg hotel", petAllowed: true, maxWeightKg: 20 }).status, "BLOCKED");
assert.equal(evaluatePlace(bruno, { name: "30 kg hotel", petAllowed: true, maxWeightKg: 30 }).status, "COMPATIBLE");
assert.equal(evaluatePlace({ name: "Equal", weight: "20" }, { name: "20 kg hotel", petAllowed: true, maxWeightKg: 20 }).status, "COMPATIBLE");
assert.equal(evaluatePlace(bruno, { name: "No-pet hotel", petAllowed: false, maxWeightKg: 99 }).status, "BLOCKED");
assert.equal(evaluatePlace({ name: "Unknown", weight: "" }, { name: "Hotel", petAllowed: true, maxWeightKg: 20 }).status, "INFORMATION_REQUIRED");
const completePolicy = "Dogs are welcome. Pets above 20 kg are not permitted. A pet fee of INR 1000 applies. Pets are not permitted inside the restaurant.";
const extracted = extractPolicyConstraints(completePolicy);
assert.equal(extracted.pet_allowed, true);
assert.equal(extracted.max_weight_kg, 20);
assert.equal(extracted.pet_fee_inr, 1000);
assert.equal(extracted.restaurant_access, false);
assert.deepEqual(extracted.species_allowed, ["dog"]);

const blockedPolicy = evaluatePolicy(bruno, completePolicy);
assert.equal(blockedPolicy.status, "BLOCKED");
assert.equal(blockedPolicy.conflict, true);
assert.equal(evaluatePolicy({ name: "Exact", weight: "20" }, completePolicy).status, "COMPATIBLE");
assert.equal(evaluatePolicy({ name: "Lighter", weight: "18" }, completePolicy).status, "COMPATIBLE");

const noPets = evaluatePolicy(bruno, "Pets are not permitted.");
assert.equal(noPets.pet_allowed, false);
assert.equal(noPets.status, "BLOCKED");
assert.equal(evaluatePolicy({ ...bruno, species: "Dog" }, "Cats only.").status, "BLOCKED");

const noWeight = extractPolicyConstraints("Dogs are welcome. Please keep pets supervised.");
assert.equal(noWeight.max_weight_kg, null);
assert.equal(noWeight.supervision_required, true);
assert.equal(evaluatePolicy(bruno, "").extraction_status, "EMPTY_POLICY");
assert.equal(evaluatePolicy(bruno, "Welcome to our beautiful hotel.").explanation, "Couldn't confidently extract a travel rule from this policy.");

const blockedStay = places.find(place => place.id === defaultAccommodationId);
const alternatives = findCompatibleAlternatives({ ...bruno, species: "Dog", breed: "Golden Retriever" }, blockedStay, places, "Goa");
assert.equal(alternatives.length, 1);
assert.equal(alternatives[0].place.id, "demo-pet-resort-goa");
assert.equal(alternatives.some(item => item.place.id === blockedStay.id), false);
assert.deepEqual(findCompatibleAlternatives({ ...bruno, weight: "40" }, blockedStay, places, "Goa"), []);

const unresolvedPlan = buildReadiness({ ...bruno, species: "Dog", breed: "Golden Retriever" }, places, itineraryTemplate, defaultAccommodationId, "Goa");
assert.equal(unresolvedPlan.status, "ACTION_NEEDED");
const correctedPlan = buildReadiness({ ...bruno, species: "Dog", breed: "Golden Retriever" }, places, itineraryTemplate, "demo-pet-resort-goa", "Goa");
assert.equal(correctedPlan.status, "READY");
assert.equal(correctedPlan.selectedAccommodation.id, "demo-pet-resort-goa");
assert.equal(correctedPlan.itinerary[0].stops.find(stop => stop.type === "Stay").title, "Check-in at Demo Pet Resort Goa");

// --- Fallback parser: cases the old regex version got wrong ---

// A ban attached to a place is an area rule, not a blanket ban.
const areaOnly = extractPolicyConstraints("Pets are welcome. Dogs are not allowed in the pool area.");
assert.equal(areaOnly.pet_allowed, true);

const kitchen = extractPolicyConstraints("We are a pet-friendly property. No pets in the kitchen.");
assert.equal(kitchen.pet_allowed, true);

// A blanket ban is still detected when it is not the first sentence.
const laterBan = extractPolicyConstraints("Our rooms are spacious and quiet. Pets are not permitted.");
assert.equal(laterBan.pet_allowed, false);

// Weight direction follows the phrasing.
const upTo = extractPolicyConstraints("Pets up to 15 kg are welcome.");
assert.equal(upTo.max_weight_kg, 15);
assert.equal(upTo.min_weight_kg, null);
assert.equal(upTo.pet_allowed, true);

const aboveWelcome = extractPolicyConstraints("Pets above 5 kg are welcome.");
assert.equal(aboveWelcome.min_weight_kg, 5);
assert.equal(aboveWelcome.max_weight_kg, null);

assert.equal(extractPolicyConstraints("Minimum weight 5 kg.").min_weight_kg, 5);

// Rupee symbols and thousands separators.
const rupee = extractPolicyConstraints("Only pets weighing under 10 kg are accepted. A charge of ₹1,500 per stay applies.");
assert.equal(rupee.max_weight_kg, 10);
assert.equal(rupee.pet_fee_inr, 1500);

// A weight is never mistaken for a fee.
assert.equal(extractPolicyConstraints("Pets up to 15 kg are welcome.").pet_fee_inr, null);

// Breeds are read only from an explicit list, never inferred.
const breeds = extractPolicyConstraints("Dogs are welcome. Breed restrictions apply: Pit Bull, Rottweiler.");
assert.deepEqual(breeds.breed_restrictions, ["Pit Bull", "Rottweiler"]);
assert.equal(extractPolicyConstraints("Dogs are welcome.").breed_restrictions.length, 0);
assert.equal(evaluatePolicy({ name: "Rocky", species: "Dog", breed: "Rottweiler", weight: "20" }, "Dogs are welcome. Breed restrictions apply: Pit Bull, Rottweiler.").status, "BLOCKED");

// Both species named.
const both = extractPolicyConstraints("Dogs are welcome. Cats are welcome too.");
assert.deepEqual(both.species_allowed.sort(), ["cat", "dog"]);

// Still refuses to guess.
assert.equal(extractPolicyConstraints("Welcome to our beautiful hotel.").extraction_status, "NOT_VERIFIED");
assert.equal(extractPolicyConstraints("   ").extraction_status, "EMPTY_POLICY");


// --- Minimum weight limits ---
const bigOnly = { name: "Farm stay", petAllowed: true, minWeightKg: 5, maxWeightKg: 40 };
assert.equal(evaluatePlace({ name: "Pixie", weight: "3" }, bigOnly).status, "BLOCKED");
assert.match(evaluatePlace({ name: "Pixie", weight: "3" }, bigOnly).reason, /minimum accepted weight is 5 kg/);
assert.equal(evaluatePlace({ name: "Pixie", weight: "6" }, bigOnly).status, "COMPATIBLE");

// A stated minimum with no stated maximum is still a usable answer.
const minOnly = evaluatePlace({ name: "Bruno", weight: "24" }, { name: "Farm stay", petAllowed: true, minWeightKg: 5, maxWeightKg: null });
assert.equal(minOnly.status, "COMPATIBLE");
assert.match(minOnly.reason, /No upper weight limit/);

// No weight policy at all is still unverified, not a pass.
assert.equal(evaluatePlace({ name: "Bruno", weight: "24" }, { name: "Unknown inn", petAllowed: true }).status, "NOT_VERIFIED");

// End to end, through the parser.
assert.equal(evaluatePolicy({ name: "Pixie", species: "Dog", weight: "3" }, "Dogs are welcome. Minimum weight 5 kg.").status, "BLOCKED");
assert.equal(evaluatePolicy({ name: "Bruno", species: "Dog", weight: "24" }, "Dogs are welcome. Minimum weight 5 kg.").status, "COMPATIBLE");
assert.equal(evaluatePolicy({ name: "Bruno", species: "Dog", weight: "24" }, "Dogs are welcome.").explanation, "No weight limit is stated in this policy.");

// Every place record carries provenance, even when the honest value is null.
for (const place of places) {
  const p = place.provenance;
  assert.ok(p, `${place.id} has no provenance`);
  assert.ok(p.source, `${place.id} has no source`);
  assert.ok("sourceUrl" in p && "lastVerified" in p && "confidence" in p, `${place.id} is missing provenance fields`);
  assert.ok(VERIFICATION[p.verificationStatus], `${place.id} has an unknown verification status`);
  // Synthetic data must never claim to be official.
  if (p.verificationStatus === VERIFICATION.DEMO || p.verificationStatus === VERIFICATION.NOT_VERIFIED) {
    assert.equal(p.confidence, 0, `${place.id} claims confidence without verification`);
  }
}

console.log("Readiness and policy extraction tests passed.");
