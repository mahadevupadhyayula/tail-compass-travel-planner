import assert from "node:assert/strict";
import { combinedWeight, evaluateTransport } from "./transport.js";
import { buildItineraryPlan, tripDayCount } from "./itinerary.js";
import { findTransport, transportOptions } from "../data/transport.js";
import { VERIFICATION } from "../data/provenance.js";
import { activities, support } from "../data/activities.js";
import { stays } from "../data/stays.js";

// --- Data integrity: nothing synthetic may masquerade as official ---
for (const option of transportOptions) {
  const p = option.provenance;
  assert.ok(VERIFICATION[p.verificationStatus], `${option.id} has an unknown verification status`);
  assert.ok(p.source, `${option.id} has no source`);
  if (p.verificationStatus === VERIFICATION.OFFICIAL) {
    assert.ok(p.sourceUrl, `${option.id} claims OFFICIAL without a source URL`);
    assert.ok(p.lastVerified, `${option.id} claims OFFICIAL without a verification date`);
  }
  // An unverified option must not carry any numeric limit.
  if (p.verificationStatus === VERIFICATION.NOT_VERIFIED) {
    assert.equal(option.rules.cabin, null, `${option.id} states a cabin rule without a source`);
    assert.equal(option.rules.hold, null, `${option.id} states a hold rule without a source`);
  }
}

// --- Combined weight ---
assert.equal(combinedWeight({ weight: "24" }).combinedKg, null);
assert.equal(combinedWeight({ weight: "24" }).carrierKnown, false);
assert.equal(combinedWeight({ weight: "5", carrierWeight: "2.2" }).combinedKg, 7.2);

// --- Bruno: 24 kg Golden Retriever on the verified Air India policy ---
const bruno = { name: "Bruno", species: "Dog", breed: "Golden Retriever", weight: "24" };
const flight = evaluateTransport(bruno, findTransport("Flight"));
assert.equal(flight.status, "ACTION_NEEDED");
const cabin = flight.classes.find(item => item.key === "cabin");
const hold = flight.classes.find(item => item.key === "hold");
assert.equal(cabin.eligible, false);
// Cabin is ruled out with certainty, so we must NOT ask for a carrier weight we don't need.
assert.match(cabin.reason, /whatever the carrier weighs/);
assert.equal(hold.eligible, true);
assert.match(flight.summary, /checked baggage/i);
assert.ok(flight.documents.length > 0);

// --- A small cat with no carrier weight: ask, don't block ---
const cat = { name: "Mishti", species: "Cat", weight: "4" };
const catFlight = evaluateTransport(cat, findTransport("Flight"));
assert.equal(catFlight.status, "INFORMATION_REQUIRED");
assert.match(catFlight.summary, /still compare other travel options/);
assert.equal(catFlight.classes.find(item => item.key === "cabin").eligible, null);

// --- Same cat, carrier weight supplied ---
const catWithCarrier = evaluateTransport({ ...cat, carrierWeight: "2" }, findTransport("Flight"));
assert.equal(catWithCarrier.status, "COMPATIBLE");
assert.equal(catWithCarrier.classes.find(item => item.key === "cabin").eligible, true);

// --- Carrier tips it over the limit ---
const heavyCarrier = evaluateTransport({ ...cat, weight: "9", carrierWeight: "3" }, findTransport("Flight"));
assert.equal(heavyCarrier.classes.find(item => item.key === "cabin").eligible, false);

// --- Species the operator does not carry ---
assert.equal(evaluateTransport({ name: "Kiwi", species: "Other", weight: "2" }, findTransport("Flight")).status, "BLOCKED");

// --- Car: no operator policy applies, so it is suitable, not "unverified" ---
const car = evaluateTransport(bruno, findTransport("Car"));
assert.equal(car.status, "COMPATIBLE");
assert.ok(car.guidance.length > 0);

// --- Train and bus: unread policy is never reported as permission ---
for (const mode of ["Train", "Bus"]) {
  const result = evaluateTransport(bruno, findTransport(mode));
  assert.equal(result.status, "NOT_VERIFIED", `${mode} should be NOT_VERIFIED`);
  assert.doesNotMatch(result.summary, /allowed|permitted|suitable/i, `${mode} must not imply permission`);
}

// --- No pet weight yet ---
assert.equal(evaluateTransport({ species: "Dog" }, findTransport("Flight")).status, "INFORMATION_REQUIRED");

// --- Itinerary generated from data ---
const trip = { from: "Hyderabad", to: "Goa", start: "2026-12-12", end: "2026-12-14", transport: "Car" };
assert.equal(tripDayCount(trip), 3);
assert.equal(tripDayCount({ start: "2026-12-12", end: "2026-12-12" }), 1);
assert.equal(tripDayCount({ start: "bad", end: "worse" }), 3);

const stay = stays[0];
const plan = buildItineraryPlan({ trip, stay, places: [...activities, ...support], transportMode: "Car" });
assert.equal(plan.length, 3);
assert.equal(plan[0].date, "2026-12-12");
assert.equal(plan[2].date, "2026-12-14");
assert.match(plan[0].destination, /Hyderabad → Goa/);
assert.ok(plan[0].stops.some(stop => stop.type === "Stay" && stop.title.includes(stay.name)));
assert.ok(plan[2].stops.some(stop => stop.id.startsWith("check-out")));
// Every stop is structured, with a reason a user can read.
for (const day of plan) {
  for (const stop of day.stops) {
    assert.ok(stop.id && stop.time && stop.title && stop.type && stop.reason, `malformed stop in ${day.day}`);
  }
}
// Deterministic: the same inputs always produce the same plan.
assert.deepEqual(plan, buildItineraryPlan({ trip, stay, places: [...activities, ...support], transportMode: "Car" }));

// A longer trip grows the middle, not the ends.
const longPlan = buildItineraryPlan({ trip: { ...trip, end: "2026-12-17" }, stay, places: [...activities, ...support], transportMode: "Car" });
assert.equal(longPlan.length, 6);
assert.ok(longPlan[3].stops.some(stop => stop.type === "Activity"));

// Flying changes the plan: no road breaks.
const flyPlan = buildItineraryPlan({ trip, stay, places: [...activities, ...support], transportMode: "Flight" });
assert.equal(flyPlan[0].stops.some(stop => stop.title === "Pet break"), false);


// --- Band boundaries: checked baggage is 10-32 kg, cargo is strictly above 32 ---
const atBoundary = evaluateTransport({ name: "Max", species: "Dog", weight: "32" }, findTransport("Flight"));
assert.equal(atBoundary.classes.find(item => item.key === "hold").eligible, true, "32 kg should be checked baggage");
assert.equal(atBoundary.classes.find(item => item.key === "cargo").eligible, false, "32 kg must not also be cargo");
const aboveBoundary = evaluateTransport({ name: "Titan", species: "Dog", weight: "40" }, findTransport("Flight"));
assert.equal(aboveBoundary.classes.find(item => item.key === "hold").eligible, false);
assert.equal(aboveBoundary.classes.find(item => item.key === "cargo").eligible, true);
// Exactly one class may claim any given weight.
for (const kg of ["5", "10", "24", "32", "33", "80"]) {
  const result = evaluateTransport({ species: "Dog", weight: kg, carrierWeight: "1" }, findTransport("Flight"));
  const claims = result.classes.filter(item => item.eligible === true).length;
  assert.ok(claims <= 1, `${kg} kg is claimed by ${claims} travel classes`);
}

console.log("Engine tests passed (transport eligibility + itinerary generation).");
