import { curated, notVerified, official } from "./provenance.js";

// Transport rules live here as STRUCTURED DATA, never as prose inside a component.
// A null limit means "not stated by a source we have read" — it is never treated as permission.
//
// Air India figures below were read from the operator's own published pages on 21 Aug 2026.
// Indian Railways and bus operators: no primary source has been read, so every limit is null
// and the engine reports NOT_VERIFIED rather than inventing a rule.

const AIR_INDIA_URL = "https://www.airindia.com/in/en/travel-information/travelling-with-pets.html";
const AIR_INDIA_CABIN_PDF = "https://www.airindia.com/content/dam/air-india/pdfs/ai-pets-in-cabin-guidelines.pdf";

export const transportOptions = [
  {
    id: "car",
    mode: "Car",
    name: "Car",
    operator: "Own vehicle",
    summary: "Most flexible for a pet",
    reason: "You control timing, temperature and rest stops, and no operator policy applies.",
    complexity: "Low",
    flexibility: "High",
    rules: {
      speciesAllowed: null,          // no species restriction applies to your own car
      minAgeWeeks: null,
      cabin: null, hold: null, cargo: null,
      documents: [],
      routeExclusions: [],
      guidance: [
        "Plan a water and toilet break roughly every two to three hours.",
        "Never leave a pet alone in a parked car.",
        "Secure the pet with a harness or crate rather than loose on a seat."
      ]
    },
    provenance: curated("Tail Compass road-travel guidance", null, "2026-08-21", 0.5)
  },
  {
    id: "flight-air-india",
    mode: "Flight",
    name: "Flight",
    operator: "Air India",
    summary: "Conditions apply",
    reason: "Cabin, checked baggage and cargo each have their own stated weight band.",
    complexity: "High",
    flexibility: "Low",
    rules: {
      speciesAllowed: ["dog", "cat"],
      minAgeWeeks: 8,
      cabin: {
        label: "Cabin",
        maxCombinedKg: 10,
        includesCarrier: true,
        carrierMaxIn: { l: 17, w: 10, h: 9 },
        note: "Weight is the pet plus the kennel, together."
      },
      hold: { label: "Checked baggage", minKg: 10, maxKg: 32 },
      // "above 32 kg" — strictly above, so a 32 kg pet is checked baggage, not cargo.
      cargo: { label: "Cargo", minKg: 32, maxKg: null, exclusiveMin: true },
      documents: [
        "Pet passport with an up-to-date vaccination record",
        "Valid rabies vaccination certificate",
        "Health certificate stating the pet is fit to travel by air",
        "Signed indemnity form"
      ],
      routeExclusions: [
        "Cabin travel is not offered to the USA, Canada, Australia or on ultra-long-haul flights.",
        "Cabin travel between India and the UAE is not permitted in either direction.",
        "UK is cargo only, at certain airports."
      ],
      guidance: []
    },
    provenance: official("Air India — Guidelines for travelling with pets", AIR_INDIA_URL, "2026-08-21", 0.95)
  },
  {
    id: "train",
    mode: "Train",
    name: "Train",
    operator: "Indian Railways",
    summary: "Check applicable rules",
    reason: "We have not read a primary Indian Railways source, so we will not state a rule.",
    complexity: "Medium",
    flexibility: "Medium",
    rules: {
      speciesAllowed: null, minAgeWeeks: null,
      cabin: null, hold: null, cargo: null,
      documents: [],
      routeExclusions: [],
      guidance: ["Confirm the current rules and booking process with Indian Railways before you travel."]
    },
    provenance: notVerified("No primary Indian Railways source read for this dataset")
  },
  {
    id: "bus",
    mode: "Bus",
    name: "Bus",
    operator: "Varies by operator",
    summary: "Operator dependent",
    reason: "Pet acceptance differs between operators and no verified operator policy is in this dataset.",
    complexity: "Medium",
    flexibility: "Medium",
    rules: {
      speciesAllowed: null, minAgeWeeks: null,
      cabin: null, hold: null, cargo: null,
      documents: [],
      routeExclusions: [],
      guidance: ["Confirm directly with the operator before booking."]
    },
    provenance: notVerified("No verified operator policy in this dataset")
  }
];

export const findTransport = mode => transportOptions.find(option => option.mode === mode);

// A published rule set exists only when at least one travel class carries a real limit.
export const hasStatedRules = option =>
  Boolean(option?.rules && (option.rules.cabin || option.rules.hold || option.rules.cargo));

export const AIR_INDIA_SOURCES = { AIR_INDIA_URL, AIR_INDIA_CABIN_PDF };
