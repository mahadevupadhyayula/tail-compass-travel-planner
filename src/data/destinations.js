import { curated, demo, notVerified } from "./provenance.js";

// Discovery destinations are shown so users can explore. Showing a destination
// is NOT a claim that we hold verified pet data for it.
export const discoveryDestinations = [
  "Goa", "Kerala", "Bengaluru", "Mumbai", "Delhi", "Chennai",
  "Pune", "Hyderabad", "Jaipur", "Pondicherry", "Ooty", "Coorg"
];

export const curatedTrips = [
  {
    id: "goa-demo", destination: "Goa", tripType: "Road escape", duration: "3 days",
    from: "Hyderabad", highlight: "Planned road breaks and a stay compatibility check",
    highlights: ["Beach walk", "Pet-friendly cafe", "Shaded park"],
    hasDataset: true,
    provenance: demo("Demo trip dataset")
  },
  {
    id: "coorg-discovery", destination: "Coorg", tripType: "Discovery route", duration: "Plan required",
    from: null, highlight: "No pet-place rules are verified for this destination yet",
    highlights: [], hasDataset: false,
    provenance: notVerified("No verified pet data for this destination")
  },
  {
    id: "ooty-discovery", destination: "Ooty", tripType: "Discovery route", duration: "Plan required",
    from: null, highlight: "No pet-place rules are verified for this destination yet",
    highlights: [], hasDataset: false,
    provenance: notVerified("No verified pet data for this destination")
  },
  {
    id: "pondicherry-discovery", destination: "Pondicherry", tripType: "Discovery route", duration: "Plan required",
    from: null, highlight: "No pet-place rules are verified for this destination yet",
    highlights: [], hasDataset: false,
    provenance: notVerified("No verified pet data for this destination")
  },
  {
    id: "kerala-discovery", destination: "Kerala", tripType: "Discovery route", duration: "Plan required",
    from: null, highlight: "No pet-place rules are verified for this destination yet",
    highlights: [], hasDataset: false,
    provenance: notVerified("No verified pet data for this destination")
  }
];

// Which destinations we actually hold a dataset for. Everything else is discovery only.
export const supportedDestinations = ["Goa"];
export const hasDataset = city => supportedDestinations.includes(city);

export const preparationTasks = [
  { id: "confirm-policy", label: "Confirm the property's pet policy before booking.", provenance: curated("Tail Compass preparation guidance") },
  { id: "carry-records", label: "Carry vaccination and identification records.", provenance: curated("Tail Compass preparation guidance") },
  { id: "pack-kit", label: "Pack food, water, leash, waste bags and medication.", provenance: curated("Tail Compass preparation guidance") },
  { id: "save-vet", label: "Save the emergency vet contact before departure.", provenance: curated("Tail Compass preparation guidance") },
  { id: "plan-breaks", label: "Plan regular travel breaks for the pet.", provenance: curated("Tail Compass preparation guidance") }
];
