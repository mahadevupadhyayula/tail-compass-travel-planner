import React, { useState } from "react";
import { createTailMemory, highlightsFor } from "../engine/memoryImage.js";

// Optional, emotional, and honest. The output is always labelled as a preview.
export default function TailMemory({ pet, trip, itinerary = [] }) {
  const [ownerPhoto, setOwnerPhoto] = useState(null);
  const [petPhoto, setPetPhoto] = useState(null);
  const [highlight, setHighlight] = useState(highlightsFor(itinerary)[0] || "Beach");
  const [result, setResult] = useState(null);
  const [working, setWorking] = useState(false);

  const readPhoto = setter => event => {
    const file = event.target.files?.[0];
    setter(file ? { name: file.name, url: URL.createObjectURL(file) } : null);
  };

  const create = async () => {
    setWorking(true);
    try {
      setResult(await createTailMemory({ pet, trip, highlight }));
    } finally {
      setWorking(false);
    }
  };

  return (
    <section className="tail-memory">
      <span className="section-kicker">TAIL MEMORY · OPTIONAL</span>
      <h2>Want to create a memory?</h2>
      <p>The practical planning is done. This part is just for the two of you — and it changes nothing about your trip.</p>

      <div className="memory-grid">
        <label>
          Your photo
          <input type="file" accept="image/*" onChange={readPhoto(setOwnerPhoto)} />
          {ownerPhoto && <img className="memory-thumb" src={ownerPhoto.url} alt="Your uploaded photo" />}
        </label>
        <label>
          {pet.name ? `${pet.name}'s photo` : "Pet photo"}
          <input type="file" accept="image/*" onChange={readPhoto(setPetPhoto)} />
          {petPhoto && <img className="memory-thumb" src={petPhoto.url} alt="Your pet's uploaded photo" />}
        </label>
        <label>
          Highlight
          <select value={highlight} onChange={event => setHighlight(event.target.value)}>
            {highlightsFor(itinerary).map(option => <option key={option}>{option}</option>)}
          </select>
        </label>
      </div>

      <button onClick={create} disabled={working}>{working ? "Creating…" : "Create Tail Memory"}</button>

      {result && (
        <figure className="memory-preview">
          <span className="memory-tag">AI-GENERATED TRAVEL PREVIEW</span>
          {result.available ? (
            <img src={result.imageUrl} alt={`${result.caption.title} — an AI-generated preview, not a real photograph`} />
          ) : (
            <div className="memory-collage">
              {ownerPhoto && <img src={ownerPhoto.url} alt="Your uploaded photo" />}
              {petPhoto && <img src={petPhoto.url} alt="Your pet's uploaded photo" />}
              {!ownerPhoto && !petPhoto && <p className="memory-placeholder">Add photos above to see them here.</p>}
            </div>
          )}
          <figcaption>
            <strong>{result.caption.title}</strong>
            {result.caption.route && <p>{result.caption.route}{result.caption.when ? ` · ${result.caption.when}` : ""}</p>}
            <p className="memory-highlight">{result.caption.highlight}</p>
            <small>{result.caption.disclosure}</small>
            {!result.available && <small className="trust-label">{result.notice}</small>}
          </figcaption>
        </figure>
      )}
    </section>
  );
}
