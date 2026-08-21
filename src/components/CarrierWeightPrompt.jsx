import React, { useState } from "react";

// A progressive question. It appears only when the answer would change a decision,
// and skipping it never blocks the rest of the journey.
export default function CarrierWeightPrompt({ pet, onSave, onSkip }) {
  const [value, setValue] = useState(pet.carrierWeight || "");
  const valid = Number(value) > 0;

  return (
    <div className="progressive-question">
      <span className="section-kicker">ONE MORE THING</span>
      <h3>Do you know your pet and carrier's combined weight?</h3>
      <p>The cabin limit is measured with the carrier included, so this is the only number that decides it.</p>
      <div className="question-actions">
        <label>
          Carrier weight (kg)
          <input
            type="number" min="0" step="0.1" inputMode="decimal" value={value}
            onChange={event => setValue(event.target.value)}
            placeholder="e.g. 2.5"
          />
        </label>
        <button disabled={!valid} onClick={() => onSave(value)}>Use this weight</button>
        <button className="secondary" onClick={onSkip}>I don't know</button>
      </div>
    </div>
  );
}
