# Ledger — Build & Handoff Guide

**Audience:** whoever is standing this app up from the source. Assumes basic
command-line comfort but explains every decision. Follow the steps in order;
each one produces something you verify before moving on.

**Time to stand up cold:** ~45–60 minutes, most of it clicking through Google
Cloud Console.

---

## 1. What you're building

A personal receipt tracker. The owner photographs a receipt on an iPhone; the
app reads it with Claude Vision, files a PDF copy to Google Drive, logs a row to
a Google Sheet, and shows a spending dashboard.

It is **almost entirely client-side** — a static React app on GitHub Pages. The
one exception is a tiny Cloudflare Worker whose only job is to hold the Anthropic
API key so it never appears in public browser code.

```
 iPhone Safari (the React app)
     │
     ├─►  Cloudflare Worker  ─►  Claude Vision API     reads the receipt
     │       (holds the API key — the only secret in the system)
     │
     ├─►  Google Drive API   stores the receipt PDF
     └─►  Google Sheets API  logs the transaction row
```

**The mental model that explains every design choice:** there is exactly *one*
secret — the Anthropic API key — and it lives *only* in the Worker. Everything
else (Google Client ID, Sheet ID, Folder ID, Worker URL) is safe to commit to a
public repo, because Google Client IDs are designed to be public and are secured
by an origin allowlist, not by secrecy.

---

## 2. Accounts you'll need

| Account | Used for | Cost |
|---|---|---|
| Anthropic API | Receipt parsing (Claude Vision) | Pay-as-you-go; ~⅓ cent per receipt (see §12) |
| Google | Drive (PDFs) + Sheets (data) + OAuth | Free |
| Cloudflare | Hosts the key-relay Worker | Free tier is plenty |
| GitHub | Hosts the static app on Pages | Free |

---

## 3. The codebase, file by file

```
receipt-tracker/
├── worker.js              The Cloudflare Worker (key relay). Deployed SEPARATELY
│                          from the rest — it is not part of the React build.
├── index.html             Entry point; loads fonts + mobile viewport
├── package.json           Dependencies + the `deploy` script
├── vite.config.js         Sets the GitHub Pages base path
├── README.md              Short version of this guide
└── src/
    ├── main.jsx           React bootstrap
    ├── App.jsx            App shell: auth gate, bottom nav, toasts, offline
    │                      detection, the submit pipeline, the offline retry queue
    ├── index.css          The entire design system (one file, CSS variables)
    ├── config.js          ◄── THE FIVE VALUES GO HERE. Only file the owner edits.
    ├── api/
    │   ├── google.js      OAuth via Google Identity Services + a fetch wrapper
    │   │                  that attaches the token and refreshes on 401
    │   ├── sheets.js      Read/write Transactions + Budget tabs
    │   ├── drive.js       Multipart PDF upload, returns the shareable link
    │   └── claude.js      Calls the Worker (NOT Anthropic directly)
    ├── components/
    │   ├── Dashboard.jsx
    │   ├── CaptureReceipt.jsx   the core capture → parse → confirm → save flow
    │   ├── TransactionHistory.jsx
    │   ├── BudgetSettings.jsx
    │   └── icons.jsx
    └── utils/
        ├── imagePrep.js   Re-encodes iPhone photos (incl. HEIC) to downscaled JPEG
        ├── pdfGenerator.js  Builds the 8.5×11 receipt PDF with jsPDF
        └── categoryColors.js  Shared palette + money/date formatters
```

**Three things that differ from a naive build, and why** (so you don't "fix"
them back):
1. No `gapi` client library. Auth uses Google Identity Services (`gapi.auth2`
   was deprecated in 2023); Sheets/Drive are plain `fetch` calls. Fewer moving parts.
2. Parsing uses `claude-haiku-4-5-20251001`, not the older Sonnet 4 the original
   spec named — that model retires June 15, 2026.
3. `imagePrep.js` exists because iPhones emit HEIC (which Vision rejects) and
   multi-MB photos. The canvas re-encode fixes both. Don't remove it.

---

## 4. Get the code building locally first

Before any cloud setup, confirm the project compiles on your machine.

```bash
# from the project root
npm install
npm run build        # should finish with "✓ built" and no errors
```

If that works, the code is sound and everything from here is configuration.

---

