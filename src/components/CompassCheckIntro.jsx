import React from "react";
import { demoPet, samplePolicy } from "../demoData";
import { evaluatePolicy } from "../readiness.js";

// The extraction shown here is produced live by the local fallback parser,
// so what you see on the landing page is exactly what the product does.
export default function CompassCheckIntro({ onTry }) {
  const result = evaluatePolicy(demoPet, samplePolicy);

  return (
    <section className="card compass-intro">
      <div className="section-heading">
        <div>
          <span className="section-kicker">COMPASS CHECK</span>
          <h2>Paste any pet policy. We'll turn it into rules.</h2>
          <p>Works with or without AI. When AI is unavailable the local parser takes over and the app says so.</p>
        </div>
        <span className="demo-pill">LIVE OUTPUT</span>
      </div>

      <div className="intro-split">
        <blockquote className="policy-quote">
          <span className="section-kicker">POLICY TEXT</span>
          <p>{samplePolicy}</p>
        </blockquote>
        <div className="pipeline-arrow" aria-hidden="true">→</div>
        <div className="rule-grid">
          <div><span>Pet allowed</span><strong>{result.pet_allowed ? "Yes" : result.pet_allowed === false ? "No" : "Unknown"}</strong></div>
          <div><span>Weight limit</span><strong>{result.max_weight_kg != null ? `Up to ${result.max_weight_kg} kg` : "Unknown"}</strong></div>
          <div><span>Pet fee</span><strong>{result.pet_fee_inr != null ? `₹${result.pet_fee_inr}` : "Unknown"}</strong></div>
          <div><span>Restaurant</span><strong>{result.restaurant_access === false ? "No" : result.restaurant_access ? "Yes" : "Unknown"}</strong></div>
        </div>
      </div>

      <div className={`policy-result ${result.conflict ? "conflict" : ""}`}>
        <strong>{result.conflict ? "⚠ CONFLICT" : "RESULT"}</strong>
        <p>{result.explanation}</p>
      </div>

      <div className="actions">
        <button className="secondary" onClick={onTry}>Try Compass Check →</button>
      </div>
    </section>
  );
}
