import React from "react";
import { STATUS_LABEL, evaluateTransport } from "../engine/transport.js";
import { statusLabel } from "../data/provenance.js";

// Side-by-side comparison. Every cell is either something a source states,
// or an explicit "Not verified" — never a rating we invented.
const ROWS = [
  {
    label: "Pet eligibility",
    value: (option, result) => STATUS_LABEL[result.status]
  },
  {
    label: "What decides it",
    value: (option, result) => result.classes.length
      ? result.classes.map(item => `${item.label}: ${item.eligible === true ? "possible" : item.eligible === false ? "no" : "needs info"}`).join(" · ")
      : "No published weight rule we have read"
  },
  {
    label: "Documents listed",
    value: (option, result) => result.documents.length ? `${result.documents.length} listed` : "None stated"
  },
  {
    label: "Flexibility",
    value: option => option.flexibility ?? "Not verified"
  },
  {
    label: "Complexity",
    value: option => option.complexity ?? "Not verified"
  },
  {
    label: "Evidence",
    value: option => statusLabel(option.provenance.verificationStatus)
  },
  {
    label: "Last checked",
    value: option => option.provenance.lastVerified || "Not verified"
  }
];

export default function CompareTable({ pet, options }) {
  const evaluated = options.map(option => ({ option, result: evaluateTransport(pet, option) }));

  return (
    <div className="compare-wrap">
      <table className="compare">
        <caption>
          Comparison of travel modes for {pet.name?.trim() || "your pet"}. Blank or "Not verified" means we have not
          read a source — it never means allowed.
        </caption>
        <thead>
          <tr>
            <th scope="col">What we compared</th>
            {evaluated.map(({ option }) => <th scope="col" key={option.id}>{option.name}</th>)}
          </tr>
        </thead>
        <tbody>
          {ROWS.map(row => (
            <tr key={row.label}>
              <th scope="row">{row.label}</th>
              {evaluated.map(({ option, result }) => <td key={option.id}>{row.value(option, result)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
