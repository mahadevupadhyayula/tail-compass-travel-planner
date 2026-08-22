import http from "node:http";
import fs from "node:fs";
import { createHmac, timingSafeEqual } from "node:crypto";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createServer as createViteServer } from "vite";
import { extractPolicyWithAI } from "./server/policyExtractor.mjs";
import { demoCatalog } from "./server/demoCatalog.mjs";
import { uploadProfilePhoto } from "./server/profilePhotos.mjs";

if (fs.existsSync(".env")) {
  for (const line of fs.readFileSync(".env", "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
}

const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
const execFileAsync = promisify(execFile);

function sendJson(response, status, payload) {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(payload));
}

function sendHtml(response, status, html) {
  response.writeHead(status, {
    "Content-Type": "text/html; charset=utf-8",
    "Content-Disposition": "inline",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; img-src data: https:; font-src data: https:; base-uri 'none'; form-action 'none'; frame-ancestors 'self'",
    "Cache-Control": "private, no-store"
  });
  response.end(html);
}

function sendPdf(response, pdf) {
  response.writeHead(200, {
    "Content-Type": "application/pdf",
    "Content-Disposition": "attachment; filename=tail-and-compass-itinerary.pdf",
    "Content-Length": pdf.length,
    "Cache-Control": "private, no-store"
  });
  response.end(pdf);
}

function readJson(request, maxBytes = 1_000_000) {
  return new Promise((resolve, reject) => {
    let body = "";
    let rejected = false;
    request.on("data", chunk => {
      if (rejected) return;
      body += chunk;
      if (Buffer.byteLength(body) > maxBytes) {
        rejected = true;
        reject(new Error("Request too large."));
      }
    });
    request.on("end", () => {
      if (rejected) return;
      try { resolve(JSON.parse(body)); } catch { reject(new Error("Invalid JSON.")); }
    });
    request.on("error", reject);
  });
}

function supabaseAdminConfig() {
  const baseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const apiKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return baseUrl && apiKey ? { baseUrl, apiKey } : null;
}

async function supabaseAdmin(path, { method = "GET", body, prefer } = {}) {
  const config = supabaseAdminConfig();
  if (!config) throw new Error("Supabase persistence is not configured.");
  const response = await fetch(`${config.baseUrl}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: config.apiKey,
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
      ...(prefer ? { Prefer: prefer } : {})
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  if (!response.ok) throw new Error(`Supabase request failed (${response.status}).`);
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

function jobTokenSecret() {
  return process.env.JOB_STATUS_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
}

function createJobAccessToken(jobId) {
  const expiresAt = Math.floor(Date.now() / 1000) + (2 * 60 * 60);
  const signature = createHmac("sha256", jobTokenSecret()).update(`${jobId}.${expiresAt}`).digest("hex");
  return `${expiresAt}.${signature}`;
}

function hasValidJobAccess(jobId, token) {
  if (!jobId || !token || !jobTokenSecret()) return false;
  const [expiresAt, supplied] = token.split(".");
  if (!expiresAt || !supplied || Number(expiresAt) < Math.floor(Date.now() / 1000)) return false;
  const expected = createHmac("sha256", jobTokenSecret()).update(`${jobId}.${expiresAt}`).digest("hex");
  const left = Buffer.from(supplied);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

async function createSignedStorageUrl(bucket, objectPath) {
  const config = supabaseAdminConfig();
  if (!config || !bucket || !objectPath) return null;
  const encodedPath = objectPath.split("/").map(encodeURIComponent).join("/");
  const response = await fetch(`${config.baseUrl}/storage/v1/object/sign/${encodeURIComponent(bucket)}/${encodedPath}`, {
    method: "POST",
    headers: { apikey: config.apiKey, Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn: 600 })
  });
  if (!response.ok) throw new Error(`Could not sign stored file (${response.status}).`);
  const result = await response.json();
  const signedPath = result.signedURL || result.signedUrl;
  if (!signedPath) throw new Error("Supabase did not return a signed file URL.");
  return signedPath.startsWith("http") ? signedPath : `${config.baseUrl}/storage/v1${signedPath}`;
}

function createSignedItineraryUrl(objectPath) {
  return createSignedStorageUrl("generated-itineraries", objectPath);
}

async function refreshGeneratedImageUrls(html, generatedImages) {
  const images = Array.isArray(generatedImages) ? generatedImages.filter((image) => image?.storage_path) : [];
  if (!images.length) return html;
  const signedUrls = await Promise.all(images.map((image) => createSignedStorageUrl("profile-images", image.storage_path)));
  let imageIndex = 0;
  return html.replace(/(<figure\b[^>]*class=["'][^"']*\bphoto\b[^"']*["'][^>]*>[\s\S]*?<img\b[^>]*\bsrc=["'])([^"']*)(["'])/gi, (match, before, _oldUrl, quote) => {
    const signedUrl = signedUrls[imageIndex++];
    return signedUrl ? `${before}${signedUrl}${quote}` : match;
  });
}

async function readPrivateItineraryHtml(objectPath) {
  const config = supabaseAdminConfig();
  if (!config || !objectPath) throw new Error("Generated HTML is not available.");
  const encodedPath = objectPath.split("/").map(encodeURIComponent).join("/");
  const response = await fetch(`${config.baseUrl}/storage/v1/object/generated-itineraries/${encodedPath}`, {
    headers: { apikey: config.apiKey, Authorization: `Bearer ${config.apiKey}` }
  });
  if (!response.ok) throw new Error(`Could not retrieve generated HTML (${response.status}).`);
  return response.text();
}

async function renderHtmlToPdf(html) {
  const chromePath = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  if (!fs.existsSync(chromePath)) throw new Error("The server PDF renderer is not installed.");
  const tempDirectory = await fs.promises.mkdtemp(path.join(os.tmpdir(), "tail-compass-pdf-"));
  const htmlPath = path.join(tempDirectory, "itinerary.html");
  const pdfPath = path.join(tempDirectory, "itinerary.pdf");
  try {
    const printStyles = `<style id="tail-compass-print" media="print">
      @page { size: A4; margin: 9mm 13mm 9mm; }
      html, body { width: auto !important; min-width: 0 !important; }
      body { margin: 0 !important; padding: 0 !important; font-size: 10.5px !important; line-height: 1.35 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      h1 { font-size: 25px !important; margin: 0 0 2px !important; }
      h2 { font-size: 17px !important; margin: 14px 0 7px !important; break-after: avoid; page-break-after: avoid; }
      h3 { font-size: 13px !important; margin: 7px 0 3px !important; }
      .tagline { margin: 0 0 8px !important; font-size: 11px !important; }
      .photo { margin: 7px auto 10px !important; text-align: center; break-inside: avoid; page-break-inside: avoid; }
      .photo img { display: block; width: auto !important; max-width: 76% !important; max-height: 52mm !important; object-fit: contain !important; margin: 0 auto !important; }
      .photo figcaption, figcaption { margin-top: 3px !important; font-size: 8.5px !important; }
      .card { padding: 8px 11px !important; margin: 6px 0 !important; border-radius: 7px !important; break-inside: avoid; page-break-inside: avoid; }
      .grid { gap: 8px !important; flex-wrap: nowrap !important; }
      .grid .card { min-width: 0 !important; }
      .day { padding: 2px 0 !important; break-inside: avoid; page-break-inside: avoid; }
      ul { margin: 3px 0 0 15px !important; padding: 0 !important; }
      li { margin: 0 !important; }
      .notice { padding: 7px 10px !important; margin-top: 7px !important; font-size: 9px !important; line-height: 1.35 !important; break-inside: avoid; page-break-inside: avoid; }
    </style>`;
    const printableHtml = html.includes("</head>") ? html.replace("</head>", `${printStyles}</head>`) : `${printStyles}${html}`;
    await fs.promises.writeFile(htmlPath, printableHtml, "utf8");
    await execFileAsync(chromePath, [
      "--headless=new",
      "--disable-gpu",
      "--no-pdf-header-footer",
      `--print-to-pdf=${pdfPath}`,
      `file://${htmlPath}`
    ], { timeout: 60_000, maxBuffer: 2_000_000 });
    return await fs.promises.readFile(pdfPath);
  } finally {
    await fs.promises.rm(tempDirectory, { recursive: true, force: true });
  }
}

