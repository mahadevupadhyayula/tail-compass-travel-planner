# Tail and Compass n8n MVP setup

1. Import `Tail and Compass — Personalized Itinerary Generator.corrected.json` into n8n.
2. Create an n8n Header Auth credential named `Tail Compass Webhook Secret`:
   - Header: `X-Tail-Compass-Secret`
   - Value: a long random value you keep private.
3. Select that credential in the `Webhook` node.
4. Re-select the existing Supabase credential on every Supabase and Supabase-storage node.
5. Re-select the OpenAI credential on `Generate Image`.
6. Copy the Webhook node's production URL into the server-only `N8N_WEBHOOK_URL` value in `.env`.
7. Put the same Header Auth value into the server-only `N8N_WEBHOOK_SECRET` value in `.env`.
8. Test with the Webhook test URL first. Activate the workflow only after a successful end-to-end run.

The PDF node uses PDFShift's unauthenticated free access for the MVP. It is limited and watermarked. To use a PDFShift account later, create an n8n Header Auth credential with header `X-API-Key`, select it on `HTML to PDF`, and keep the endpoint as `https://api.pdfshift.io/v3/convert/pdf`.

If image generation fails, the workflow embeds a generic Tail and Compass illustration and continues. The Supabase generation job records progress at 10%, 35%, 75%, and 100%. PDF or storage failures mark the job as failed.

The approval webhook body is:

```json
{
  "job_id": "generation_jobs.id",
  "trip_id": "trips.id",
  "itinerary_version_id": "itinerary_versions.id"
}
```

## Persistent HTML output (recommended MVP path)

PDFShift's unauthenticated sandbox rejects documents over 2 MB. For the MVP,
remove or disable `HTML to PDF` and `Upload PDF to Storage`, then keep the
images embedded in the HTML produced by `Build Itinerary HTML`.

1. Add a `Convert to File` node after `Build Itinerary HTML`.
2. Choose `Convert to Text File`.
3. Set the source text field to `html`, output binary property to `data`, file
   name to `itinerary.html`, and MIME type to `text/html` when available.
4. Add an HTTP Request node named `Upload HTML to Storage`:
   - Method: `POST`
   - URL:
     `{{ $("Config").item.json.supabase_url }}/storage/v1/object/{{ $("Config").item.json.pdf_bucket }}/generated/{{ $("Webhook").item.json.body.job_id }}/itinerary.html`
   - Authentication: predefined `Supabase API`
   - Headers: `Content-Type: text/html` and `x-upsert: true`
   - Body: binary data from property `data`
5. Connect `Upload HTML to Storage` to `Mark Job Completed`.
6. In `Mark Job Completed`, add:
   - `html_path` = `generated/{{ $("Webhook").item.json.body.job_id }}/itinerary.html`
   - `pdf_path` = null (or remove the existing PDF field assignment)
7. Keep status `completed`, progress `100`, and the existing generated image
   metadata update.
8. Route the error output of `Upload HTML to Storage` to `Mark Job Failed`.

The MVP signs `html_path` for ten minutes and renders it in a sandboxed iframe.
The persisted HTML may be larger than 2 MB because it is stored directly in the
private 25 MB Supabase bucket instead of being sent through PDFShift.
