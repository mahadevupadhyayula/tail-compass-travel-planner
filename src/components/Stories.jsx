import React from "react";
import { stories } from "../data/stories.js";

// Tail Compass does not invent testimonials. Seed content is labelled as an example
// and attributed to us, not to a traveller who does not exist.
export default function Stories() {
  const real = stories.filter(story => story.kind === "USER_SUPPLIED");

  return (
    <section className="card stories">
      <div className="section-heading">
        <div>
          <span className="section-kicker">PET PARENTS TRAVELLED HERE</span>
          <h2>Evidence, not marketing</h2>
          <p>
            {real.length
              ? `${real.length} traveller ${real.length === 1 ? "story" : "stories"} shared so far.`
              : "No traveller has shared a story yet, so we have none to show. The card below is written by us, and says so."}
          </p>
        </div>
      </div>

      <div className="story-grid">
        {stories.map(story => (
          <article className="story" key={story.id}>
            <span className={`source-badge ${story.kind === "USER_SUPPLIED" ? "trusted" : "demo"}`}>{story.label}</span>
            <h3>{story.destination}</h3>
            <p>{story.body}</p>
            <small className="trust-label">— {story.author}</small>
          </article>
        ))}
      </div>
    </section>
  );
}
