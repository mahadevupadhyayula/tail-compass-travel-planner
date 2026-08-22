import { demoCatalog, sendJson } from "./_shared.js";

export default function handler(request, response) {
  if (request.method !== "GET") return sendJson(response, 405, { error: "Method not allowed." });
  return sendJson(response, 200, { ...demoCatalog, source: "server-demo" });
}
