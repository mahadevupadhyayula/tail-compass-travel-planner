export function evaluatePlace(pet, place) {
  const weight = Number(pet.weight);
  if (!Number.isFinite(weight) || weight <= 0) return { status: "INFORMATION_REQUIRED", reason: "Add your pet's weight to evaluate accommodation policies." };
  if (place.petAllowed === false) return { status: "BLOCKED", reason: `${place.name} does not allow pets.` };
  const species = pet.species?.trim().toLowerCase();
  if (place.speciesAllowed?.length && species && !place.speciesAllowed.map(value => value.toLowerCase()).includes(species)) return { status: "BLOCKED", reason: `${place.name} does not allow ${species}s.` };
  const breed = pet.breed?.trim().toLowerCase();
  if (breed && place.breedRestrictions?.some(value => value.toLowerCase() === breed)) return { status: "BLOCKED", reason: `${place.name} restricts ${pet.breed}.` };
  if (place.minWeightKg != null && weight < place.minWeightKg) return { status: "BLOCKED", reason: `${pet.name || "Your pet"} weighs ${weight} kg, but the minimum accepted weight is ${place.minWeightKg} kg.` };
  if (place.maxWeightKg == null) {
    return place.minWeightKg != null
      ? { status: "COMPATIBLE", reason: `${pet.name || "Your pet"} meets the ${place.minWeightKg} kg minimum. No upper weight limit is stated.` }
      : { status: "NOT_VERIFIED", reason: `No weight policy is available for ${place.name}.` };
  }
  if (weight > place.maxWeightKg) return { status: "BLOCKED", reason: `${pet.name || "Your pet"} weighs ${weight} kg, but this property allows pets only up to ${place.maxWeightKg} kg.` };
  return { status: "COMPATIBLE", reason: `${pet.name || "Your pet"} weighs ${weight} kg, within this property's ${place.maxWeightKg} kg limit.` };
}

export function findCompatibleAlternatives(pet, blockedPlace, places, destinationCity) {
  return places
    .filter(place => place.type === "Stay" && place.id !== blockedPlace?.id && (!destinationCity || place.city === destinationCity))
    .map(place => ({ place, ...evaluatePlace(pet, place) }))
    .filter(item => item.status === "COMPATIBLE");
}

export function buildItinerary(template, selectedAccommodation) {
  return template.map(day => ({
    ...day,
    stops: day.stops.map(stop => {
      if (stop.type !== "Stay") return stop;
      if (stop.id?.startsWith("check-in")) {
        return { ...stop, title: `Check-in at ${selectedAccommodation.name}`, reason: `Selected stay: ${selectedAccommodation.name}.`, source: selectedAccommodation.provenance?.source ?? stop.source };
      }
      if (stop.id?.startsWith("check-out")) {
        return { ...stop, title: `Check-out from ${selectedAccommodation.name}`, source: selectedAccommodation.provenance?.source ?? stop.source };
      }
      // Older hand-written templates matched on the title instead of an id.
      return stop.title?.startsWith("Check-in")
        ? { ...stop, title: `Check-in at ${selectedAccommodation.name}`, reason: `Selected stay: ${selectedAccommodation.name}.` }
        : stop;
    })
  }));
}

export function buildReadiness(pet, places, itineraryTemplate, selectedAccommodationId, destinationCity) {
  const selectedAccommodation = places.find(place => place.id === selectedAccommodationId) || places.find(place => place.type === "Stay");
  const selectedEvaluation = selectedAccommodation ? { place: selectedAccommodation, ...evaluatePlace(pet, selectedAccommodation) } : null;
  const alternatives = selectedEvaluation?.status === "BLOCKED" ? findCompatibleAlternatives(pet, selectedAccommodation, places, destinationCity) : [];
  const missing = selectedEvaluation?.status === "INFORMATION_REQUIRED";
  const status = missing ? "INFORMATION_REQUIRED" : selectedEvaluation?.status === "BLOCKED" ? "ACTION_NEEDED" : selectedEvaluation?.status === "COMPATIBLE" ? "READY" : "NOT_VERIFIED";
  const score = status === "READY" ? 100 : status === "ACTION_NEEDED" ? 80 : status === "INFORMATION_REQUIRED" ? 40 : 60;
  return {
    status, score, selectedAccommodation, selectedEvaluation,
    blocker: selectedEvaluation?.status === "BLOCKED" ? selectedEvaluation : null,
    alternatives, alternative: alternatives[0] || null,
    itinerary: selectedAccommodation ? buildItinerary(itineraryTemplate, selectedAccommodation) : itineraryTemplate
  };
}

