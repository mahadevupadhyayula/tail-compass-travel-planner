// Safe, fictional catalog records for the guided happy-path demo.
// Every row is explicitly DEMO so it can never be mistaken for live policy data.
export const demoCatalog = {
  source: "local-demo",
  scenarios: [
    { key: "large_dog", label: "Large dog", description: "Large dog matched to hold/cargo or rail options with suitable stays." },
    { key: "small_dog", label: "Small dog", description: "Small dog matched to cabin-friendly and flexible stay options." },
    { key: "cat", label: "Cat", description: "Cat matched to carrier-aware travel and quiet stays." },
    { key: "special_needs", label: "Special needs or service animal", description: "Dog or cat requiring accessibility, medication or service-animal review." }
  ],
  transportOptions: [
    { id: "northstar-air", mode: "air", operator: "Northstar Air (demo)", petTypes: ["Dog", "Cat"], minWeightKg: 0, maxWeightKg: 8, handling: "Cabin", specialNeeds: false, serviceAnimal: true, status: "DEMO", summary: "Cabin-sized pets; service-animal review available.", scenarioKeys: ["small_dog", "cat", "special_needs"] },
    { id: "coastlink-air", mode: "air", operator: "CoastLink Air (demo)", petTypes: ["Dog", "Cat"], minWeightKg: 8, maxWeightKg: 32, handling: "Checked hold", specialNeeds: true, serviceAnimal: true, status: "DEMO", summary: "Medium and large pets with approved crate and health documents.", scenarioKeys: ["large_dog", "special_needs"] },
    { id: "companion-cargo", mode: "air", operator: "Companion Cargo (demo)", petTypes: ["Dog", "Cat"], minWeightKg: 20, maxWeightKg: 60, handling: "Cargo", specialNeeds: true, serviceAnimal: false, status: "DEMO", summary: "Large-animal logistics with veterinary clearance.", scenarioKeys: ["large_dog", "special_needs"] },
    { id: "first-ac-coupe", mode: "rail", operator: "First AC Coupe (demo)", petTypes: ["Dog", "Cat"], minWeightKg: 0, maxWeightKg: null, handling: "Private coupe", specialNeeds: true, serviceAnimal: true, status: "DEMO", summary: "Private-coupe path requiring operator confirmation.", scenarioKeys: ["large_dog", "small_dog", "cat", "special_needs"] },
    { id: "private-road", mode: "road", operator: "Private road journey", petTypes: ["Dog", "Cat"], minWeightKg: 0, maxWeightKg: null, handling: "Private vehicle", specialNeeds: true, serviceAnimal: true, status: "CURATED", summary: "Flexible breaks and direct control of comfort.", scenarioKeys: ["large_dog", "small_dog", "cat", "special_needs"] }
  ],
  stays: [
    { id: "garden-house", name: "Goa Garden House (demo)", area: "Assagao", petTypes: ["Dog"], maxWeightKg: 40, specialNeeds: true, serviceAnimal: true, purposes: ["relax", "family"], status: "DEMO", summary: "Private garden, ground-floor access and medication fridge." },
    { id: "quiet-casa", name: "Quiet Casa (demo)", area: "Morjim", petTypes: ["Cat", "Dog"], maxWeightKg: 12, specialNeeds: true, serviceAnimal: true, purposes: ["workation", "relax"], status: "DEMO", summary: "Quiet rooms, screened balcony and low-traffic setting." },
    { id: "trail-lodge", name: "Trailside Lodge (demo)", area: "Netravali", petTypes: ["Dog"], maxWeightKg: 45, specialNeeds: false, serviceAnimal: true, purposes: ["outdoor"], status: "DEMO", summary: "Large-dog rooms near shaded walking routes." },
    { id: "accessible-retreat", name: "Accessible Retreat (demo)", area: "Panjim", petTypes: ["Dog", "Cat"], maxWeightKg: null, specialNeeds: true, serviceAnimal: true, purposes: ["care", "family", "workation"], status: "DEMO", summary: "Step-free access, quiet zone and nearby veterinary support." }
  ],
  purposes: [
    { id: "relax", label: "A relaxed coastal break", description: "Low-pressure days, cooler walks and long rest windows.", scenarioKeys: ["large_dog", "small_dog", "cat"] },
    { id: "family", label: "A family visit", description: "Flexible plans around a known home base.", scenarioKeys: ["large_dog", "small_dog", "cat", "special_needs"] },
    { id: "workation", label: "A quiet workation", description: "Quiet rooms, reliable rest and short nearby activities.", scenarioKeys: ["small_dog", "cat", "special_needs"] },
    { id: "outdoor", label: "An outdoor adventure", description: "Shaded trails, recovery time and larger-dog access.", scenarioKeys: ["large_dog", "small_dog"] },
    { id: "care", label: "A care-focused stay", description: "Veterinary proximity, medication storage and accessible pacing.", scenarioKeys: ["special_needs"] }
  ],
  vaccinationRequirements: [
    { id: "core-dog", petTypes: ["Dog"], appliesTo: ["air", "rail", "stay"], vaccinations: ["Rabies", "DHPP"], recencyDays: 365, status: "DEMO" },
    { id: "core-cat", petTypes: ["Cat"], appliesTo: ["air", "rail", "stay"], vaccinations: ["Rabies", "FVRCP"], recencyDays: 365, status: "DEMO" }
  ]
};
