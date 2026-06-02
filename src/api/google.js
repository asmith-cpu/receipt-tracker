// google.js — OAuth via Google Identity Services (the current method;
// gapi.auth2 was deprecated in 2023). We get an access token here and then
// talk to Sheets/Drive with plain fetch + Bearer token (see sheets.js, drive.js).

import { CONFIG, GOOGLE_SCOPES } from "../config.js";

const TOKEN_KEY = "rt_google_token";
let tokenClient = null;
let gisReady = null;

// Load the GIS script once.
function loadGis() {
  if (gisReady) return gisReady;
  gisReady = new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) return resolve();
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.onload = resolve;
    s.onerror = () => reject(new Error("Failed to load Google Identity Services"));
    document.head.appendChild(s);
  });
  return gisReady;
}

function saveToken(tok) {
  // GIS gives expires_in (seconds). Store an absolute expiry, shaved by 60s.
  const expiresAt = Date.now() + (tok.expires_in - 60) * 1000;
  localStorage.setItem(TOKEN_KEY, JSON.stringify({ token: tok.access_token, expiresAt }));
}

export function getStoredToken() {
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    if (!raw) return null;
    const { token, expiresAt } = JSON.parse(raw);
    if (Date.now() >= expiresAt) return null; // expired
    return token;
  } catch {
    return null;
  }
}

export function isSignedIn() {
  return !!getStoredToken();
}

export function signOut() {
  localStorage.removeItem(TOKEN_KEY);
}

// Trigger the OAuth consent / token flow. Returns the access token.
// `silent: true` tries to refresh without a popup (used when a token expires
// mid-session); falls back to a prompt only if needed.
export async function signIn({ silent = false } = {}) {
  await loadGis();
  return new Promise((resolve, reject) => {
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: CONFIG.GOOGLE_CLIENT_ID,
      scope: GOOGLE_SCOPES,
      callback: (resp) => {
        if (resp.error) return reject(new Error(resp.error));
        saveToken(resp);
        resolve(resp.access_token);
      },
    });
    tokenClient.requestAccessToken({ prompt: silent ? "" : "consent" });
  });
}

// Used by sheets.js / drive.js: hand back a valid token, refreshing silently
// if the stored one has expired. If silent refresh fails, the caller should
// surface a "please sign in again" path.
export async function ensureToken() {
  const existing = getStoredToken();
  if (existing) return existing;
  return signIn({ silent: true });
}

// Thin wrapper around fetch that attaches the Bearer token and, on a 401,
// refreshes once and retries — covers "Google auth expires" from the spec.
export async function gfetch(url, options = {}, retry = true) {
  const token = await ensureToken();
  const res = await fetch(url, {
    ...options,
    headers: { ...(options.headers || {}), Authorization: `Bearer ${token}` },
  });
  if (res.status === 401 && retry) {
    signOut();
    await signIn({ silent: false });
    return gfetch(url, options, false);
  }
  return res;
}
