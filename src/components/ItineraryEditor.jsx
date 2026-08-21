import React, { useState } from "react";
import DayCard from "./DayCard";
import * as ops from "../engine/itineraryOps.js";

// The day list plus every edit operation, wired to the pure functions in
// src/engine/itineraryOps.js. No itinerary content is written into this file.
export default function ItineraryEditor({ itinerary, setItinerary, places }) {
  const [destination, setDestination] = useState("");

  const actions = {
    addStop: (dayIndex, stop) => setItinerary(days => ops.addStop(days, dayIndex, stop)),
    updateStop: (dayIndex, stopIndex, patch) => setItinerary(days => ops.updateStop(days, dayIndex, stopIndex, patch)),
    removeStop: (dayIndex, stopIndex) => setItinerary(days => ops.removeStop(days, dayIndex, stopIndex)),
    moveStop: (dayIndex, stopIndex, delta) => setItinerary(days => ops.moveStop(days, dayIndex, stopIndex, delta)),
    setDayNote: (dayIndex, note) => setItinerary(days => ops.setDayNote(days, dayIndex, note)),
    removeDay: dayIndex => setItinerary(days => ops.removeDay(days, dayIndex))
  };

  const addDestination = () => {
    if (!destination.trim()) return;
    setItinerary(days => ops.addDestination(days, destination));
    setDestination("");
  };

  return (
    <>
      <div className="itinerary-tools">
        <div className="add-stop">
          <input
            value={destination}
            placeholder="Add a destination (adds a day)"
            aria-label="Add a destination"
            onChange={event => setDestination(event.target.value)}
            onKeyDown={event => event.key === "Enter" && addDestination()}
          />
          <button onClick={addDestination} disabled={!destination.trim()}>+ Add destination</button>
        </div>
        <p className="trust-label">
          Suggestions come only from places we hold data for. We will not invent a hotel, cafe or attraction.
        </p>
      </div>

      {itinerary.map((day, dayIndex) => (
        <DayCard
          key={day.id ?? day.day}
          day={day}
          dayIndex={dayIndex}
          places={places}
          canRemoveDay={itinerary.length > 1}
          actions={actions}
        />
      ))}
    </>
  );
}
