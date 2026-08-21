import { demo } from "./provenance.js";

// Activities, food stops and support services. The itinerary builder draws from
// this list; nothing about a day is hard-coded into a component.
// timeOfDay drives ordering: "morning" | "midday" | "afternoon" | "evening" | "any"
export const activities = [
  {
    id: "beach-walk", name: "Dog-Friendly Beach Walk", type: "Activity", category: "Beach",
    city: "Goa", petAllowed: true, durationMin: 60, timeOfDay: "morning",
    reason: "Open space and cooler sand early in the day.",
    provenance: demo("Demo activity dataset")
  },
  {
    id: "coconut-park", name: "Coconut Grove Park", type: "Activity", category: "Park",
    city: "Goa", petAllowed: true, durationMin: 60, timeOfDay: "evening",
    reason: "Shaded walking loop for the cooler part of the day.",
    provenance: demo("Demo activity dataset")
  },
  {
    id: "paws-plates", name: "Paws & Plates Cafe", type: "Food", category: "Cafe",
    city: "Goa", petAllowed: true, durationMin: 60, timeOfDay: "midday",
    reason: "Outdoor seating where pets are welcome.",
    provenance: demo("Demo place dataset")
  }
];

export const support = [
  {
    id: "goa-vet", name: "Goa Emergency Vet Centre", type: "Vet", category: "Emergency vet",
    city: "Goa", petAllowed: true, phone: null,
    reason: "Nearest emergency contact for the selected destination.",
    provenance: demo("Demo vet dataset")
  }
];

// One list for anything the readiness engine or itinerary builder may select from.
export const placesFor = city => [...activities, ...support].filter(place => !city || place.city === city);
