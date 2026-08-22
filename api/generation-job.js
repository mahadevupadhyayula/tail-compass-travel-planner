import { hasValidJobAccess, sendJson, supabaseAdmin } from "./_shared.js";

export default async function handler(request, response) {
  if (request.method !== "GET") return sendJson(response, 405, { error: "Method not allowed." });
  try {
    const jobId = request.query?.id;
    const token = request.query?.token;
    if (!hasValidJobAccess(jobId, token)) return sendJson(response, 403, { error: "This job link is invalid or expired." });
    const jobs = await supabaseAdmin(`generation_jobs?id=eq.${encodeURIComponent(jobId)}&select=id,status,progress,status_message,error_message,pdf_path,html_path,completed_at`);
    const job = jobs?.[0];
    if (!job) return sendJson(response, 404, { error: "Generation job not found." });
    const query = `id=${encodeURIComponent(jobId)}&token=${encodeURIComponent(token)}`;
    return sendJson(response, 200, {
      ...job,
      htmlViewerUrl: job.status === "completed" && job.html_path ? `/api/generation-job/html?${query}` : null,
      pdfDownloadUrl: job.status === "completed" && job.pdf_path ? `/api/generation-job/pdf?${query}` : null,
      signedHtmlUrl: null,
      signedPdfUrl: null
    });
  } catch (error) {
    return sendJson(response, 500, { error: error.message || "Could not read generation status." });
  }
}
