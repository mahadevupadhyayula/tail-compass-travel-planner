import React from "react";

const STEPS = [
  { n: 1, title: "Tell us six things", body: "Species, weight, where from, where to, when, and how you'd like to travel. That is enough to begin." },
  { n: 2, title: "We check the rules", body: "Published operator policies and stay constraints, turned into structured rules with a source and a date." },
  { n: 3, title: "We fix what blocks you", body: "Conflicts get explained, alternatives get offered, and the itinerary rebuilds itself around the choice you make." }
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="card how-it-works-cards">
      <div className="section-heading">
        <div>
          <span className="section-kicker">HOW IT WORKS</span>
          <h2>Guidance, not guesswork</h2>
          <p>Pet + trip + published policies = a plan you can actually act on.</p>
        </div>
      </div>
      <div className="how-grid">
        {STEPS.map(step => (
          <article key={step.n}>
            <span className="chain-step">{step.n}</span>
            <strong>{step.title}</strong>
            <p>{step.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
