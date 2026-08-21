import React from "react";

export const steps = ["Trip check", "Travel options", "Trip status", "Itinerary", "Prepare"];

export default function StepNav({ step }) {
  return (
    <>
      <nav className="steps" aria-label="Trip planning progress">
        {steps.map((label, index) => (
          <div className={index <= step ? "step active" : "step"} key={label}>
            <span>{index + 1}</span>{label}
          </div>
        ))}
      </nav>
      <div className="progress"><div style={{ width: `${step / 4 * 100}%` }} /></div>
    </>
  );
}