## 5. Step 1 — Deploy the Worker (the key relay)

This is first because it's self-contained and you can test it in isolation.

```bash
npm install -g wrangler
wrangler login                 # opens a browser to authorize Cloudflare
```

Make a **separate** folder for the Worker (it deploys independently):

```bash
mkdir receipt-proxy
cp worker.js receipt-proxy/
cd receipt-proxy
```

Create `wrangler.toml` in that folder:

```toml
name = "receipt-proxy"
main = "worker.js"
compatibility_date = "2026-01-01"
```

Get an Anthropic API key from <https://console.anthropic.com> → API Keys, then:

```bash
wrangler secret put ANTHROPIC_API_KEY     # paste the key when prompted
wrangler deploy
```

`deploy` prints a URL like `https://receipt-proxy.<subdomain>.workers.dev`.
**Save it — this is config value #1.**

### Verify the Worker in isolation

With any receipt photo on your machine:

```bash
# macOS:
base64 -i receipt.jpg | tr -d '\n' > b64.txt
# Linux:  base64 -w0 receipt.jpg > b64.txt

curl -X POST https://receipt-proxy.<subdomain>.workers.dev \
  -H "Content-Type: application/json" \
  -d "{\"imageBase64\":\"$(cat b64.txt)\",\"mediaType\":\"image/jpeg\"}"
```

A healthy response is `{"ok":true,"receipt":{"merchant":"…","amount":…}}`.
**If you get that, the riskiest, most novel part of the system works.** Don't
proceed until this returns clean JSON.

> Note: while testing, `ALLOWED_ORIGIN` in `worker.js` can stay as the default.
> You'll lock it to the real Pages URL in Step 8.

---

## 6. Step 2 — Google Cloud project + OAuth

In <https://console.cloud.google.com>:

1. **Create a project** (any name, e.g. "Receipt Tracker").
2. **APIs & Services → Library** → enable **Google Sheets API** and
   **Google Drive API** (search each, click Enable).
3. **APIs & Services → OAuth consent screen:**
   - User type: **External** → Create.
   - Fill app name, your email for support/developer contact. Save.
   - **Test users** → add the owner's Google account email. *(Staying in
     "Testing" status is intentional — it lets you skip Google's formal
     verification, which the `spreadsheets` scope would otherwise trigger.)*
4. **APIs & Services → Credentials → Create Credentials → OAuth client ID:**
   - Application type: **Web application**.
   - **Authorized JavaScript origins** — add BOTH:
     - `http://localhost:5173` (local testing)
     - `https://<github-username>.github.io` (production — fill in the real username)
   - Create. Copy the **Client ID** → **config value #2.** (The owner's
     **GitHub username** is **value #3.**)

> Origins must match exactly — no trailing slash, correct scheme. A mismatch is
> the #1 cause of a silent sign-in failure (see Troubleshooting).

---

## 7. Step 3 — The Google Sheet and Drive folder

**Sheet:** create a Google Sheet. Make two tabs, named *exactly*:

`Transactions` — row 1 headers across A–G:

| A | B | C | D | E | F | G |
|---|---|---|---|---|---|---|
| Date | Merchant | Amount | Category | Description | PDF Link | Submitted At |

`Budget` — row 1 headers across A–B:

| A | B |
|---|---|
| Category | Monthly Target |

Leave the Budget rows empty below the header — the app seeds them automatically
on first run (Total + the seven categories). Copy the **Sheet ID** from the URL
(`/spreadsheets/d/`**`THIS`**`/edit`) → **config value #4.**

**Drive folder:** create a folder for the PDFs. Copy its **Folder ID** from the
URL (`/folders/`**`THIS`**) → **config value #5.**

---

## 8. Step 4 — Wire up config, run, and deploy

Open `src/config.js` and replace the five `PASTE_…` placeholders:

| Placeholder | Value |
|---|---|
| `GOOGLE_CLIENT_ID` | from Step 2 |
| `SHEET_ID` | from Step 3 |
| `DRIVE_FOLDER_ID` | from Step 3 |
| `WORKER_URL` | from Step 1 |
| *(GitHub username)* | used in `vite.config.js` base + the OAuth origin |

Run locally and do a full smoke test (see §9) before deploying:

```bash
npm run dev      # http://localhost:5173
```

When the local test passes, deploy:

