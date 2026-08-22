import fs from "node:fs";
import path from "node:path";

const source = process.argv[2];
const destination = process.argv[3];
if (!source || !destination) throw new Error("Usage: node scripts/prepare-n8n-workflow.mjs <source.json> <destination.json>");

const workflow = JSON.parse(fs.readFileSync(source, "utf8"));
const node = name => {
  const match = workflow.nodes.find(item => item.name === name);
  if (!match) throw new Error(`Missing node: ${name}`);
  return match;
};

workflow.name = "Tail and Compass — Personalized Itinerary Generator (MVP corrected)";
workflow.active = false;

const webhook = node("Webhook");
webhook.parameters.authentication = "headerAuth";
webhook.credentials = { httpHeaderAuth: { id: "RESELECT_IN_N8N", name: "Tail Compass Webhook Secret" } };

const jobCheck = node("Job Exists & Not Duplicate");
jobCheck.parameters.conditions.conditions.push(
  { id: "trip-matches", leftValue: "={{ $json.trip_id }}", rightValue: "={{ $(\"Webhook\").item.json.body.trip_id }}", operator: { type: "string", operation: "equals" } },
  { id: "not-cancelled", leftValue: "={{ $json.status }}", rightValue: "cancelled", operator: { type: "string", operation: "notEquals" } }
);

const processing = node("Mark Job Processing");
processing.parameters.fieldsUi.fieldValues.push(
  { fieldId: "progress", fieldValue: "10" },
  { fieldId: "status_message", fieldValue: "Preparing your personalized itinerary" }
);

const plan = node("Prepare Image Plan");
plan.parameters.jsCode = plan.parameters.jsCode
  .replace("const prefs = snap.preferences || {};\n", "")
  .replace("[pet.size, pet.breed, pet.type]", "[pet.size_category, pet.breed, pet.pet_type]")
  .replace("String(prefs.notes || '')", "String(snap.notes || '')");

const html = node("Build Itinerary HTML");
html.parameters.jsCode = html.parameters.jsCode
  .replace("const prefs = snap.preferences || {};\n", "")
  .replace("Array.isArray(day.activities) ? day.activities : []", "Array.isArray(day.items) ? day.items : []")
  .replace("[pet.size, pet.breed, pet.type]", "[pet.size_category, pet.breed, pet.pet_type]")
  .replace("trip.stay_name || ''", "trip.stay_name || trip.stay_option_id || 'Selected pet-friendly stay'")
  .replace("prefs.notes || 'No additional notes provided.'", "snap.notes || 'No additional notes provided.'");

const image = node("Generate Image");
image.onError = "continueErrorOutput";

const uploadImage = node("Upload Image to Storage");
uploadImage.onError = "continueErrorOutput";

const pdf = node("HTML to PDF");
pdf.parameters = {
  method: "POST",
  url: "https://api.pdfshift.io/v3/convert/pdf",
  sendBody: true,
  specifyBody: "json",
  jsonBody: "={{ { source: $json.html } }}",
  options: { response: { response: { responseFormat: "file", outputPropertyName: "data" } }, timeout: 120000 }
};
pdf.onError = "continueErrorOutput";

const uploadPdf = node("Upload PDF to Storage");
uploadPdf.onError = "continueErrorOutput";

const completed = node("Mark Job Completed");
completed.parameters.fieldsUi.fieldValues.push(
  { fieldId: "progress", fieldValue: "100" },
  { fieldId: "status_message", fieldValue: "Your personalized itinerary is ready" }
);

const failed = node("Mark Job Failed");
failed.parameters.fieldsUi.fieldValues.push(
  { fieldId: "progress", fieldValue: "0" },
  { fieldId: "status_message", fieldValue: "Itinerary generation needs another try" }
);

