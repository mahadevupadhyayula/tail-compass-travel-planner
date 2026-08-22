import { hasValidJobAccess, readPrivateStorageObject, refreshGeneratedImageUrls, supabaseAdmin } from "../_shared.js";

export default async function handler(request, response) {
  if (request.method !== "GET") return response.status(405).send("Method not allowed.");
  try {
    const jobId = request.query?.id;
    const token = request.query?.token;
    if (!hasValidJobAccess(jobId, token)) return response.status(403).send("This itinerary link is invalid or expired.");
    const jobs = await supabaseAdmin(`generation_jobs?id=eq.${encodeURIComponent(jobId)}&select=status,html_path,generated_images`);
    const job = jobs?.[0];
    if (!job || job.status !== "completed" || !job.html_path) return response.status(404).send("This personalized itinerary is not ready yet.");
    const stored = await readPrivateStorageObject("generated-itineraries", job.html_path);
    const html = await refreshGeneratedImageUrls(await stored.text(), job.generated_images);
    response.setHeader("Content-Type", "text/html; charset=utf-8");
    response.setHeader("Content-Disposition", "inline");
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; img-src data: https:; font-src data: https:; base-uri 'none'; form-action 'none'; frame-ancestors 'self'");
    response.setHeader("Cache-Control", "private, no-store");
    return response.status(200).send(html);
  } catch (error) {
    return response.status(500).send(error.message || "Could not render itinerary.");
  }
}
