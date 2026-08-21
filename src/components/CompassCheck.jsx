import React from "react";

// Paste a policy, get structured constraints, then let readiness.js decide.
// Top-level component on purpose: defining this inside App recreated the
// component on every render, which made the textarea lose focus per keystroke.
const weightLimitText = result => {
  const { min_weight_kg: min, max_weight_kg: max } = result;
  if (min != null && max != null) return `${min}–${max} kg`;
  if (max != null) return `Up to ${max} kg`;
  if (min != null) return `From ${min} kg`;
  return "Unknown";
};

const provenance = result => {
  const how = result.extraction_source === "ai"
    ? "AI extracted from supplied policy"
    : result.fallback_notice || "Extracted locally, without AI";
  return result.confidence ? `${how} · Confidence ${Math.round(result.confidence * 100)}%` : how;
};

export default function CompassCheck({ pet, policyText, setPolicyText, policyResult, isExtracting, policyFile, fileNotice, onFileSelected, onAnalyse, onUseDemo }) {
  const overBy = policyResult?.conflict && policyResult.max_weight_kg != null && Number(pet.weight) > policyResult.max_weight_kg
    ? Math.round((Number(pet.weight) - policyResult.max_weight_kg) * 100) / 100
    : null;

  return (
    <article className="card compass-check">
      <div className="section-heading">
        <div>
          <span className="section-kicker">COMPASS CHECK</span>
          <h2>Check a pet policy before you book</h2>
        </div>
        <span className="demo-pill">AI WHEN AVAILABLE</span>
      </div>

      <label>
        Paste policy text
        <textarea value={policyText} onChange={event => setPolicyText(event.target.value)} />
      </label>
      <label className="upload-control">
        Attach a policy file
        <input type="file" accept=".txt,.md,.csv,.pdf,image/*" onChange={event => onFileSelected(event.target.files?.[0] || null)} />
      </label>
      {policyFile && fileNotice && <small className="trust-label">{fileNotice}</small>}
      <small className="trust-label">
        {policyResult ? provenance(policyResult) : "Local fallback remains available when AI is unavailable."}
      </small>

      <div className="actions">
        <button className="secondary" onClick={onUseDemo}>Use demo policy</button>
        <button disabled={isExtracting || !policyText.trim()} onClick={onAnalyse}>{isExtracting ? "Extracting…" : "Extract policy rules"}</button>
      </div>

      {policyResult && (
        <div className="policy-pipeline">
          <span className="pipeline-label">POLICY RULES FOUND</span>
          <div className="rule-grid">
            <div><span>Pet allowed</span><strong>{policyResult.pet_allowed == null ? "Unknown" : policyResult.pet_allowed ? "Yes" : "No"}</strong></div>
            <div><span>Weight limit</span><strong>{weightLimitText(policyResult)}</strong></div>
            <div><span>Pet fee</span><strong>{policyResult.pet_fee_inr == null ? "Unknown" : `₹${policyResult.pet_fee_inr}`}</strong></div>
            <div><span>Restaurant access</span><strong>{policyResult.restaurant_access == null ? "Unknown" : policyResult.restaurant_access ? "Yes" : "No"}</strong></div>
          </div>
          {policyResult.breed_restrictions?.length > 0 && (
            <small className="trust-label">Breed restrictions found: {policyResult.breed_restrictions.join(", ")}</small>
          )}
          <div className="pipeline-arrow">↓</div>
          <section className={`policy-result ${policyResult.conflict ? "conflict" : ""}`}>
            <span className="pipeline-label">RESULT</span>
            <strong>{policyResult.conflict ? "⚠ CONFLICT" : policyResult.status === "COMPATIBLE" ? "✓ COMPATIBLE" : "MORE INFORMATION NEEDED"}</strong>
            <p>{overBy != null ? `${pet.name || "Your pet"} is ${overBy} kg above the stated limit. ${policyResult.explanation}` : policyResult.explanation}</p>
          </section>
        </div>
      )}
    </article>
  );
}