const progressImages = {
  name: "Mark Images Generating", type: "n8n-nodes-base.supabase", typeVersion: 1,
  position: [900, 300],
  parameters: { operation: "update", tableId: "generation_jobs", matchType: "allFilters", filters: { conditions: [{ keyName: "id", condition: "eq", keyValue: "={{ $(\"Webhook\").item.json.body.job_id }}" }] }, fieldsUi: { fieldValues: [{ fieldId: "status", fieldValue: "generating_images" }, { fieldId: "progress", fieldValue: "35" }, { fieldId: "status_message", fieldValue: "Creating journey artwork" }] } },
  credentials: processing.credentials
};
const progressPdf = {
  name: "Mark Itinerary Rendering", type: "n8n-nodes-base.supabase", typeVersion: 1,
  position: [1800, 300],
  parameters: { operation: "update", tableId: "generation_jobs", matchType: "allFilters", filters: { conditions: [{ keyName: "id", condition: "eq", keyValue: "={{ $(\"Webhook\").item.json.body.job_id }}" }] }, fieldsUi: { fieldValues: [{ fieldId: "status", fieldValue: "rendering_pdf" }, { fieldId: "progress", fieldValue: "75" }, { fieldId: "status_message", fieldValue: "Designing your PDF" }] } },
  credentials: processing.credentials
};
const fallback = {
  name: "Generic Image Fallback", type: "n8n-nodes-base.code", typeVersion: 2,
  position: [1350, 500],
  parameters: { jsCode: `const plan = $('Prepare Image Plan').item.json;\nconst mode = String($('Get Generation Job').first().json.input_snapshot?.trip?.travel_mode || 'travel');\nconst pet = String($('Get Generation Job').first().json.input_snapshot?.pet?.pet_type || 'pet');\nconst title = encodeURIComponent('Tail & Compass');\nconst subtitle = encodeURIComponent('A happy ' + pet + ' ' + mode + ' journey');\nconst svg = '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="700"><rect width="1200" height="700" fill="#fff4e6"/><circle cx="600" cy="275" r="145" fill="#ed7b19"/><text x="600" y="305" text-anchor="middle" font-size="72" fill="#4a2412">' + pet.charAt(0).toUpperCase() + '</text><text x="600" y="505" text-anchor="middle" font-family="Georgia" font-size="52" fill="#4a2412">' + decodeURIComponent(title) + '</text><text x="600" y="570" text-anchor="middle" font-family="Arial" font-size="28" fill="#8a5a2b">' + decodeURIComponent(subtitle) + '</text></svg>';\nreturn [{ json: { scene: plan.scene, scene_label: plan.scene_label, caption: plan.caption, storage_path: null, image_data_uri: 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64'), used_fallback: true } }];` }
};
workflow.nodes.push(progressImages, progressPdf, fallback);

workflow.connections["Mark Job Processing"] = { main: [[{ node: "Mark Images Generating", type: "main", index: 0 }]] };
workflow.connections["Mark Images Generating"] = { main: [[{ node: "Prepare Image Plan", type: "main", index: 0 }]] };
workflow.connections["Generate Image"] = { main: [[{ node: "Upload Image to Storage", type: "main", index: 0 }], [{ node: "Generic Image Fallback", type: "main", index: 0 }]] };
workflow.connections["Upload Image to Storage"] = { main: [[{ node: "Record Image Result", type: "main", index: 0 }], [{ node: "Generic Image Fallback", type: "main", index: 0 }]] };
workflow.connections["Generic Image Fallback"] = { main: [[{ node: "Aggregate Images", type: "main", index: 0 }]] };
workflow.connections["Aggregate Images"] = { main: [[{ node: "Mark Itinerary Rendering", type: "main", index: 0 }]] };
workflow.connections["Mark Itinerary Rendering"] = { main: [[{ node: "Build Itinerary HTML", type: "main", index: 0 }]] };

const aggregate = node("Aggregate Images");
aggregate.parameters.jsCode = aggregate.parameters.jsCode.replace(".filter(it => it.json && it.json.storage_path)", ".filter(it => it.json && it.json.image_data_uri)");

fs.mkdirSync(path.dirname(destination), { recursive: true });
fs.writeFileSync(destination, JSON.stringify(workflow, null, 2) + "\n");
console.log(`Prepared ${destination}`);
