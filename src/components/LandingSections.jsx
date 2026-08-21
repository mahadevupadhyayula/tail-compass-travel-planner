import React from "react";
import HowItWorks from "./HowItWorks";
import RealExample from "./RealExample";
import CompassCheckIntro from "./CompassCheckIntro";
import ExploreTrips from "./ExploreTrips";
import Stories from "./Stories";
import ItineraryPreview from "./ItineraryPreview";
import { scrollToId } from "../lib/scroll";

// Everything below the fold on first visit. Hidden once planning starts,
// so the journey itself stays uncluttered — especially on a phone.
export default function LandingSections({ onDemo }) {
  const toForm = () => scrollToId("trip-form");

  return (
    <>
      <HowItWorks />
      <RealExample onTry={onDemo} />
      <CompassCheckIntro onTry={onDemo} />
      <ExploreTrips onGoa={onDemo} />
      <Stories />
      <ItineraryPreview onTry={toForm} />

      <section className="card tail-memory-intro">
        <div className="section-heading">
          <div>
            <span className="section-kicker">TAIL MEMORY · OPTIONAL</span>
            <h2>And when the planning is done</h2>
            <p>
              Add your photo and your pet's, pick a highlight from your own itinerary, and keep something from the trip.
              Always labelled as a preview — never presented as a photograph.
            </p>
          </div>
        </div>
      </section>

      <section className="final-cta">
        <div>
          <h2>Start with the trip, not the paperwork</h2>
          <p>Six answers is all it takes to find out whether your pet can actually make this journey.</p>
        </div>
        <button onClick={toForm}>Plan my pet trip</button>
      </section>
    </>
  );
}
