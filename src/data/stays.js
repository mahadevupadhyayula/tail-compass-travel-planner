import { demo } from "./provenance.js";

// Stays carry structured constraints, never prose the engine has to interpret.
// Every row here is synthetic seed data and says so.
export const stays = [
  {
    id: "goa-garden-hotel", name: "Goa Garden Hotel", type: "Stay", city: "Goa",
    petAllowed: true, maxWeightKg: 20, minWeightKg: null,
    speciesAllowed: ["dog", "cat"], breedRestrictions: [],
    petFee: 1000, restaurantAccess: false,
    notes: "Pets are not permitted inside the restaurant.",
    provenance: demo("Demo policy dataset")
  },
  {
    id: "demo-pet-resort-goa", name: "Demo Pet Resort Goa", type: "Stay", city: "Goa",
    petAllowed: true, maxWeightKg: 30, minWeightKg: null,
    speciesAllowed: ["dog", "cat"], breedRestrictions: [],
    petFee: 1200, restaurantAccess: true,
    notes: "Larger dogs accepted. Pets allowed in the garden dining area.",
    provenance: demo("Demo policy dataset")
  }
];
