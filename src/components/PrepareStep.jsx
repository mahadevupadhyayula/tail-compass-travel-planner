import React from "react";
import { preparationTasks } from "../data/destinations.js";
import TailMemory from "./TailMemory";

// Step 4
export default function PrepareStep({ pet, trip, itinerary, onBack, onReset }) {
  return (
    <section className="card">
      <div className="section-heading">
        <div>
          <span className="section-kicker">PREPARE</span>
          <h2>Before you leave</h2>
          <p>Practical basics for your selected trip.</p>
        </div>
        <span className="status compatible">PLAN READY</span>
      </div>
      {preparationTasks.map(item => (
        <label className="check" key={item.id}><input type="checkbox" />{item.label}</label>
      ))}
      <TailMemory pet={pet} trip={trip} itinerary={itinerary} />
      <div className="actions">
        <button className="secondary" onClick={onBack}>← Back</button>
        <button onClick={onReset}>Plan another trip</button>
      </div>
    </section>
  );
}
