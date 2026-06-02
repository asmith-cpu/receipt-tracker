// drive.js — upload a PDF blob to the configured Drive folder.
// Uses Drive v3 multipart upload (metadata + binary in one request).

import { CONFIG } from "../config.js";
import { gfetch } from "./google.js";

const UPLOAD_URL =
  "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink,webContentLink";

export async function uploadPdf(blob, filename) {
  const metadata = {
    name: filename,
    mimeType: "application/pdf",
    parents: [CONFIG.DRIVE_FOLDER_ID],
  };

  // Build a multipart/related body by hand (FormData would set the wrong
  // boundary semantics for Drive's "related" multipart).
  const boundary = "rt_boundary_" + Math.random().toString(36).slice(2);
  const head =
    `--${boundary}\r\n` +
    "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
    JSON.stringify(metadata) +
    `\r\n--${boundary}\r\n` +
    "Content-Type: application/pdf\r\n" +
    "Content-Transfer-Encoding: base64\r\n\r\n";
  const tail = `\r\n--${boundary}--`;

  const base64 = await blobToBase64(blob);
  const body = head + base64 + tail;

  const res = await gfetch(UPLOAD_URL, {
    method: "POST",
    headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
    body,
  });
  if (!res.ok) throw new Error(`Drive upload failed: ${await res.text()}`);
  const data = await res.json();
  return data.webViewLink || data.webContentLink || "";
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
