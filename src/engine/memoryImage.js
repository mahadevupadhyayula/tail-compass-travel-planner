// Tail Memory image generation, behind an abstraction.
//
// No image provider is wired up in this MVP. Rather than pretend, the client asks
// the server whether one is configured. If not, we show a clearly-labelled
// composition of the user's own uploads instead of an invented photograph.
//
// To connect a provider later: implement /api/tail-memory in server.mjs and
// return { available: true, imageUrl }. Nothing else in the app needs to change.

export const MEMORY_HIGHLIGHTS = ["Beach", "Park", "Cafe", "Landmark", "Destination"];

// Offer highlights the trip actually contains, then the generic set.
export function highlightsFor(itinerary = []) {
  const fromPlan = itinerary
    .flatMap(day => day.stops)
    .filter(stop => stop.type === "Activity" || stop.type === "Food")
    .map(stop => stop.title);
  return [...new Set([...fromPlan, ...MEMORY_HIGHLIGHTS])].slice(0, 10);
}

export function memoryCaption({ pet, trip, highlight }) {
  const name = pet?.name?.trim() || "Your pet";
  const month = (() => {
    const date = new Date(`${trip?.start}T00:00:00`);
    return Number.isNaN(date.valueOf())
      ? null
      : date.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  })();
  return {
    title: `${name}'s ${trip?.to || "trip"} adventure`,
    route: trip?.from && trip?.to ? `${trip.from} → ${trip.to}` : null,
    when: month,
    highlight,
    // Shown verbatim on the card. It must never read as a real photograph.
    disclosure: "AI-generated travel preview — not a photograph from the trip."
  };
}

export async function createTailMemory({ pet, trip, highlight, signal } = {}) {
  const caption = memoryCaption({ pet, trip, highlight });
  try {
    const response = await fetch("/api/tail-memory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ highlight, destination: trip?.to ?? null }),
      signal
    });
    const payload = await response.json().catch(() => null);
    if (response.ok && payload?.available && payload.imageUrl) {
      return { available: true, imageUrl: payload.imageUrl, caption };
    }
    return { available: false, caption, notice: payload?.notice || "Image generation is not connected in this MVP." };
  } catch {
    return { available: false, caption, notice: "Image generation is not connected in this MVP." };
  }
}
