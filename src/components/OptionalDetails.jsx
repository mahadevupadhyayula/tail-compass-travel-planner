import React from "react";
import { OPTIONAL_GROUPS, filledOptional } from "../data/petFields.js";

// "Ask only what we need. Ask more only when it changes the answer."
// Everything in here is skippable, and each field says why it exists.
function OptionalField({ field, value, onChange }) {
  const common = { id: `opt-${field.key}`, value: value ?? "", onChange: event => onChange(event.target.value) };
  return (
    <label htmlFor={common.id}>
      {field.label}
      {field.type === "select"
        ? <select {...common}>{field.options.map(option => <option key={option}>{option}</option>)}</select>
        : <input {...common} type={field.type} step={field.step} inputMode={field.type === "number" ? "decimal" : undefined} />}
      <small className="field-why">{field.why}</small>
    </label>
  );
}

export default function OptionalDetails({ pet, setPet, trip, setTrip }) {
  const filled = filledOptional(pet, trip);

  return (
    <details className="optional-details">
      <summary>
        Add details for a more personalised plan
        <span className="optional-count">
          {filled.length ? `${filled.length} added — all optional` : "Optional — skip this and continue"}
        </span>
      </summary>

      {OPTIONAL_GROUPS.map(group => (
        <fieldset className="optional-group" key={group.id}>
          <legend>{group.title}</legend>
          <div className="grid">
            {group.fields.map(field => (
              <OptionalField
                key={field.key}
                field={field}
                value={field.scope === "trip" ? trip[field.key] : pet[field.key]}
                onChange={field.scope === "trip" ? setTrip(field.key) : setPet(field.key)}
              />
            ))}
          </div>
        </fieldset>
      ))}
    </details>
  );
}
