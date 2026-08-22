import { sendJson, supabaseAdmin } from "./_shared.js";

export default async function handler(request, response) {
  if (request.method !== "GET") return sendJson(response, 405, { error: "Method not allowed." });
  try {
    const rows = await supabaseAdmin("public_itinerary_showcases?select=id,title,route,date_label,travel_mode,pet_summary,stay_summary,published_at&is_published=eq.true&order=published_at.desc&limit=3");
    return sendJson(response, 200, { itineraries: (rows || []).map(item => ({ id: item.id, title: item.title, route: item.route, dateLabel: item.date_label, travelMode: item.travel_mode, petSummary: item.pet_summary, staySummary: item.stay_summary })) });
  } catch (error) {
    return sendJson(response, 500, { error: error.message || "Could not load recent itineraries." });
  }
}
