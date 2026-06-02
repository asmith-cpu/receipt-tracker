# Ledger — Receipt Tracker

Snap a receipt on your phone → Claude reads it → it's filed to Google Drive as a
PDF and logged to a Google Sheet → a clean dashboard shows where the money's going.

Runs entirely in your browser (hosted free on GitHub Pages) **except** one tiny
Cloudflare Worker that holds your Anthropic API key so it never ends up in public
code. That's the whole architecture:

```
iPhone Safari  ──►  Cloudflare Worker  ──►  Claude Vision   (reads the receipt)
      │
      ├──►  Google Drive   (stores the PDF)
      └──►  Google Sheets  (logs the row)
```

---

## Setup — do these once, in order

You'll collect **five values** along the way. They all go in `src/config.js`.

### 1. The key relay (Cloudflare Worker)

This is the only thing that holds a secret. See `worker.js` (delivered separately).

```bash
npm install -g wrangler
wrangler login
# put worker.js in a folder with this wrangler.toml:
#   name = "receipt-proxy"
#   main = "worker.js"
#   compatibility_date = "2026-01-01"
wrangler secret put ANTHROPIC_API_KEY     # paste your key — it lives only here
wrangler deploy                           # prints your Worker URL  ← value #1
```

### 2. Google Sheet

Create a Google Sheet. Make two tabs named exactly **`Transactions`** and **`Budget`**.

- `Transactions` row 1 headers (A–G): `Date · Merchant · Amount · Category · Description · PDF Link · Submitted At`
- `Budget` row 1 headers (A–B): `Category · Monthly Target`

The app seeds the Budget rows automatically on first run, so you can leave that tab
empty below the header. Copy the **Sheet ID** from the URL
(`docs.google.com/spreadsheets/d/`**`THIS_PART`**`/edit`) ← value #2.

### 3. Drive folder

Make a folder in Google Drive for the receipt PDFs. Copy its **Folder ID** from the
URL (`drive.google.com/drive/folders/`**`THIS_PART`**) ← value #3.

### 4. Google OAuth Client ID

In [Google Cloud Console](https://console.cloud.google.com):

1. Create a project (any name).
2. APIs & Services → **Enable APIs**: enable *Google Sheets API* and *Google Drive API*.
3. OAuth consent screen → **External** → fill the basics → add **yourself as a Test user**.
   (Staying in "Testing" mode means you skip Google's formal app-verification process.)
4. Credentials → Create Credentials → **OAuth client ID** → *Web application*.
5. Under **Authorized JavaScript origins**, add both:
   - `https://YOUR_GITHUB_USERNAME.github.io`
   - `http://localhost:5173`
6. Copy the **Client ID** ← value #4. (Your **GitHub username** is value #5.)

### 5. Fill in config & run

Open `src/config.js`, replace the five `PASTE_…` placeholders, save.

```bash
npm install
npm run dev        # test locally at http://localhost:5173
```

---

## Deploy to GitHub Pages

```bash
# create a repo named exactly "receipt-tracker" and push this folder to it
npm install --save-dev gh-pages   # already in package.json
npm run deploy                    # builds + pushes to the gh-pages branch
```

Then in the repo: **Settings → Pages → Source: `gh-pages` branch**. Your app lives at
`https://YOUR_GITHUB_USERNAME.github.io/receipt-tracker/`.

**Last step — lock the Worker:** open `worker.js`, set `ALLOWED_ORIGIN` to that exact
Pages URL, and `wrangler deploy` again. Now only your app can spend your key from a browser.

### Put it on your iPhone home screen
Open the Pages URL in Safari → Share → **Add to Home Screen**. It launches full-screen
like a native app.

---

## Notes

- **Sign-in:** Google tokens last ~1 hour with no refresh in this client-only flow, so
  you'll re-tap "Connect Google" occasionally. Expected for a solo tool.
- **"Google hasn't verified this app":** because you're in Testing mode. Click *Advanced
  → continue*. Safe — it's your own app.
- **Model:** receipt parsing uses `claude-haiku-4-5-20251001` (cheap, fast). If a faded
  thermal receipt gives bad reads, change one line in `worker.js` to `claude-sonnet-4-6`.
- **Offline:** capture is disabled with no network; if a Sheet write fails it queues in
  `localStorage` and syncs next time you open the app.
- **Privacy of scopes:** the app uses `drive.file`, so it can only see PDFs it created —
  not the rest of your Drive.
```
