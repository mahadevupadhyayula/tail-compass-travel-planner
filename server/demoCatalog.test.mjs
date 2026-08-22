import assert from "node:assert/strict";
import { demoCatalog } from "./demoCatalog.mjs";

assert.equal(demoCatalog.scenarios.length, 4);
assert.ok(demoCatalog.transportOptions.filter(option => option.mode === "air").length >= 3);
assert.ok(demoCatalog.stays.length >= 4);
assert.ok(demoCatalog.purposes.length >= 5);
assert.ok(demoCatalog.transportOptions.every(option => option.petTypes.every(type => ["Dog", "Cat"].includes(type))));
assert.ok(demoCatalog.transportOptions.some(option => option.scenarioKeys.includes("large_dog")));
assert.ok(demoCatalog.transportOptions.some(option => option.scenarioKeys.includes("small_dog")));
assert.ok(demoCatalog.transportOptions.some(option => option.scenarioKeys.includes("cat")));
assert.ok(demoCatalog.transportOptions.some(option => option.specialNeeds && option.scenarioKeys.includes("special_needs")));
assert.ok(demoCatalog.vaccinationRequirements.some(rule => rule.petTypes.includes("Dog")));
assert.ok(demoCatalog.vaccinationRequirements.some(rule => rule.petTypes.includes("Cat")));

console.log("Demo catalog tests passed (four scenarios + travel, stay, purpose and vaccination coverage).");