async function saveJourney(payload) {
  const { stage, ids = {}, traveller, trip, itinerary, note, selections = {}, photos = {} } = payload;
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

  const [ownerPhotoPath, petPhotoPath] = await Promise.all([
    photos.owner ? uploadProfilePhoto({ config: supabaseAdminConfig(), userId: user.id, kind: "owner", photo: photos.owner }) : Promise.resolve(traveller.ownerPhotoPath || user.photo_path || null),
    photos.pet ? uploadProfilePhoto({ config: supabaseAdminConfig(), userId: user.id, petId: pet.id, kind: "pet", photo: photos.pet }) : Promise.resolve(traveller.petPhotoPath || pet.photo_path || null)
  ]);

  if (ownerPhotoPath && ownerPhotoPath !== user.photo_path) {
    await supabaseAdmin(`app_users?id=eq.${encodeURIComponent(user.id)}`, {
      method: "PATCH",
      prefer: "return=minimal",
      body: { photo_path: ownerPhotoPath }
    });
    user.photo_path = ownerPhotoPath;
  }
  if (petPhotoPath && petPhotoPath !== pet.photo_path) {
    await supabaseAdmin(`pets?id=eq.${encodeURIComponent(pet.id)}`, {
      method: "PATCH",
      prefer: "return=minimal",
      body: { photo_path: petPhotoPath, updated_at: new Date().toISOString() }
    });
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
    const versionRecord = {
      trip_id: savedTrip.id,
      version_number: 1,
      itinerary_json: itinerary,
      user_notes: note || null,
      status: approved ? "approved" : "draft",
      approved_at: approved ? new Date().toISOString() : null
    };
    const [version] = await supabaseAdmin("itinerary_versions?on_conflict=trip_id,version_number", {
      method: "POST",
      prefer: "resolution=merge-duplicates,return=representation",
      body: versionRecord
    });
    itineraryVersionId = version.id;

    if (approved) {
      const idempotencyKey = `${savedTrip.id}:${version.id}:personalization-v1`;
      const selectedStay = demoCatalog.stays.find(item => item.id === savedTrip.stay_option_id);
      const [job] = await supabaseAdmin("generation_jobs?on_conflict=idempotency_key", {
        method: "POST",
        prefer: "resolution=merge-duplicates,return=representation",
        body: {
          trip_id: savedTrip.id,
          itinerary_version_id: version.id,
          idempotency_key: idempotencyKey,
          status: "queued",
          progress: 0,
          status_message: "Preparing your journey",
          input_snapshot: {
            user,
            pet,
            trip: { ...savedTrip, stay_name: selectedStay?.name || savedTrip.stay_option_id || "Selected pet-friendly stay" },
            itinerary: versionRecord.itinerary_json,
            notes: note || ""
          }
        }
      });
      generationJobId = job.id;
    }
  }

  return { userId: user.id, petId: pet.id, tripId: savedTrip.id, itineraryVersionId, generationJobId, ownerPhotoPath: user.photo_path || null, petPhotoPath: pet.photo_path || null };
}

