import React, { useMemo, useState } from "react";
import { transportOptions } from "../data/transport.js";
import { evaluateTransport } from "../engine/transport.js";
import TransportCard from "./TransportCard";
import CarrierWeightPrompt from "./CarrierWeightPrompt";
import CompareTable from "./CompareTable";

// Step 1 — how should we travel? Every verdict comes from the engine,
// never from text written into this component.
export default function TravelOptions({ pet, trip, setPet, setTrip, onBack, onNext }) {
  const [skippedCarrier, setSkippedCarrier] = useState(false);
  const [sideBySide, setSideBySide] = useState(false);
  const comparing = trip.transport === "Compare options";
  const shown = useMemo(
    () => transportOptions.filter(option => comparing || option.mode === trip.transport),
    [comparing, trip.transport]
  );
  const results = useMemo(
    () => shown.map(option => ({ option, result: evaluateTransport(pet, option) })),
    [shown, pet]
  );

  // Ask for the carrier weight only when it is genuinely the deciding number.
  const needsCarrierWeight = results.some(({ result }) =>
    result.classes.some(item => item.key === "cabin" && item.eligible === null)
  );

  return (
    <section className="card">
      <div className="section-heading">
        <div>
          <span className="section-kicker">HOW SHOULD WE TRAVEL?</span>
          <h2>{comparing ? `${trip.from || "Origin"} → ${trip.to || "Destination"}` : `${trip.transport} option`}</h2>
          <p>Every result shows the rule behind it, where that rule came from, and when we last checked.</p>
        </div>
      </div>

      {needsCarrierWeight && !skippedCarrier && (
        <CarrierWeightPrompt
          pet={pet}
          onSave={value => setPet("carrierWeight")(value)}
          onSkip={() => setSkippedCarrier(true)}
        />
      )}
      {needsCarrierWeight && skippedCarrier && (
        <div className="info-note">
          We can't confirm cabin eligibility without the combined pet and carrier weight, but you can still compare every other option.
        </div>
      )}

      <div className="transport-grid">
        {results.map(({ option, result }) => (
          <TransportCard
            key={option.id}
            option={option}
            result={result}
            selectable={comparing}
            selected={trip.transport === option.mode}
            onSelect={mode => setTrip("transport")(mode)}
          />
        ))}
      </div>

      {comparing && (
        <>
          <button className="link-button" onClick={() => setSideBySide(!sideBySide)} aria-expanded={sideBySide}>
            {sideBySide ? "Hide side-by-side comparison" : "Compare these options side by side"}
          </button>
          {sideBySide && <CompareTable pet={pet} options={shown} />}
        </>
      )}

      <div className="actions">
        <button className="secondary" onClick={onBack}>← Edit trip</button>
        <button onClick={onNext}>Check my trip →</button>
      </div>
    </section>
  );
}
