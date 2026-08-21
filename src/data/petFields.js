// The optional-detail model. Nothing here is required to get an answer;
// each field exists because it can change a decision later.
// "why" is shown to the user so the form never feels like data collection.

export const OPTIONAL_GROUPS = [
  {
    id: "identity", title: "About your pet", icon: "paw",
    fields: [
      { key: "name", label: "Pet name", type: "text", why: "So the plan reads like it is about them." },
      { key: "breed", label: "Breed", type: "text", why: "Some stays and operators restrict specific breeds." },
      { key: "age", label: "Age (years)", type: "number", why: "Airlines set a minimum age; young pets travel differently." },
      { key: "count", label: "Number of pets", type: "number", why: "Most stays and cabins limit how many pets travel together." }
    ]
  },
  {
    id: "carrier", title: "Size and carrier", icon: "crate",
    fields: [
      { key: "carrierWeight", label: "Carrier weight (kg)", type: "number", step: "0.1", why: "Cabin limits are measured with the carrier included." },
      { key: "carrierAvailable", label: "Carrier available", type: "select", options: ["Not sure", "Yes", "No"], why: "Decides whether cabin travel is even on the table." }
    ]
  },
  {
    id: "documents", title: "Documents", icon: "doc",
    fields: [
      { key: "vaccination", label: "Vaccination status", type: "select", options: ["Not sure", "Up to date", "Due", "None"], why: "Operators ask for an up-to-date record." },
      { key: "rabiesDate", label: "Rabies vaccination date", type: "date", why: "Often must fall inside a stated window before travel." },
      { key: "microchip", label: "Microchipped", type: "select", options: ["Not sure", "Yes", "No"], why: "Required for some routes and border crossings." },
      { key: "healthCertificate", label: "Health certificate", type: "select", options: ["Not sure", "Have one", "Not yet"], why: "Airlines list a fitness-to-fly certificate." }
    ]
  },
  {
    id: "wellbeing", title: "Comfort and behaviour", icon: "heart",
    fields: [
      { key: "anxiety", label: "Anxiety or behaviour notes", type: "text", why: "Changes the pace we build into the itinerary." },
      { key: "needs", label: "Special needs", type: "text", why: "Medication, mobility or diet needs shape the checklist." }
    ]
  },
  {
    id: "preferences", title: "Trip preferences", icon: "sliders",
    fields: [
      { key: "budget", label: "Budget (INR)", type: "number", scope: "trip", why: "Filters stays once we hold price data." },
      { key: "stayPreference", label: "Accommodation preference", type: "select", scope: "trip", options: ["No preference", "Hotel", "Resort", "Homestay"], why: "Narrows which stays we check first." },
      { key: "activityPreference", label: "Activity preference", type: "select", scope: "trip", options: ["No preference", "Beach", "Park", "Cafes", "Quiet"], why: "Shapes what the itinerary suggests." }
    ]
  }
];

// Which optional answers we actually have, for the "you told us" summary.
export function filledOptional(pet, trip) {
  const filled = [];
  for (const group of OPTIONAL_GROUPS) {
    for (const field of group.fields) {
      const source = field.scope === "trip" ? trip : pet;
      const value = source?.[field.key];
      const meaningful = value !== undefined && value !== null && String(value).trim() !== ""
        && !["Not sure", "No preference"].includes(value);
      if (meaningful) filled.push({ ...field, value });
    }
  }
  return filled;
}
