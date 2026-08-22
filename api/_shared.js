import { demoCatalog } from "../server/demoCatalog.mjs";
import { uploadProfilePhoto } from "../server/profilePhotos.mjs";

export function sendJson(response, status, payload) {
  response.status(status).json(payload);
}

export function supabaseAdminConfig() {
  const baseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const apiKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return baseUrl && apiKey ? { baseUrl, apiKey } : null;
}

export async function supabaseAdmin(path, { method = "GET", body, prefer } = {}) {
  const config = supabaseAdminConfig();
  if (!config) throw new Error("Supabase persistence is not configured on Vercel.");
  const result = await fetch(`${config.baseUrl}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: config.apiKey,
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
      ...(prefer ? { Prefer: prefer } : {})
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  if (!result.ok) {
    const detail = await result.text();
    console.error("Supabase request failed", result.status, detail.slice(0, 500));
    throw new Error(`Supabase request failed (${result.status}).`);
  }
  const text = await result.text();
  return text ? JSON.parse(text) : null;
}

export async function saveJourney(payload) {
  const { stage, ids = {}, traveller, trip, itinerary, note, selections = {}, photos = {} } = payload || {};
  if (!traveller?.name || !traveller?.email || !traveller?.petName || !traveller?.petType) throw new Error("Profile is incomplete.");

  const [user] = await supabaseAdmin("app_users?on_conflict=email", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=representation",
    body: { name: traveller.name, email: traveller.email, photo_path: traveller.ownerPhotoPath || null }
  });
  const petRecord = {
    user_id: user.id,
    name: traveller.petName,
    pet_type: traveller.petType,
    breed: traveller.breed,
    size_category: traveller.weightBand,
    estimated_weight_kg: Number(traveller.weight),
    vaccinations: traveller.vaccination,
    vaccination_date: traveller.vaccinationDate,
    care_profile: traveller.careProfile,
    photo_path: traveller.petPhotoPath || null,
    updated_at: new Date().toISOString()
  };
  const [pet] = ids.petId
    ? await supabaseAdmin(`pets?id=eq.${encodeURIComponent(ids.petId)}`, { method: "PATCH", prefer: "return=representation", body: petRecord })
    : await supabaseAdmin("pets", { method: "POST", prefer: "return=representation", body: petRecord });

  const config = supabaseAdminConfig();
  const [ownerPhotoPath, petPhotoPath] = await Promise.all([
    photos.owner ? uploadProfilePhoto({ config, userId: user.id, kind: "owner", photo: photos.owner }) : Promise.resolve(traveller.ownerPhotoPath || user.photo_path || null),
    photos.pet ? uploadProfilePhoto({ config, userId: user.id, petId: pet.id, kind: "pet", photo: photos.pet }) : Promise.resolve(traveller.petPhotoPath || pet.photo_path || null)
  ]);
  if (ownerPhotoPath && ownerPhotoPath !== user.photo_path) {
    await supabaseAdmin(`app_users?id=eq.${encodeURIComponent(user.id)}`, { method: "PATCH", prefer: "return=minimal", body: { photo_path: ownerPhotoPath } });
    user.photo_path = ownerPhotoPath;
  }
  if (petPhotoPath && petPhotoPath !== pet.photo_path) {
    await supabaseAdmin(`pets?id=eq.${encodeURIComponent(pet.id)}`, { method: "PATCH", prefer: "return=minimal", body: { photo_path: petPhotoPath, updated_at: new Date().toISOString() } });
    pet.photo_path = petPhotoPath;
  }

  const tripRecord = {
    user_id: user.id,
    pet_id: pet.id,
    origin: trip?.from || null,
    destination: trip?.to || null,
    start_date: trip?.start || null,
    end_date: trip?.end || null,
    purpose_id: trip?.purpose || null,
    travel_mode: selections.mode || null,
    transport_option_id: selections.operatorId || null,
    stay_option_id: selections.stayId || null,
    selected_activity_ids: selections.activityIds || [],
    status: stage === "approved" ? "approved" : stage === "itinerary" ? "ready_for_review" : "draft",
    updated_at: new Date().toISOString()
  };
  const [savedTrip] = ids.tripId
    ? await supabaseAdmin(`trips?id=eq.${encodeURIComponent(ids.tripId)}`, { method: "PATCH", prefer: "return=representation", body: tripRecord })
    : await supabaseAdmin("trips", { method: "POST", prefer: "return=representation", body: tripRecord });

  let itineraryVersionId = ids.itineraryVersionId || null;
  let generationJobId = ids.generationJobId || null;
  if ((stage === "itinerary" || stage === "approved") && itinerary) {
    const approved = stage === "approved";
    const versionRecord = { trip_id: savedTrip.id, version_number: 1, itinerary_json: itinerary, user_notes: note || null, status: approved ? "approved" : "draft", approved_at: approved ? new Date().toISOString() : null };
    const [version] = await supabaseAdmin("itinerary_versions?on_conflict=trip_id,version_number", { method: "POST", prefer: "resolution=merge-duplicates,return=representation", body: versionRecord });
    itineraryVersionId = version.id;
    if (approved) {
      const stay = demoCatalog.stays.find(item => item.id === savedTrip.stay_option_id);
      const [job] = await supabaseAdmin("generation_jobs?on_conflict=idempotency_key", {
        method: "POST",
        prefer: "resolution=merge-duplicates,return=representation",
        body: {
          trip_id: savedTrip.id,
          itinerary_version_id: version.id,
          idempotency_key: `${savedTrip.id}:${version.id}:personalization-v1`,
          status: "queued",
          progress: 0,
          status_message: "Preparing your journey",
          input_snapshot: { user, pet, trip: { ...savedTrip, stay_name: stay?.name || savedTrip.stay_option_id || "Selected pet-friendly stay" }, itinerary: versionRecord.itinerary_json, notes: note || "" }
        }
      });
      generationJobId = job.id;
    }
  }
  return { userId: user.id, petId: pet.id, tripId: savedTrip.id, itineraryVersionId, generationJobId, ownerPhotoPath: user.photo_path || null, petPhotoPath: pet.photo_path || null };
}

export async function triggerGenerationWorkflow(ids) {
  const webhookUrl = process.env.N8N_WEBHOOK_URL;
  if (!webhookUrl || !ids.generationJobId) return { triggered: false, reason: "not_configured" };
  const result = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(process.env.N8N_WEBHOOK_SECRET ? { "X-Tail-Compass-Secret": process.env.N8N_WEBHOOK_SECRET } : {}) },
    body: JSON.stringify({ job_id: ids.generationJobId, trip_id: ids.tripId, itinerary_version_id: ids.itineraryVersionId })
  });
  if (!result.ok) throw new Error(`n8n webhook returned ${result.status}.`);
  return { triggered: true };
}

export { demoCatalog };

// Vercel treats every file in /api as a route. Keep this module importable by
// the real handlers while returning a harmless response if requested directly.
export default function handler(_request, response) {
  return sendJson(response, 404, { error: "Not found." });
}
