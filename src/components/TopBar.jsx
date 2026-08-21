import React from "react";
import logo from "../assets/logo.png";
import { scrollToId } from "../lib/scroll";

export default function TopBar({ onReset, planning }) {
  return (
    <header className="topbar">
      <button className="brand" onClick={onReset} aria-label="Tail Compass — back to the start">
        <img src={logo} alt="" />
        Tail Compass
      </button>
      <nav aria-label="Main">
        {!planning && <button className="nav-link" onClick={() => scrollToId("how-it-works")}>How it works</button>}
        {!planning && <button className="nav-link" onClick={() => scrollToId("explore")}>Explore trips</button>}
        {planning && <button className="nav-link" onClick={onReset}>Start over</button>}
        <button className="nav-cta" onClick={() => scrollToId("trip-form")}>Plan my trip</button>
      </nav>
    </header>
  );
}
