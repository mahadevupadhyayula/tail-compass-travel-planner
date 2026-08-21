// The itinerary is GENERATED from structured data. No day, stop or time is
// hard-coded into a component. Given a trip, a stay and a place dataset,
// this produces the same plan every time — no randomness, so demos are repeatable.

const SLOTS = {
  depart: "7:00 AM", breakfast: "8:00 AM", morning: "10:00 AM", break1: "10:30 AM",
  midday: "1:00 PM", rest: "4:00 PM", evening: "6:00 PM", checkIn: "7:00 PM",
  finalWalk: "10:00 AM", checkOut: "11:00 AM", returnTrip: "12:00 PM"
};

const stop = (id, time, title, type, reason, extra = {}) => ({
  id, time, title, type, reason,
  petFriendly: extra.petFriendly ?? true,
  source: extra.source ?? null,
  locked: extra.locked ?? false
});

const fromPlace = (place, time) => stop(
  `place-${place.id}`, time, place.name,
  place.type === "Food" ? "Food" : "Activity",
  place.reason || `Curated ${place.category || place.type} stop.`,
  { source: place.provenance?.source ?? null }
);

export function tripDayCount(trip, max = 14) {
  const start = new Date(`${trip?.start}T00:00:00Z`);
  const end = new Date(`${trip?.end}T00:00:00Z`);
  if (Number.isNaN(start.valueOf()) || Number.isNaN(end.valueOf())) return 3;
  const days = Math.round((end - start) / 86_400_000) + 1;
  return Math.min(Math.max(days, 1), max);
}

export function dayDate(trip, index) {
  const start = new Date(`${trip?.start}T00:00:00Z`);
  if (Number.isNaN(start.valueOf())) return null;
  const date = new Date(start.getTime() + index * 86_400_000);
  return date.toISOString().slice(0, 10);
}

const pick = (list, index) => (list.length ? list[index % list.length] : null);

export function buildItineraryPlan({ trip, stay, places = [], transportMode = "Car" }) {
  const total = tripDayCount(trip);
  const city = trip?.to || "your destination";
  const origin = trip?.from || "home";
  const available = places.filter(place => place.petAllowed !== false && (!trip?.to || !place.city || place.city === trip.to));
  const mornings = available.filter(place => place.timeOfDay === "morning");
  const middays = available.filter(place => place.type === "Food");
  const evenings = available.filter(place => place.timeOfDay === "evening");
  const travelling = transportMode === "Car" || transportMode === "Bus";

  const days = [];
  for (let index = 0; index < total; index += 1) {
    const isFirst = index === 0;
    const isLast = index === total - 1 && total > 1;
    const stops = [];

    if (isFirst) {
      stops.push(stop("depart", SLOTS.depart, `Leave ${origin}`, "Travel", travelling
        ? "Start early for a calmer, cooler journey."
        : "Allow extra time at the terminal for pet check-in."));
      if (travelling) {
        stops.push(stop("break-1", SLOTS.break1, "Pet break", "Care", "Water, toilet and a short stretch."));
        stops.push(stop("break-2", SLOTS.rest, "Rest stop", "Care", "Keep your pet comfortable on the road."));
      }
      if (stay) {
        stops.push(stop("check-in", SLOTS.checkIn, `Check-in at ${stay.name}`, "Stay",
          `Selected stay: ${stay.name}.`, { source: stay.provenance?.source ?? null, locked: true }));
      }
    } else if (isLast) {
      stops.push(stop("last-breakfast", SLOTS.breakfast, "Breakfast", "Food", "Begin the day at an easy pace."));
      stops.push(stop("final-walk", SLOTS.finalWalk, "Final walk", "Care", "Let your pet stretch before leaving."));
      if (stay) {
        stops.push(stop("check-out", SLOTS.checkOut, `Check-out from ${stay.name}`, "Stay",
          "Leave the selected stay.", { source: stay.provenance?.source ?? null, locked: true }));
      }
      stops.push(stop("return", SLOTS.returnTrip, `Return to ${origin}`, "Travel",
        travelling ? "Plan regular pet breaks on the way back." : "Allow extra time for pet check-in."));
    } else {
      stops.push(stop("breakfast", SLOTS.breakfast, "Breakfast", "Food", "Begin the day at an easy pace."));
      const morning = pick(mornings, index - 1);
      if (morning) stops.push(fromPlace(morning, SLOTS.morning));
      const lunch = pick(middays, index - 1);
      if (lunch) stops.push(fromPlace(lunch, SLOTS.midday));
      stops.push(stop("rest", SLOTS.rest, "Rest", "Care", "A recovery window in the warmest part of the day."));
      const evening = pick(evenings, index - 1);
      if (evening) stops.push(fromPlace(evening, SLOTS.evening));
    }

    days.push({
      id: `day-${index + 1}`,
      day: `Day ${index + 1}`,
      date: dayDate(trip, index),
      destination: isFirst && total > 1 ? `${origin} → ${city}` : isLast ? `${city} → ${origin}` : city,
      stops: stops.map((item, position) => ({ ...item, id: `${item.id}-${index + 1}-${position}` }))
    });
  }
  return days;
}
