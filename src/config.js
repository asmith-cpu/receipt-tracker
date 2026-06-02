// =====================================================================
//  CONFIG — fill in your five values, then save. Nothing else to touch.
// =====================================================================
//
//  These are all SAFE to commit to a public repo. None of them is a
//  secret. (Your real secret — the Anthropic API key — lives only in the
//  Cloudflare Worker, never here.) Google Client IDs are designed to be
//  public; their security comes from the authorized-origins allowlist you
//  set in Google Cloud Console.
//
//  Where each value comes from:
// ---------------------------------------------------------------------

export const CONFIG = {
  // 1. Google Cloud Console -> Credentials -> OAuth 2.0 Client ID -> Web app.
  //    Add BOTH of these to "Authorized JavaScript origins":
  //      https://YOUR_GITHUB_USERNAME.github.io
  //      http://localhost:5173        (for local testing)
  GOOGLE_CLIENT_ID: "767320715011-818ic2g687ub54bckiq9d0lkmgb3gj81.apps.googleusercontent.com",

  // 2. From the Google Sheet URL:
  //    docs.google.com/spreadsheets/d/THIS_PART/edit
  SHEET_ID: "1qwroO4hfIyeYsWXp8KZWuCRk5kquVLqBT2HvAbcfiO0",

  // 3. From the Drive folder URL:
  //    drive.google.com/drive/folders/THIS_PART
  DRIVE_FOLDER_ID: "1l8c3fje3DcUjG2ejviigjQiBwXihcv9Q",

  // 4. The URL printed by `wrangler deploy` (your key relay).
  //    Looks like: https://receipt-proxy.your-subdomain.workers.dev
  WORKER_URL: "https://receipt-proxy.will-smithwi-28.workers.dev",
};

// The OAuth scopes the app requests. drive.file = only files THIS app
// creates (it can't see the rest of your Drive). spreadsheets = read/write
// your sheet. Don't change these unless you know why.
export const GOOGLE_SCOPES =
  "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/spreadsheets";

export const CATEGORIES = [
  "Food",
  "Gas",
  "Lodging",
  "Airfare",
  "Office Supplies",
  "Software",
  "Other",
];

// Quick sanity check so a forgotten placeholder fails loudly, not silently.
export function configIsComplete() {
  return !Object.values(CONFIG).some((v) => v.startsWith("PASTE_"));
}
