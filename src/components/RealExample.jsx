import React from "react";
import { findTransport } from "../data/transport.js";
import { stays } from "../data/stays.js";
import { evaluateTransport } from "../engine/transport.js";
import { evaluatePlace } from "../readiness.js";
import { demoPet } from "../demoData";
import SourceLine from "./SourceLine";

// Nothing here is written by hand. Every number is computed by the same engine
// the live product uses, from the same source-backed data.
export default function RealExample({ onTry }) {
  const flight = evaluateTransport(demoPet, findTransport("Flight"));
  const cabin = flight.classes.find(item => item.key === "cabin");
  const blockedStay = stays[0];
  const stayCheck = evaluatePlace(demoPet, blockedStay);
  const alternative = stays.find(stay => evaluatePlace(demoPet, stay).status === "COMPATIBLE");

  return (
    <section className="card real-example">
      <div className="section-heading">
        <div>
          <span className="section-kicker">A REAL EXAMPLE</span>
          <h2>Bruno is 24 kg. Hyderabad to Goa.</h2>
          <p>These results are produced live by the same engine you're about to use — not written into this page.</p>
        </div>
      </div>

      <ol className="example-chain">
        <li>
          <span className="chain-step">1</span>
          <div>
            <strong>The published rule</strong>
            <p>{cabin?.reason}</p>
            <SourceLine record={findTransport("Flight")} />
          </div>
        </li>
        <li>
          <span className="chain-step">2</span>
          <div>
            <strong>What that means</strong>
            <p>{flight.summary}</p>
          </div>
        </li>
        <li className="conflict">
          <span className="chain-step">3</span>
          <div>
            <strong>The stay conflicts too</strong>
            <p>{stayCheck.reason}</p>
            <SourceLine record={blockedStay} />
          </div>
        </li>
        <li className="resolved">
          <span className="chain-step">4</span>
          <div>
            <strong>Course corrected</strong>
            <p>{alternative ? evaluatePlace(demoPet, alternative).reason : "No compatible stay in this dataset."}</p>
            {alternative && <SourceLine record={alternative} />}
          </div>
        </li>
      </ol>

      <div className="actions">
        <button onClick={onTry}>Run this trip yourself →</button>
      </div>
    </section>
  );
}
