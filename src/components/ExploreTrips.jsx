import React from "react";
import { curatedTrips } from "../data/destinations.js";
import { VerificationBadge } from "./SourceLine";

export default function ExploreTrips({ onGoa }) {
  return (
    <section id="explore" className="explore">
      <div className="section-heading">
        <div>
          <span className="section-kicker">EXPLORE PET TRIPS</span>
          <h2>Start with a route, then check it for your pet</h2>
          <p>These are discovery prompts, not booking listings or live availability.</p>
        </div>
      </div>
      <div className="transport-grid">
        {curatedTrips.map(trip => (
          <article className="transport-card" key={trip.id}>
            <VerificationBadge status={trip.provenance.verificationStatus} />
            <h3>{trip.destination}</h3>
            <strong>{trip.tripType}</strong>
            <p>{trip.highlight}</p>
            <small>Approximate duration: {trip.duration}</small>
            {trip.id === "goa-demo" && <button className="secondary" onClick={onGoa}>Try this demo route</button>}
          </article>
        ))}
      </div>
      <div className="evidence-note">
        <strong>Travel stories, when available, will be user-supplied or verified.</strong> This MVP does not fabricate testimonials.
      </div>
    </section>
  );
}