async function triggerGenerationWorkflow(ids) {
  const webhookUrl = process.env.N8N_WEBHOOK_URL;
  const webhookSecret = process.env.N8N_WEBHOOK_SECRET;
  if (!webhookUrl || !ids.generationJobId) return { triggered: false, reason: "not_configured" };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(webhookSecret ? { "X-Tail-Compass-Secret": webhookSecret } : {})
      },
      body: JSON.stringify({
        job_id: ids.generationJobId,
        trip_id: ids.tripId,
        itinerary_version_id: ids.itineraryVersionId
      }),
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`n8n webhook returned ${response.status}.`);
    return { triggered: true };
  } catch (error) {
    console.error("Generation job remains queued; n8n trigger failed:", error.message);
    return { triggered: false, reason: "request_failed" };
  } finally {
    clearTimeout(timeout);
  }
}

async function loadCatalogFromSupabase() {
  const baseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const apiKey = process.env.SUPABASE_ANON_KEY;
  if (!baseUrl || !apiKey) return demoCatalog;
  const headers = { apikey: apiKey, Authorization: `Bearer ${apiKey}` };
  const read = async table => {
    const response = await fetch(`${baseUrl}/rest/v1/${table}?select=*`, { headers });
    if (!response.ok) throw new Error(`Could not read ${table}.`);
    return response.json();
  };
  try {
    const [scenarios, transportOptions, stays, purposes, vaccinationRequirements] = await Promise.all([
      read("demo_scenarios"), read("transport_options"), read("stay_options"), read("purpose_options"), read("vaccination_requirements")
    ]);
    return { source: "supabase", scenarios, transportOptions, stays, purposes, vaccinationRequirements };
  } catch {
    return { ...demoCatalog, source: "local-demo-fallback" };
  }
}

