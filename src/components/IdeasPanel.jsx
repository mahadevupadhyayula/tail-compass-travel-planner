import React from "react";
import { statusLabel } from "../data/provenance.js";

// Suggestions come from the curated dataset only. Tail Compass never invents a place.
export default function IdeasPanel({ suggestions, onAdd }) {
  if (!suggestions.length) {
    return <p className="ideas-empty">Everything we hold for this destination is already in your plan.</p>;
  }
  return (
    <div className="ideas">
      <span className="section-kicker">IDEAS FROM OUR DATASET</span>
      <ul>
        {suggestions.map(place => (
          <li key={place.id}>
            <div>
              <strong>{place.name}</strong>
              <span>{place.reason}</span>
              <small className="trust-label">
                {place.category || place.type} · {place.durationMin ? `${place.durationMin} min · ` : ""}
                {statusLabel(place.provenance.verificationStatus)}
              </small>
            </div>
            <button className="secondary" onClick={() => onAdd(place)}>Add</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
