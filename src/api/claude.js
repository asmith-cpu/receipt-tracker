// claude.js — calls YOUR Cloudflare Worker (not Anthropic directly).
// The Worker holds the API key; the browser never sees it.

import { CONFIG } from "../config.js";

// imageBase64: raw base64 (no data: prefix). mediaType: e.g. "image/jpeg".
// Returns { receipt } on success, or throws / returns { needsManual, raw }.
export async function parseReceipt(imageBase64, mediaType = "image/jpeg") {
  const res = await fetch(CONFIG.WORKER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageBase64, mediaType }),
  });

  if (!res.ok) throw new Error(`Vision proxy error ${res.status}`);
  const data = await res.json();

  // Worker returns { error: "parse_failed", raw } when Claude's output
  // wasn't clean JSON — caller falls back to a blank manual form.
  if (data.error === "parse_failed") {
    return { needsManual: true, raw: data.raw };
  }
  if (data.error) throw new Error(data.detail || data.error);

  return { receipt: normalize(data.receipt) };
}

// Defensive cleanup so the confirm form always gets sane values.
function normalize(r = {}) {
  const valid = ["Food", "Gas", "Lodging", "Airfare", "Office Supplies", "Software", "Other"];
  return {
    merchant: r.merchant || "",
    amount: r.amount != null && !isNaN(r.amount) ? Number(r.amount) : "",
    date: /^\d{4}-\d{2}-\d{2}$/.test(r.date || "") ? r.date : today(),
    category: valid.includes(r.category) ? r.category : "Other",
    description: r.description || "",
  };
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