async function loadRecentItineraries() {
  if (!supabaseAdminConfig()) return [];
  const rows = await supabaseAdmin("public_itinerary_showcases?select=id,title,route,date_label,travel_mode,pet_summary,stay_summary,published_at&is_published=eq.true&order=published_at.desc&limit=3");
  return (rows || []).map(item => ({
    id: item.id,
    title: item.title,
    route: item.route,
    dateLabel: item.date_label,
    travelMode: item.travel_mode,
    petSummary: item.pet_summary,
    staySummary: item.stay_summary
  }));
}

http.createServer(async (request, response) => {
  const url = new URL(request.url, "http://localhost");
  if (request.method === "GET" && url.pathname === "/api/catalog") {
    return sendJson(response, 200, await loadCatalogFromSupabase());
  }
  if (request.method === "GET" && url.pathname === "/api/recent-itineraries") {
    try {
      return sendJson(response, 200, { itineraries: await loadRecentItineraries() });
    } catch (error) {
      return sendJson(response, 500, { error: error.message || "Could not load recent itineraries." });
    }
  }
  if (request.method === "GET" && url.pathname === "/api/generation-job/html") {
    try {
      const jobId = url.searchParams.get("id");
      const token = url.searchParams.get("token");
      if (!hasValidJobAccess(jobId, token)) return sendHtml(response, 403, "<!doctype html><title>Link expired</title><p>This itinerary link is invalid or expired.</p>");
      const jobs = await supabaseAdmin(`generation_jobs?id=eq.${encodeURIComponent(jobId)}&select=status,html_path,generated_images`);
      const job = jobs?.[0];
      if (!job || job.status !== "completed" || !job.html_path) return sendHtml(response, 404, "<!doctype html><title>Not ready</title><p>This personalized itinerary is not ready yet.</p>");
      const html = await readPrivateItineraryHtml(job.html_path);
      return sendHtml(response, 200, await refreshGeneratedImageUrls(html, job.generated_images));
    } catch (error) {
      return sendHtml(response, 500, `<!doctype html><title>Viewer error</title><p>${String(error.message || "Could not render itinerary.").replace(/[<>&]/g, "")}</p>`);
    }
  }
  if (request.method === "GET" && url.pathname === "/api/generation-job/pdf") {
    try {
      const jobId = url.searchParams.get("id");
      const token = url.searchParams.get("token");
      if (!hasValidJobAccess(jobId, token)) return sendJson(response, 403, { error: "This job link is invalid or expired." });
      const jobs = await supabaseAdmin(`generation_jobs?id=eq.${encodeURIComponent(jobId)}&select=status,html_path,generated_images`);
      const job = jobs?.[0];
      if (!job || job.status !== "completed" || !job.html_path) return sendJson(response, 404, { error: "This personalized itinerary is not ready for PDF download." });
      const storedHtml = await readPrivateItineraryHtml(job.html_path);
      const html = await refreshGeneratedImageUrls(storedHtml, job.generated_images);
      return sendPdf(response, await renderHtmlToPdf(html));
    } catch (error) {
      return sendJson(response, 500, { error: error.message || "Could not create the itinerary PDF." });
    }
  }
  if (request.method === "GET" && url.pathname === "/api/generation-job") {
    try {
      const jobId = url.searchParams.get("id");
      const token = url.searchParams.get("token");
      if (!hasValidJobAccess(jobId, token)) return sendJson(response, 403, { error: "This job link is invalid or expired." });
      const jobs = await supabaseAdmin(`generation_jobs?id=eq.${encodeURIComponent(jobId)}&select=id,status,progress,status_message,error_message,pdf_path,html_path,completed_at`);
      const job = jobs?.[0];
      if (!job) return sendJson(response, 404, { error: "Generation job not found." });
      const signedHtmlUrl = job.status === "completed" && job.html_path ? await createSignedItineraryUrl(job.html_path) : null;
      // Never expose the legacy stored PDF: downloads must use the corrected HTML-to-PDF renderer below.
      const signedPdfUrl = null;
      const htmlViewerUrl = signedHtmlUrl ? `/api/generation-job/html?id=${encodeURIComponent(jobId)}&token=${encodeURIComponent(token)}` : null;
      const pdfDownloadUrl = signedHtmlUrl ? `/api/generation-job/pdf?id=${encodeURIComponent(jobId)}&token=${encodeURIComponent(token)}` : null;
      return sendJson(response, 200, { ...job, signedHtmlUrl, signedPdfUrl, htmlViewerUrl, pdfDownloadUrl });
    } catch (error) {
      return sendJson(response, 500, { error: error.message || "Could not read generation status." });
    }
  }
  if (request.method === "POST" && url.pathname === "/api/journey") {
    try {
      const payload = await readJson(request, 30 * 1024 * 1024);
      if (!supabaseAdminConfig()) return sendJson(response, 200, { persisted: false, source: "local-demo", ids: payload.ids || {} });
      const ids = await saveJourney(payload);
      const workflow = payload.stage === "approved" ? await triggerGenerationWorkflow(ids) : { triggered: false, reason: "not_approved" };
      const jobAccessToken = ids.generationJobId ? createJobAccessToken(ids.generationJobId) : null;
      return sendJson(response, 200, { persisted: true, source: "supabase", ids, workflow, jobAccessToken });
    } catch (error) {
      return sendJson(response, 400, { persisted: false, error: error.message || "Could not save journey." });
    }
  }
  if (request.method === "POST" && url.pathname === "/api/extract-policy") {
    try {
      const { policyText } = await readJson(request);
      if (typeof policyText !== "string" || !policyText.trim()) return sendJson(response, 400, { success: false, source: "unavailable", error: "Policy text is required." });
      const result = await extractPolicyWithAI(policyText);
      return sendJson(response, result.success ? 200 : 503, result);
    } catch {
      return sendJson(response, 400, { success: false, source: "unavailable", error: "Invalid extraction request." });
    }
  }
  // Tail Memory image generation. No provider is configured in this MVP, so we
  // say so plainly rather than returning something that looks like a photograph.
  if (request.method === "POST" && url.pathname === "/api/tail-memory") {
    return sendJson(response, 200, {
      available: false,
      notice: "Image generation is not connected in this MVP. Set an image provider in server.mjs to enable it."
    });
  }

  vite.middlewares(request, response);
}).listen(5173, "127.0.0.1", () => console.log("Tail Compass ready at http://localhost:5173/"));