// This fallback has the same structured contract the AI extractor returns.
// It extracts only explicit facts and deliberately leaves all other fields null or empty.
// It never infers a restriction that is not stated in the text.
const ALL_FIELDS = ["pet_allowed", "max_weight_kg", "min_weight_kg", "breed_restrictions", "species_allowed", "pet_fee_inr", "allowed_areas", "restaurant_access", "supervision_required"];

const PET_WORDS = /\b(pets?|animals?|dogs?|cats?)\b/i;
const AREA_WORDS = /\b(restaurants?|dining|caf[eé]s?|pools?|spas?|gyms?|fitness|lobby|bars?|kitchens?|breakfast|elevators?|lifts?|beach|gardens?|balcony|terrace|rooms?|common areas?)\b/gi;
const DINING_WORDS = /\b(restaurants?|dining|caf[eé]s?|breakfast|bars?)\b/i;
const NEGATION = /\b(not|no|never|cannot|can't|prohibited?|prohibits|forbidden|banned|disallowed|refused|denied|excluded)\b/i;
const PERMISSION = /\b(welcome|allowed|permitted|accepted|admitted|friendly|only)\b/i;

const WEIGHT = /(\d+(?:\.\d+)?)\s*(?:kgs?|kilograms?|kilos?)\b/i;
const UPPER_HINT = /\b(up ?to|under|below|less than|not exceeding|no more than|maximum|max\.?|within|weighing under)\b/i;
const OVER_HINT = /\b(above|over|more than|exceeding|greater than|heavier than|beyond)\b/i;
const LOWER_HINT = /\b(at least|minimum|min\.?|no less than|starting from)\b/i;

const FEE_CURRENCY = /(?:inr|rs\.?|rupees|₹)\s*(\d[\d,]*(?:\.\d+)?)/i;
const FEE_WORD = /\b(?:fee|charge|charged|deposit|surcharge)\b[^.\d]{0,40}?(\d[\d,]*(?:\.\d+)?)/i;
const SUPERVISION = /\b(?:must be (?:kept )?(?:supervised|leashed|on a leash)|supervision (?:is )?required|keep (?:your )?pets? supervised|should be supervised|must not be left (?:alone|unattended)|never left (?:alone|unattended))\b/i;
const BREED_LIST = /\b(?:breed restrictions?|restricted breeds?|banned breeds?|the following breeds?)\b[^:.\n]*[:\-–]?\s*([^.;\n]+)/i;

const toNumber = value => Number(String(value).replace(/,/g, ""));
const splitSentences = text => text.split(/(?<=[.;!?\n])/).map(part => part.trim()).filter(Boolean);

export function extractPolicyConstraints(text) {
  const normalized = String(text ?? "").trim();
  const empty = {
    extraction_status: "NOT_VERIFIED", extraction_source: "fallback",
    pet_allowed: null, max_weight_kg: null, min_weight_kg: null,
    breed_restrictions: [], species_allowed: [], pet_fee_inr: null,
    allowed_areas: [], restaurant_access: null, supervision_required: null,
    raw_facts: [], unknown_fields: [...ALL_FIELDS], confidence: 0
  };
  if (!normalized) return { ...empty, extraction_status: "EMPTY_POLICY" };

  let petAllowed = null;
  let maxWeight = null;
  let minWeight = null;
  let petFee = null;
  let restaurantAccess = null;
  let supervisionRequired = null;
  const species = new Set();
  const allowedAreas = new Set();
  const breedRestrictions = new Set();

  for (const sentence of splitSentences(normalized)) {
    const mentionsPet = PET_WORDS.test(sentence);
    const negated = NEGATION.test(sentence);
    const weightMatch = sentence.match(WEIGHT);
    const areaMatches = sentence.match(AREA_WORDS) || [];

    // Weight limits. Direction comes from the phrasing, not from guesswork.
    if (weightMatch) {
      const value = toNumber(weightMatch[1]);
      if (LOWER_HINT.test(sentence)) minWeight = value;
      else if (UPPER_HINT.test(sentence)) maxWeight = value;
      else if (OVER_HINT.test(sentence)) { if (negated) maxWeight = value; else minWeight = value; }
    }

    // Fees, in INR only. Ignore any number that is really a weight.
    if (petFee == null) {
      const currencyMatch = sentence.match(FEE_CURRENCY);
      const wordMatch = currencyMatch ? null : sentence.match(FEE_WORD);
      const candidate = currencyMatch || wordMatch;
      if (candidate && !(weightMatch && weightMatch[1] === candidate[1])) petFee = toNumber(candidate[1]);
    }

    if (SUPERVISION.test(sentence)) supervisionRequired = true;

    const breedMatch = sentence.match(BREED_LIST);
    if (breedMatch) {
      for (const item of breedMatch[1].split(/,| and /i).map(part => part.trim()).filter(Boolean)) breedRestrictions.add(item);
    }

    if (!mentionsPet) continue;

    // A restriction attached to a place is an area rule, not a blanket ban.
    if (areaMatches.length) {
      if (DINING_WORDS.test(sentence)) restaurantAccess = !negated;
      if (!negated) for (const area of areaMatches) allowedAreas.add(area.toLowerCase());
    }

    if (negated) {
      // A ban qualified by weight, breed or a specific area is conditional, not global.
      const qualified = Boolean(weightMatch) || areaMatches.length > 0 || Boolean(breedMatch);
      if (!qualified) petAllowed = false;
    } else if (PERMISSION.test(sentence) || /\bpet[- ]friendly\b/i.test(sentence)) {
      if (petAllowed == null) petAllowed = true;
      if (/\bdogs?\b/i.test(sentence)) species.add("dog");
      if (/\bcats?\b/i.test(sentence)) species.add("cat");
    }
  }


  const facts = [];
  if (petAllowed !== null) facts.push(`Pet allowed: ${petAllowed ? "yes" : "no"}`);
  if (species.size) facts.push(`Allowed species: ${[...species].join(", ")}`);
  if (maxWeight != null) facts.push(`Maximum weight: ${maxWeight} kg`);
  if (minWeight != null) facts.push(`Minimum weight: ${minWeight} kg`);
  if (breedRestrictions.size) facts.push(`Breed restrictions: ${[...breedRestrictions].join(", ")}`);
  if (petFee != null) facts.push(`Pet fee: INR ${petFee}`);
  if (restaurantAccess !== null) facts.push(`Restaurant access: ${restaurantAccess ? "yes" : "no"}`);
  if (allowedAreas.size) facts.push(`Areas mentioned as allowed: ${[...allowedAreas].join(", ")}`);
  if (supervisionRequired !== null) facts.push("Supervision required: yes");

  const values = {
    pet_allowed: petAllowed, max_weight_kg: maxWeight, min_weight_kg: minWeight,
    breed_restrictions: [...breedRestrictions], species_allowed: [...species],
    pet_fee_inr: petFee, allowed_areas: [...allowedAreas],
    restaurant_access: restaurantAccess, supervision_required: supervisionRequired
  };
  const unknownFields = Object.entries(values).filter(([, value]) => value === null || (Array.isArray(value) && value.length === 0)).map(([key]) => key);
  return {
    extraction_status: facts.length ? "EXTRACTED" : "NOT_VERIFIED", extraction_source: "fallback",
    ...values, raw_facts: facts, unknown_fields: unknownFields,
    confidence: facts.length ? Math.min(0.95, 0.45 + facts.length * 0.1) : 0
  };
}

export function validatePolicyConstraints(candidate, { source = "ai" } = {}) {
  const arrayFields = ["breed_restrictions", "species_allowed", "allowed_areas", "raw_facts", "unknown_fields"];
  const nullableBooleanFields = ["pet_allowed", "restaurant_access", "supervision_required"];
  const nullableNumberFields = ["max_weight_kg", "min_weight_kg", "pet_fee_inr"];
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return { valid: false, error: "Policy constraints must be an object." };
  if (arrayFields.some(key => !Array.isArray(candidate[key]) || candidate[key].some(value => typeof value !== "string"))) return { valid: false, error: "Policy list fields must contain only strings." };
  if (nullableBooleanFields.some(key => candidate[key] !== null && typeof candidate[key] !== "boolean")) return { valid: false, error: "Policy boolean fields are invalid." };
  if (nullableNumberFields.some(key => candidate[key] !== null && (!Number.isFinite(candidate[key]) || candidate[key] < 0))) return { valid: false, error: "Policy numeric fields are invalid." };
  if (!Number.isFinite(candidate.confidence) || candidate.confidence < 0 || candidate.confidence > 1) return { valid: false, error: "Policy confidence must be between 0 and 1." };
  return {
    valid: true,
    constraints: {
      extraction_status: "EXTRACTED", extraction_source: source,
      pet_allowed: candidate.pet_allowed, max_weight_kg: candidate.max_weight_kg,
      min_weight_kg: candidate.min_weight_kg, breed_restrictions: candidate.breed_restrictions,
      species_allowed: candidate.species_allowed, pet_fee_inr: candidate.pet_fee_inr,
      allowed_areas: candidate.allowed_areas, restaurant_access: candidate.restaurant_access,
      supervision_required: candidate.supervision_required, raw_facts: candidate.raw_facts,
      unknown_fields: candidate.unknown_fields, confidence: candidate.confidence
    }
  };
}

export function evaluateExtractedPolicy(pet, constraints) {
  if (constraints.extraction_status === "EMPTY_POLICY") return { ...constraints, status: "NOT_VERIFIED", conflict: null, explanation: "Add a policy before running Compass Check." };
  if (constraints.extraction_status === "NOT_VERIFIED") return { ...constraints, status: "NOT_VERIFIED", conflict: null, explanation: "Couldn't confidently extract a travel rule from this policy." };
  const petSpecies = pet.species?.trim().toLowerCase();
  if (constraints.species_allowed.length && petSpecies && !constraints.species_allowed.includes(petSpecies)) {
    return { ...constraints, status: "BLOCKED", conflict: true, explanation: `This policy allows ${constraints.species_allowed.join(", ")} pets, not ${petSpecies}s.` };
  }
  const petBreed = pet.breed?.trim().toLowerCase();
  if (petBreed && constraints.breed_restrictions.some(breed => breed.toLowerCase() === petBreed)) {
    return { ...constraints, status: "BLOCKED", conflict: true, explanation: `${pet.breed} is restricted by this policy.` };
  }
  const policyPlace = { name: "This policy", petAllowed: constraints.pet_allowed, maxWeightKg: constraints.max_weight_kg, minWeightKg: constraints.min_weight_kg };
  const evaluation = evaluatePlace(pet, policyPlace);
  const explanation = evaluation.status === "NOT_VERIFIED" ? "No weight limit is stated in this policy." : evaluation.reason;
  return { ...constraints, status: evaluation.status, conflict: evaluation.status === "BLOCKED", evaluation, explanation };
}

export function evaluatePolicy(pet, text) {
  return evaluateExtractedPolicy(pet, extractPolicyConstraints(text));
}
