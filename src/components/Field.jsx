import React from "react";

export default function Field({ label, value, onChange, type = "text", required }) {
  return (
    <label>
      {label}{required && <b> *</b>}
      <input required={required} type={type} value={value} onChange={event => onChange(event.target.value)} />
    </label>
  );
}
