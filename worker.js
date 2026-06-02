// Receipt Tracker — Vision Proxy (Cloudflare Worker)
// =====================================================
// This is the ONLY piece of the app that holds a secret (your Anthropic API key).
// Everything else runs in the browser. This Worker does three things:
//   1. Accepts a base64 image from your app
//   2. Calls Claude Vision with your key (which the browser never sees)
//   3. Returns the parsed JSON
//
// CORS is locked to your GitHub Pages origin so nobody else can spend your key.

// ---- CONFIG: change this one line after you know your Pages URL ----
const ALLOWED_ORIGIN = "https://YOUR_GITHUB_USERNAME.github.io";
// During local dev you can temporarily set this to "*" — but switch it back before going live.

const MODEL = "claude-haiku-4-5-20251001"; // swap to "claude-sonnet-4-6" if accuracy slips

const PARSE_PROMPT = `You are a receipt parser. Extract the following fields from this receipt image and return ONLY valid JSON, no markdown, no explanation.

{
  "merchant": "business name",
  "amount": 0.00,
  "date": "YYYY-MM-DD",
  "category": "Food|Gas|Lodging|Airfare|Office Supplies|Software|Other",
  "description": "brief description of purchase"
}

Rules:
- amount is a number, not a string, no currency symbols
- date format is YYYY-MM-DD strictly
- category must be exactly one of the enum values listed
- if any field cannot be determined, use null
- return ONLY the JSON object, nothing else`;

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export default {
  async fetch(request, env) {
    // Preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: corsHeaders() });
    }

    try {
      const { imageBase64, mediaType } = await request.json();
      if (!imageBase64) {
        return json({ error: "Missing imageBase64" }, 400);
      }

      const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": env.ANTHROPIC_API_KEY, // <-- the secret, set via `wrangler secret put`
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 512,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: mediaType || "image/jpeg",
                    data: imageBase64,
                  },
                },
                { type: "text", text: PARSE_PROMPT },
              ],
            },
          ],
        }),
      });

      if (!anthropicRes.ok) {
        const detail = await anthropicRes.text();
        return json({ error: "Vision API error", detail }, 502);
      }

      const data = await anthropicRes.json();
      const text = (data.content || [])
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("");

      // Strip any stray markdown fences, then parse
      const clean = text.replace(/```json|```/g, "").trim();
      let parsed;
      try {
        parsed = JSON.parse(clean);
      } catch {
        // Hand the raw text back so the app can fall back to a manual form
        return json({ error: "parse_failed", raw: text }, 200);
      }

      return json({ ok: true, receipt: parsed }, 200);
    } catch (err) {
      return json({ error: "worker_exception", detail: String(err) }, 500);
    }
  },
};

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json", ...corsHeaders() },
  });
}
