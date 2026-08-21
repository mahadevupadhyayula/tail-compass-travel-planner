import React, { useState } from "react";

// One stop in a day. Editing is inline; reordering uses buttons rather than
// drag-and-drop so it works with a keyboard and on a phone.
export default function StopRow({ stop, index, total, onUpdate, onRemove, onMove }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(stop);

  const startEdit = () => { setDraft(stop); setEditing(true); };
  const save = () => { onUpdate({ time: draft.time, title: draft.title, reason: draft.reason, type: draft.type }); setEditing(false); };

  if (editing) {
    return (
      <li className="stop editing">
        <div className="stop-edit">
          <label>Time<input value={draft.time} onChange={event => setDraft({ ...draft, time: event.target.value })} /></label>
          <label>What<input value={draft.title} onChange={event => setDraft({ ...draft, title: event.target.value })} /></label>
          <label>
            Type
            <select value={draft.type} onChange={event => setDraft({ ...draft, type: event.target.value })}>
              {["Activity", "Food", "Care", "Travel", "Stay", "Note"].map(type => <option key={type}>{type}</option>)}
            </select>
          </label>
          <label className="wide">Note<input value={draft.reason} onChange={event => setDraft({ ...draft, reason: event.target.value })} /></label>
        </div>
        <div className="stop-actions">
          <button onClick={save} disabled={!draft.title.trim()}>Save</button>
          <button className="secondary" onClick={() => setEditing(false)}>Cancel</button>
        </div>
      </li>
    );
  }

  return (
    <li className="stop">
      <time>{stop.time}</time>
      <div className="stop-body">
        <div className="stop-title">
          <strong>{stop.title}</strong>
          <span className={`type-chip ${stop.type.toLowerCase()}`}>{stop.type}</span>
        </div>
        {stop.reason && <p>{stop.reason}</p>}
        {stop.source && <small className="trust-label">From: {stop.source}</small>}
      </div>
      <div className="stop-actions">
        <button className="icon" onClick={() => onMove(-1)} disabled={index === 0} aria-label={`Move ${stop.title} earlier`}>↑</button>
        <button className="icon" onClick={() => onMove(1)} disabled={index === total - 1} aria-label={`Move ${stop.title} later`}>↓</button>
        <button className="icon" onClick={startEdit} aria-label={`Edit ${stop.title}`}>Edit</button>
        <button
          className="icon danger" onClick={onRemove} disabled={stop.locked}
          aria-label={stop.locked ? `${stop.title} is linked to your stay and cannot be removed` : `Remove ${stop.title}`}
          title={stop.locked ? "Linked to your selected stay" : "Remove this stop"}
        >Remove</button>
      </div>
    </li>
  );
}
