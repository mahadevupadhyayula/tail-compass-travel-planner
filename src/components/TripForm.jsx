import React from "react";
import Field from "./Field";
import OptionalDetails from "./OptionalDetails";

// Step 0 — the minimum we need to give a real answer. Six fields, nothing more.
const REQUIRED = [
  { key: "weight", scope: "pet", label: "your pet's weight" },
  { key: "from", scope: "trip", label: "where you're travelling from" },
  { key: "to", scope: "trip", label: "where you're going" },
  { key: "start", scope: "trip", label: "a start date" },
  { key: "end", scope: "trip", label: "an end date" }
];

export default function TripForm({ pet, setPet, trip, setTrip, onDemo, onNext }) {
  const missing = REQUIRED.filter(field => {
    const value = field.scope === "pet" ? pet[field.key] : trip[field.key];
    return !String(value ?? "").trim();
  });
  const datesBackwards = trip.start && trip.end && trip.end < trip.start;
  const blocked = missing.length > 0 || datesBackwards;

  return (
    <section id="trip-form" className="card">
      <div className="section-heading">
        <div>
          <span className="section-kicker">CAN WE TRAVEL?</span>
          <h2>Tell us only what changes the answer</h2>
          <p>Six things is enough to start. Everything else is optional, and we'll ask for it only if it affects a decision.</p>
        </div>
        <button className="secondary" onClick={onDemo}>Try Bruno's demo trip</button>
      </div>

      <div className="grid">
        <label htmlFor="species">
          Species<b> *</b>
          <select id="species" value={pet.species} onChange={event => setPet("species")(event.target.value)}>
            <option>Dog</option>
            <option>Cat</option>
            <option>Other</option>
          </select>
        </label>
        <Field label="Weight (kg)" required type="number" value={pet.weight} onChange={setPet("weight")} />
        <Field label="From" required value={trip.from} onChange={setTrip("from")} />
        <Field label="To" required value={trip.to} onChange={setTrip("to")} />
        <Field label="Start date" required type="date" value={trip.start} onChange={setTrip("start")} />
        <Field label="End date" required type="date" value={trip.end} onChange={setTrip("end")} />
        <label htmlFor="transport">
          Transport preference
          <select id="transport" value={trip.transport} onChange={event => setTrip("transport")(event.target.value)}>
            <option>Compare options</option>
            <option>Flight</option>
            <option>Train</option>
            <option>Car</option>
            <option>Bus</option>
          </select>
        </label>
      </div>

      <OptionalDetails pet={pet} setPet={setPet} trip={trip} setTrip={setTrip} />

      {blocked && (
        <p className="info-note" role="status">
          {datesBackwards
            ? "Your end date is before your start date."
            : `We still need ${missing.map(field => field.label).join(", ").replace(/, ([^,]*)$/, " and $1")}.`}
        </p>
      )}

      <div className="actions">
        <button disabled={blocked} onClick={onNext}>Can we travel? →</button>
      </div>
    </section>
  );
}
