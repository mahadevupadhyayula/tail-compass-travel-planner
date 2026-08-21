import React from "react";
import ItineraryEditor from "./ItineraryEditor";
import { placesFor } from "../data/activities.js";

// Step 3 — the plan, generated from data and then made yours.
export default function ItineraryStep({ pet, trip, itinerary, setItinerary, onBack, onNext }) {
  const stops = itinerary.reduce((total, day) => total + day.stops.length, 0);

  return (
    <section className="card">
      <div className="section-heading">
        <div>
          <span className="section-kicker">TAIL ITINERARY</span>
          <h2>{pet.name ? `${pet.name}'s ${trip.to} itinerary` : `Your ${trip.to} itinerary`}</h2>
          <p>
            {itinerary.length} {itinerary.length === 1 ? "day" : "days"} · {stops} stops · built around your pet's pace.
            Add, edit, reorder or remove anything.
          </p>
        </div>
        <span className="demo-pill">STRUCTURED PLAN</span>
      </div>

      <ItineraryEditor itinerary={itinerary} setItinerary={setItinerary} places={placesFor(trip.to)} />

      <div className="actions">
        <button className="secondary" onClick={onBack}>← Back</button>
        <button onClick={onNext}>Preparation checklist →</button>
      </div>
    </section>
  );
}
