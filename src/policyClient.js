export async function extractPolicyFromService(policyText) {
  const response = await fetch("/api/extract-policy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ policyText })
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.success || payload.source !== "ai" || !payload.constraints) {
    throw new Error(payload?.error || "AI extraction is unavailable.");
  }
  return payload.constraints;
}
