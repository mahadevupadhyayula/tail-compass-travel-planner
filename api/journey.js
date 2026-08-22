import { createHmac } from "node:crypto";
import { saveJourney, sendJson, supabaseAdminConfig, triggerGenerationWorkflow } from "./_shared.js";

export default async function handler(request, response) {
  if (request.method !== "POST") return sendJson(response, 405, { error: "Method not allowed." });
  try {
    const payload = typeof request.body === "string" ? JSON.parse(request.body) : request.body;
    if (!supabaseAdminConfig()) return sendJson(response, 503, { persisted: false, error: "Supabase environment variables are missing on Vercel." });
    const ids = await saveJourney(payload);
    let workflow = { triggered: false, reason: "not_approved" };
    if (payload.stage === "approved") {
      try { workflow = await triggerGenerationWorkflow(ids); }
      catch (error) { workflow = { triggered: false, reason: error.message }; }
    }
    const secret = process.env.JOB_STATUS_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
    let jobAccessToken = null;
    if (ids.generationJobId && secret) {
      const expiresAt = Math.floor(Date.now() / 1000) + (2 * 60 * 60);
      jobAccessToken = `${expiresAt}.${createHmac("sha256", secret).update(`${ids.generationJobId}.${expiresAt}`).digest("hex")}`;
    }
    return sendJson(response, 200, { persisted: true, source: "supabase", ids, workflow, jobAccessToken });
  } catch (error) {
    return sendJson(response, 400, { persisted: false, error: error.message || "Could not save journey." });
  }
}
