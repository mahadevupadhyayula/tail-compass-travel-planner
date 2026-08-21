import React from "react";
import { activities, support } from "../data/activities.js";
import { stays } from "../data/stays.js";
import { demoTrip } from "../demoData";
import { buildItineraryPlan } from "../engine/itinerary.js";

// Generated on render from the same builder the product uses.
export default function ItineraryPreview({ onTry }) {
  const plan = buildItineraryPlan({
    trip: demoTrip,
    stay: stays[1],
    places: [...activities, ...support],
    transportMode: demoTrip.transport
  });
  const day = plan[1] ?? plan[0];

  return (
    <section className="card itinerary-preview">
      <div className="section-heading">
        <div>
          <span className="section-kicker">ITINERARY PREVIEW</span>
          <h2>A day built around your pet's pace</h2>
          <p>Generated from structured data — activities in the cool hours, a rest window in the heat, and a reason on every stop.</p>
        </div>
        <span className="demo-pill">GENERATED</span>
      </div>

      <article className="day-card preview">
        <header className="day-head">
          <span className="day-badge"><small>DAY</small>2</span>
          <div>
            <h3>{day.destination}</h3>
            {day.date && <p className="day-date">{day.date}</p>}
          </div>
        </header>
        <ul className="stop-list">
          {day.stops.map(stop => (
            <li className="stop" key={stop.id}>
              <time>{stop.time}</time>
              <div className="stop-body">
                <div className="stop-title">
                  <strong>{stop.title}</strong>
                  <span className={`type-chip ${stop.type.toLowerCase()}`}>{stop.type}</span>
                </div>
                <p>{stop.reason}</p>
              </div>
            </li>
          ))}
        </ul>
      </article>

      <div className="actions">
        <button className="secondary" onClick={onTry}>Build my itinerary →</button>
      </div>
    </section>
  );
}
