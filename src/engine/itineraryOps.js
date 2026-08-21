// Pure edit operations on a generated itinerary. Every one returns a new array,
// so undo/redo or state history stays possible later. Travel-focused only:
// add a destination, add an activity, add a note, edit, remove, reorder.

let sequence = 0;
const nextId = prefix => { sequence += 1; return `${prefix}-${sequence}`; };

const replaceDay = (days, index, changes) =>
  days.map((day, position) => (position === index ? { ...day, ...changes } : day));

export const STOP_TYPES = ["Activity", "Food", "Care", "Travel", "Stay", "Note"];

export function makeStop({ time = "12:00 PM", title, type = "Activity", reason = "", source = null, petFriendly = true }) {
  return { id: nextId("custom"), time, title: title.trim(), type, reason: reason.trim(), source, petFriendly, locked: false };
}

export function addStop(days, dayIndex, stop) {
  const day = days[dayIndex];
  if (!day) return days;
  return replaceDay(days, dayIndex, { stops: [...day.stops, stop] });
}

export function updateStop(days, dayIndex, stopIndex, patch) {
  const day = days[dayIndex];
  if (!day?.stops[stopIndex]) return days;
  return replaceDay(days, dayIndex, {
    stops: day.stops.map((stop, position) => (position === stopIndex ? { ...stop, ...patch } : stop))
  });
}

export function removeStop(days, dayIndex, stopIndex) {
  const day = days[dayIndex];
  if (!day?.stops[stopIndex]) return days;
  return replaceDay(days, dayIndex, { stops: day.stops.filter((_, position) => position !== stopIndex) });
}

// Reordering by one position. Keyboard-friendly, unlike drag-and-drop.
export function moveStop(days, dayIndex, stopIndex, delta) {
  const day = days[dayIndex];
  const target = stopIndex + delta;
  if (!day?.stops[stopIndex] || target < 0 || target >= day.stops.length) return days;
  const stops = [...day.stops];
  [stops[stopIndex], stops[target]] = [stops[target], stops[stopIndex]];
  return replaceDay(days, dayIndex, { stops });
}

export function setDayNote(days, dayIndex, note) {
  return days[dayIndex] ? replaceDay(days, dayIndex, { note }) : days;
}

// Adding a destination appends a day and renumbers, so labels never drift.
export function addDestination(days, destination) {
  const clean = destination.trim();
  if (!clean) return days;
  const day = { id: nextId("day"), day: `Day ${days.length + 1}`, date: null, destination: clean, stops: [], note: "" };
  return renumber([...days, day]);
}

export function removeDay(days, dayIndex) {
  return days.length <= 1 ? days : renumber(days.filter((_, position) => position !== dayIndex));
}

export function renumber(days) {
  return days.map((day, index) => ({ ...day, day: `Day ${index + 1}` }));
}

// Which curated places are not already on this day.
export function suggestionsFor(day, places) {
  const present = new Set(day.stops.map(stop => stop.title.toLowerCase()));
  return places.filter(place => place.petAllowed !== false && !present.has(place.name.toLowerCase()));
}
