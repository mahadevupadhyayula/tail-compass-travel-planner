import React from "react";
import { scrollToId } from "../lib/scroll";

export default function Hero() {
  return (
    <section className="hero">
      <div>
        <div className="eyebrow">AI PET TRAVEL COPILOT · INDIA-FIRST</div>
        <h1>Can your pet actually<br /><em>make this trip?</em></h1>
        <p className="hero-tagline">Plan the journey. We'll look after the tail.</p>
        <p>Check travel rules, find compatible options, fix conflicts and build a trip around your pet — with the source and date behind every answer.</p>
        <div className="hero-actions">
          <button onClick={() => scrollToId("trip-form")}>Plan my pet trip</button>
          <button className="secondary" onClick={() => scrollToId("explore")}>Explore pet trips</button>
        </div>
      </div>
      <aside className="hero-card">
        <div className="mini-label">HOW WE ANSWER</div>
        <strong>Evidence, not guesswork.</strong>
        <p>We read the operator's published policy, turn it into structured rules, and let the engine decide — never the model.</p>
        <small>Source-aware decisions · Not a booking guarantee</small>
      </aside>
    </section>
  );
}
