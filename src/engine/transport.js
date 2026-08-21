// Transport eligibility. Pure functions over structured rules.
// The model never decides this; it only ever supplies the numbers.
// A missing limit is never read as permission.

const round = value => Math.round(value * 100) / 100;

export function combinedWeight(pet) {
  const petKg = Number(pet?.weight);
  const carrierKg = Number(pet?.carrierWeight);
  const hasPet = Number.isFinite(petKg) && petKg > 0;
  const hasCarrier = Number.isFinite(carrierKg) && carrierKg > 0;
  return {
    petKg: hasPet ? petKg : null,
    carrierKg: hasCarrier ? carrierKg : null,
    combinedKg: hasPet && hasCarrier ? round(petKg + carrierKg) : null,
    carrierKnown: hasCarrier
  };
}

const petLabel = pet => pet?.name?.trim() || "Your pet";

function cabinClass(pet, cabin, weight) {
  const label = cabin.label || "Cabin";
  const limit = cabin.maxCombinedKg;
  if (limit == null) return { key: "cabin", label, eligible: null, reason: "No cabin weight limit is stated." };

  // If the pet alone already exceeds the limit, the carrier weight cannot rescue it.
  if (weight.petKg > limit) {
    return {
      key: "cabin", label, eligible: false,
      reason: `${petLabel(pet)} weighs ${weight.petKg} kg. The stated cabin limit is ${limit} kg${cabin.includesCarrier ? " including the carrier" : ""}, so cabin is ruled out whatever the carrier weighs.`
    };
  }
  if (cabin.includesCarrier && !weight.carrierKnown) {
    return {
      key: "cabin", label, eligible: null,
      reason: `The stated cabin limit is ${limit} kg including the carrier. We need the carrier weight before we can confirm cabin eligibility.`
    };
  }
  const applied = cabin.includesCarrier ? weight.combinedKg : weight.petKg;
  return applied <= limit
    ? { key: "cabin", label, eligible: true, reason: `${applied} kg${cabin.includesCarrier ? " (pet + carrier)" : ""} is within the stated ${limit} kg cabin limit.` }
    : { key: "cabin", label, eligible: false, reason: `${applied} kg (pet + carrier) is above the stated ${limit} kg cabin limit.` };
}

function bandClass(key, band, weight, pet) {
  const label = band.label || key;
  const { minKg, maxKg } = band;
  const value = weight.petKg;
  const withinLower = minKg == null || (band.exclusiveMin ? value > minKg : value >= minKg);
  const withinUpper = maxKg == null || value <= maxKg;
  const range = minKg != null && maxKg != null ? `${minKg}–${maxKg} kg`
    : maxKg != null ? `up to ${maxKg} kg`
    : band.exclusiveMin ? `above ${minKg} kg` : `${minKg} kg and above`;
  return withinLower && withinUpper
    ? { key, label, eligible: true, reason: `${value} kg falls inside the stated ${range} ${label.toLowerCase()} band.` }
    : { key, label, eligible: false, reason: `${label} applies to ${range}. ${petLabel(pet)} weighs ${value} kg.` };
}

export function evaluateTransport(pet, option) {
  const rules = option?.rules;
  const weight = combinedWeight(pet);
  const base = {
    optionId: option?.id, mode: option?.mode, operator: option?.operator,
    provenance: option?.provenance, weight,
    classes: [], documents: rules?.documents ?? [], guidance: rules?.guidance ?? [],
    routeExclusions: rules?.routeExclusions ?? []
  };

  if (!rules) return { ...base, status: "NOT_VERIFIED", summary: "We have no rules for this option." };

  const hasBands = Boolean(rules.cabin || rules.hold || rules.cargo);

  // No operator policy applies at all (your own car), versus no policy we have read (train, bus).
  if (!hasBands) {
    const trusted = ["OFFICIAL", "VERIFIED", "CURATED"].includes(option.provenance?.verificationStatus);
    return trusted
      ? { ...base, status: "COMPATIBLE", summary: "No operator policy restricts this option. Plan around your pet's comfort." }
      : { ...base, status: "NOT_VERIFIED", summary: "We have not read a policy for this option. Check with the operator before booking." };
  }

  if (weight.petKg == null) {
    return { ...base, status: "INFORMATION_REQUIRED", summary: "Add your pet's weight to check this option." };
  }

  const species = pet?.species?.trim().toLowerCase();
  if (rules.speciesAllowed?.length && species && !rules.speciesAllowed.includes(species)) {
    return {
      ...base, status: "BLOCKED",
      summary: `This operator carries only ${rules.speciesAllowed.join(" and ")}s.`,
      classes: []
    };
  }

  const classes = [];
  if (rules.cabin) classes.push(cabinClass(pet, rules.cabin, weight));
  if (rules.hold) classes.push(bandClass("hold", rules.hold, weight, pet));
  if (rules.cargo) classes.push(bandClass("cargo", rules.cargo, weight, pet));

  const eligible = classes.filter(item => item.eligible === true);
  const unknown = classes.filter(item => item.eligible === null);
  const cabinOk = classes.find(item => item.key === "cabin")?.eligible === true;

  let status = "BLOCKED";
  let summary = `${petLabel(pet)} does not fit any stated travel class for this operator.`;
  if (cabinOk) {
    status = "COMPATIBLE";
    summary = `${petLabel(pet)} can travel in the cabin.`;
  } else if (eligible.length) {
    status = "ACTION_NEEDED";
    summary = `Cabin is ruled out. ${petLabel(pet)} can travel as ${eligible[0].label.toLowerCase()}.`;
  } else if (unknown.length) {
    status = "INFORMATION_REQUIRED";
    summary = "We can't confirm cabin eligibility yet, but you can still compare other travel options.";
  }

  return { ...base, status, summary, classes };
}

export const STATUS_LABEL = {
  COMPATIBLE: "Suitable",
  ACTION_NEEDED: "Conditions apply",
  BLOCKED: "Not possible",
  INFORMATION_REQUIRED: "More information needed",
  NOT_VERIFIED: "Not verified"
};

// Status is never colour-only: each tone is paired with the text label above.
export const STATUS_TONE = {
  COMPATIBLE: "ok", ACTION_NEEDED: "warn", BLOCKED: "block",
  INFORMATION_REQUIRED: "info", NOT_VERIFIED: "unknown"
};
