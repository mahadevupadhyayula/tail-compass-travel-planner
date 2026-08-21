import React, { useState } from "react";
import StopRow from "./StopRow";
import IdeasPanel from "./IdeasPanel";
import { makeStop, suggestionsFor } from "../engine/itineraryOps.js";

const TIME_FOR = { Food: "1:00 PM", Care: "4:00 PM", Travel: "9:00 AM", Note: "—", Activity: "10:00 AM", Stay: "7:00 PM" };

export default function DayCard({ day, dayIndex, places, canRemoveDay, actions }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ title: "", type: "Activity" });
  const suggestions = suggestionsFor(day, places);

  const addCustom = () => {
    if (!draft.title.trim()) return;
    actions.addStop(dayIndex, makeStop({ title: draft.title, type: draft.type, time: TIME_FOR[draft.type] }));
    setDraft({ title: "", type: "Activity" });
  };

  return (
    <article className="day-card">
      <header className="day-head">
        <span className="day-badge"><small>DAY</small>{dayIndex + 1}</span>
        <div>
          <h3>{day.destination}</h3>
          {day.date && <p className="day-date">{day.date}</p>}
        </div>
        {canRemoveDay && (
          <button className="icon danger" onClick={() => actions.removeDay(dayIndex)} aria-label={`Remove day ${dayIndex + 1}`}>
            Remove day
          </button>
        )}
      </header>

      {day.stops.length === 0 && <p className="ideas-empty">Nothing planned yet. Add an activity or a note below.</p>}

      <ul className="stop-list">
        {day.stops.map((stop, stopIndex) => (
          <StopRow
            key={stop.id}
            stop={stop}
            index={stopIndex}
            total={day.stops.length}
            onUpdate={patch => actions.updateStop(dayIndex, stopIndex, patch)}
            onRemove={() => actions.removeStop(dayIndex, stopIndex)}
            onMove={delta => actions.moveStop(dayIndex, stopIndex, delta)}
          />
        ))}
      </ul>

      <div className="day-tools">
        <div className="add-stop">
          <input
            value={draft.title}
            placeholder="Add an activity or a note"
            aria-label={`Add to day ${dayIndex + 1}`}
            onChange={event => setDraft({ ...draft, title: event.target.value })}
            onKeyDown={event => event.key === "Enter" && addCustom()}
          />
          <select value={draft.type} onChange={event => setDraft({ ...draft, type: event.target.value })} aria-label="Stop type">
            {["Activity", "Food", "Care", "Travel", "Note"].map(type => <option key={type}>{type}</option>)}
          </select>
          <button className="secondary" onClick={addCustom} disabled={!draft.title.trim()}>Add</button>
        </div>
        <button className="link-button" onClick={() => setOpen(!open)} aria-expanded={open}>
          {open ? "Hide ideas" : `Ideas for this day (${suggestions.length})`}
        </button>
      </div>

      {open && (
        <IdeasPanel
          suggestions={suggestions}
          onAdd={place => actions.addStop(dayIndex, makeStop({
            title: place.name,
            type: place.type === "Food" ? "Food" : "Activity",
            time: TIME_FOR[place.type === "Food" ? "Food" : "Activity"],
            reason: place.reason,
            source: place.provenance?.source ?? null
          }))}
        />
      )}

      <label className="day-note">
        A note for this day
        <textarea
          value={day.note ?? ""}
          placeholder="Anything to remember — shade, water, pace, traffic."
          onChange={event => actions.setDayNote(dayIndex, event.target.value)}
        />
      </label>
    </article>
  );
}