```bash
# create a GitHub repo named exactly "receipt-tracker", push this folder
npm run deploy   # builds + pushes to the gh-pages branch
```

In the repo: **Settings → Pages → Source: `gh-pages` branch**. Live at
`https://<username>.github.io/receipt-tracker/`.

**Then lock the Worker:** edit `worker.js`, set `ALLOWED_ORIGIN` to that exact
Pages URL, and run `wrangler deploy` again from the `receipt-proxy` folder. Now
only the deployed app can spend the API key from a browser.

> If you ever rename the repo, you must update three things in lockstep: the repo
> name, `base` in `vite.config.js`, and the authorized origin in Google Cloud.

---

## 9. End-to-end verification checklist

Run this once locally and once on the live URL. Each step proves one integration.

- [ ] **Worker:** the curl test (§5) returns `{"ok":true,…}`
- [ ] **Auth:** "Connect Google" → consent screen → returns to the app signed in
- [ ] **Budget seed:** open Budget tab; the seven categories + Total are present
- [ ] **Capture:** photograph a receipt → fields come back pre-filled
- [ ] **PDF + Drive:** after Save, a PDF appears in the Drive folder
- [ ] **Sheet write:** a new row appears in `Transactions` with the PDF link in column F
- [ ] **Dashboard:** the new spend shows in the monthly total and category donut
- [ ] **History:** the receipt is listed; its "PDF" link opens the Drive file
- [ ] **iPhone:** repeat capture on the actual phone in Safari

The **Drive upload** (multipart, hand-built request body) is the most likely
step to need a small tweak against a real token — verify it deliberately.

---

## 10. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Sign-in popup closes, nothing happens | Origin mismatch in Google Cloud | Authorized origin must match the URL exactly (scheme, no trailing slash). Add `http://localhost:5173` for dev. |
| "Google hasn't verified this app" | App is in Testing mode (expected) | Click **Advanced → continue**. The owner must be a Test user. |
| Worker returns CORS error in browser | `ALLOWED_ORIGIN` ≠ the app's URL | Set it to the exact Pages (or localhost) origin and redeploy the Worker. |
| Worker returns 502 / Vision error | Bad/missing API key in the Worker | Re-run `wrangler secret put ANTHROPIC_API_KEY`. |
| Parse returns `parse_failed` | Receipt unreadable or odd output | App falls back to a blank manual form — that's by design. For chronic misses, switch `MODEL` in `worker.js` to `claude-sonnet-4-6`. |
| Image won't load on desktop | HEIC; desktop browsers can't decode it | Expected. The target is iPhone Safari, which can. Test there. |
| Drive upload fails | Token scope or malformed multipart body | Confirm `drive.file` scope granted; check the boundary construction in `drive.js`. Capture the error text. |
| Sheet read/write 400 | Tab names or columns don't match | Tabs must be exactly `Transactions` and `Budget` with the headers in §7. |
| Signed out after ~an hour | Tokens expire; no refresh in client-only flow | Expected. Tap "Connect Google" again. |
| `404 not_found_error` from Vision after June 15 2026 | Using a retired model id | Ensure `MODEL` is a current id (Haiku 4.5 or Sonnet 4.6). |

---

## 11. Maintenance

- **Swap the parsing model:** one line — `MODEL` at the top of `worker.js`.
- **Rotate the API key:** `wrangler secret put ANTHROPIC_API_KEY` again; no app
  change needed.
- **Change categories:** edit `CATEGORIES` in `src/config.js` *and* the enum line
  in the Worker's `PARSE_PROMPT`, and add colors in `categoryColors.js`.
- **Rename the app** ("Ledger"): it appears in `index.html` (title), `App.jsx`
  (gate screen), and `pdfGenerator.js` (PDF header/footer).
- **Model deprecations:** Anthropic gives ~6 months' notice. Check
  <https://docs.anthropic.com/en/docs/about-claude/model-deprecations> annually.

---

## 12. Cost expectations

Parsing is the only metered cost. A downscaled receipt image is ~2,500 input
tokens plus a tiny prompt and ~80 output tokens. At Haiku 4.5 rates
($1 / $5 per million in/out), that's roughly **$0.003 per receipt** — about a
third of a cent. At 100 receipts a month, well under a dollar. Google, Cloudflare
(free tier), and GitHub Pages cost nothing at this scale.
