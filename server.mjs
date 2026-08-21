import http from "node:http";
import fs from "node:fs";
import { createServer as createViteServer } from "vite";
import { extractPolicyWithAI } from "./server/policyExtractor.mjs";

if (fs.existsSync(".env")) {
  for (const line of fs.readFileSync(".env", "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
}

const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });

function sendJson(response, status, payload) {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(payload));
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", chunk => { body += chunk; if (body.length > 20_000) reject(new Error("Request too large.")); });
    request.on("end", () => { try { resolve(JSON.parse(body)); } catch { reject(new Error("Invalid JSON.")); } });
    request.on("error", reject);
  });
}

http.createServer(async (request, response) => {
  const url = new URL(request.url, "http://localhost");
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
