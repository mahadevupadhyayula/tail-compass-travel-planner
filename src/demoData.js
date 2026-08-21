// Compatibility surface. The real datasets now live in src/data/*.
// Keep importing from here if you only need "the demo trip"; import from
// src/data/* directly when you need one specific dataset.

import { stays } from "./data/stays.js";
import { activities, support } from "./data/activities.js";
import { buildItineraryPlan } from "./engine/itinerary.js";

export { transportOptions, findTransport, hasStatedRules } from "./data/transport.js";
export { stays } from "./data/stays.js";
export { activities, support, placesFor } from "./data/activities.js";
export { curatedTrips, discoveryDestinations, preparationTasks, supportedDestinations, hasDataset } from "./data/destinations.js";
export { stories } from "./data/stories.js";
export * from "./data/provenance.js";

// Everything the readiness engine may evaluate or select from.
export const places = [...stays, ...activities, ...support];

export const demoPet = {
  name: "Bruno", species: "Dog", breed: "Golden Retriever", age: "5",
  weight: "24", carrierWeight: "", energy: "High", needs: "None"
};

export const demoTrip = {
  from: "Hyderabad", to: "Goa", start: "2026-12-12", end: "2026-12-14",
  transport: "Car", budget: "30000"
};

export const defaultAccommodationId = "goa-garden-hotel";

export const samplePolicy = "Dogs are welcome. Pets above 20 kg are not permitted. A pet fee of INR 1000 applies. Pets are not permitted inside the restaurant.";

// The default plan, generated from data rather than written by hand.
export const itineraryTemplate = buildItineraryPlan({
  trip: demoTrip,
  stay: stays.find(place => place.id === defaultAccommodationId),
  places: [...activities, ...support],
  transportMode: demoTrip.transport
});
