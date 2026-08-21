// Every externally-sourced fact in Tail Compass carries provenance.
// If we cannot say where a fact came from, we do not present it as a fact.

export const VERIFICATION = {
  OFFICIAL: "OFFICIAL",         // read from the operator's own published page
  VERIFIED: "VERIFIED",         // confirmed against a primary source by our team
  CURATED: "CURATED",           // human-selected guidance, not an operator policy
  DEMO: "DEMO",                 // synthetic seed data for the prototype
  NOT_VERIFIED: "NOT_VERIFIED"  // nobody has checked this
};

// Only these two may be described to a user as a rule.
export const TRUSTED = [VERIFICATION.OFFICIAL, VERIFICATION.VERIFIED];

const LABELS = {
  OFFICIAL: "Official policy",
  VERIFIED: "Verified",
  CURATED: "Curated guidance",
  DEMO: "Demo data",
  NOT_VERIFIED: "No source read"
};

export function provenance({ source, sourceUrl = null, lastVerified = null, verificationStatus, confidence = 0 }) {
  if (!source) throw new Error("Provenance needs a source.");
  if (!VERIFICATION[verificationStatus]) throw new Error(`Unknown verification status: ${verificationStatus}`);
  return { source, sourceUrl, lastVerified, verificationStatus, confidence };
}

export const official = (source, sourceUrl, lastVerified, confidence = 0.95) =>
  provenance({ source, sourceUrl, lastVerified, verificationStatus: VERIFICATION.OFFICIAL, confidence });

export const curated = (source, sourceUrl = null, lastVerified = null, confidence = 0.5) =>
  provenance({ source, sourceUrl, lastVerified, verificationStatus: VERIFICATION.CURATED, confidence });

export const demo = source =>
  provenance({ source, verificationStatus: VERIFICATION.DEMO, confidence: 0 });

export const notVerified = (source = "No verified source in this dataset", sourceUrl = null) =>
  provenance({ source, sourceUrl, verificationStatus: VERIFICATION.NOT_VERIFIED, confidence: 0 });

export const isTrusted = record => TRUSTED.includes(record?.provenance?.verificationStatus);
export const statusLabel = status => LABELS[status] ?? LABELS.NOT_VERIFIED;

// Presentational only. Status is never communicated by colour alone —
// every badge also carries its text label.
export const statusTone = status =>
  status === VERIFICATION.OFFICIAL || status === VERIFICATION.VERIFIED ? "trusted"
  : status === VERIFICATION.CURATED ? "curated"
  : status === VERIFICATION.DEMO ? "demo"
  : "unverified";
