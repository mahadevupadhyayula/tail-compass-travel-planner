import assert from "node:assert/strict";
import {
  addDestination, addStop, makeStop, moveStop, removeDay, removeStop,
  setDayNote, suggestionsFor, updateStop
} from "./itineraryOps.js";
import { buildItineraryPlan } from "./itinerary.js";
import { activities } from "../data/activities.js";
import { stays } from "../data/stays.js";

const trip = { from: "Hyderabad", to: "Goa", start: "2026-12-12", end: "2026-12-14", transport: "Car" };
const base = buildItineraryPlan({ trip, stay: stays[0], places: activities, transportMode: "Car" });

// Operations never mutate the input.
const snapshot = JSON.stringify(base);
addStop(base, 1, makeStop({ title: "Sunset walk" }));
assert.equal(JSON.stringify(base), snapshot, "addStop mutated its input");

// Add an activity.
const added = addStop(base, 1, makeStop({ title: "Sunset walk", time: "6:30 PM", reason: "Cooler by then." }));
assert.equal(added[1].stops.length, base[1].stops.length + 1);
assert.equal(added[1].stops.at(-1).title, "Sunset walk");
assert.ok(added[1].stops.at(-1).id, "new stop has no id");

// Ids stay unique so React keys never collide.
const twice = addStop(added, 1, makeStop({ title: "Sunset walk" }));
const ids = twice.flatMap(day => day.stops.map(stop => stop.id));
assert.equal(new Set(ids).size, ids.length, "duplicate stop ids");

// Edit and remove.
assert.equal(updateStop(base, 0, 0, { title: "Leave early" })[0].stops[0].title, "Leave early");
assert.equal(removeStop(base, 1, 0)[1].stops.length, base[1].stops.length - 1);
assert.equal(removeStop(base, 9, 0), base, "out-of-range remove should be a no-op");

// Reorder.
const [first, second] = base[1].stops;
const moved = moveStop(base, 1, 0, 1);
assert.equal(moved[1].stops[0].id, second.id);
assert.equal(moved[1].stops[1].id, first.id);
assert.equal(moveStop(base, 1, 0, -1), base, "cannot move the first stop up");
assert.equal(moveStop(base, 1, base[1].stops.length - 1, 1), base, "cannot move the last stop down");

// Notes.
assert.equal(setDayNote(base, 0, "Start early")[0].note, "Start early");

// Add a destination, and day labels stay in sequence.
const extended = addDestination(base, "Gokarna");
assert.equal(extended.length, base.length + 1);
assert.equal(extended.at(-1).destination, "Gokarna");
assert.deepEqual(extended.map(day => day.day), ["Day 1", "Day 2", "Day 3", "Day 4"]);
assert.equal(addDestination(base, "   "), base, "blank destination should be a no-op");

// Removing a day renumbers, and the last day cannot be removed.
assert.deepEqual(removeDay(extended, 1).map(day => day.day), ["Day 1", "Day 2", "Day 3"]);
assert.equal(removeDay([extended[0]], 0).length, 1);

// Suggestions exclude what is already planned.
const day2 = base[1];
const suggested = suggestionsFor(day2, activities);
assert.ok(suggested.every(place => !day2.stops.some(stop => stop.title === place.name)));
assert.ok(suggestionsFor({ stops: [] }, activities).length === activities.length);

console.log("Itinerary edit tests passed.");
