import { hasValidJobAccess, readPrivateStorageObject, sendJson, supabaseAdmin } from "../_shared.js";

export default async function handler(request, response) {
  if (request.method !== "GET") return sendJson(response, 405, { error: "Method not allowed." });
  try {
    const jobId = request.query?.id;
    const token = request.query?.token;
    if (!hasValidJobAccess(jobId, token)) return sendJson(response, 403, { error: "This job link is invalid or expired." });
    const jobs = await supabaseAdmin(`generation_jobs?id=eq.${encodeURIComponent(jobId)}&select=status,pdf_path`);
    const job = jobs?.[0];
    if (!job || job.status !== "completed" || !job.pdf_path) return sendJson(response, 404, { error: "The personalized PDF is not available yet." });
    const stored = await readPrivateStorageObject("generated-itineraries", job.pdf_path);
    const bytes = Buffer.from(await stored.arrayBuffer());
    response.setHeader("Content-Type", "application/pdf");
    response.setHeader("Content-Disposition", "attachment; filename=tail-and-compass-itinerary.pdf");
    response.setHeader("Content-Length", String(bytes.length));
    response.setHeader("Cache-Control", "private, no-store");
    return response.status(200).send(bytes);
  } catch (error) {
    return sendJson(response, 500, { error: error.message || "Could not download itinerary PDF." });
  }
}
