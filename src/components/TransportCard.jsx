import React from "react";
import SourceLine, { VerificationBadge } from "./SourceLine";
import { STATUS_LABEL, STATUS_TONE } from "../engine/transport.js";

const MARK = { true: "✓", false: "✕", null: "?" };

export default function TransportCard({ option, result, selectable, selected, onSelect }) {
  const tone = STATUS_TONE[result.status];
  return (
    <article className={`transport-card${selected ? " selected" : ""}`}>
      <div className="card-top">
        <span className={`status-pill ${tone}`}>{STATUS_LABEL[result.status]}</span>
        <VerificationBadge status={option.provenance.verificationStatus} />
      </div>

      <h3>{option.name}</h3>
      <p className="operator">{option.operator}</p>
      <p className="summary">{result.summary}</p>

      {result.classes.length > 0 && (
        <ul className="class-list">
          {result.classes.map(item => (
            <li key={item.key} className={item.eligible === true ? "ok" : item.eligible === false ? "block" : "info"}>
              <span className="mark" aria-hidden="true">{MARK[String(item.eligible)]}</span>
              <span className="sr-status">
                {item.eligible === true ? "Possible" : item.eligible === false ? "Not possible" : "Needs information"}:
              </span>
              <div>
                <strong>{item.label}</strong>
                <span>{item.reason}</span>
              </div>
            </li>
          ))}
        </ul>
      )}

      <details className="why">
        <summary>Why this result?</summary>
        <div className="why-body">
          <p>{option.reason}</p>
          {result.guidance.length > 0 && (
            <ul>{result.guidance.map(line => <li key={line}>{line}</li>)}</ul>
          )}
          {result.documents.length > 0 && (
            <>
              <strong>Documents this operator lists</strong>
              <ul>{result.documents.map(line => <li key={line}>{line}</li>)}</ul>
            </>
          )}
          {result.routeExclusions.length > 0 && (
            <>
              <strong>Route limits</strong>
              <ul>{result.routeExclusions.map(line => <li key={line}>{line}</li>)}</ul>
            </>
          )}
          <SourceLine record={option} />
        </div>
      </details>

      {selectable && (
        <button className="secondary" onClick={() => onSelect(option.mode)}>Use {option.name}</button>
      )}
    </article>
  );
}
