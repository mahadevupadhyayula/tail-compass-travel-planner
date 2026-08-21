import React from "react";
import { statusLabel, statusTone } from "../data/provenance.js";

// Status is never signalled by colour alone — every badge carries its text label.
export function VerificationBadge({ status }) {
  return <span className={`source-badge ${statusTone(status)}`}>{statusLabel(status)}</span>;
}

// One place to render provenance, so no record is ever shown without it.
export default function SourceLine({ record, className = "trust-label" }) {
  const source = record?.provenance;
  if (!source) return null;
  return (
    <small className={className}>
      Source: {source.source} · {statusLabel(source.verificationStatus)}
      {source.sourceUrl && <> · <a href={source.sourceUrl} target="_blank" rel="noreferrer">View policy</a></>}
      {" · "}Last checked: {source.lastVerified || "Not verified"}
      {source.confidence ? ` · Confidence ${Math.round(source.confidence * 100)}%` : ""}
    </small>
  );
}
