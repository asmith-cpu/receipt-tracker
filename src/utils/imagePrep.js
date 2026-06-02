// imagePrep.js — the iPhone-photo fixer.
//
// Two problems this solves:
//   1. iPhones often produce HEIC, which Claude Vision doesn't accept.
//      Safari CAN decode HEIC into an <img>, so drawing to a canvas and
//      re-exporting as JPEG launders the format for free.
//   2. A 12MP photo is several MB — slow to upload and unnecessary for
//      receipt OCR. We downscale the long edge to ~1568px.
//
// Returns { dataUrl, base64, mediaType } — dataUrl for preview + PDF embed,
// base64 (no prefix) for the Vision call.

const MAX_EDGE = 1568;
const JPEG_QUALITY = 0.85;

export async function prepareImage(file) {
  const bitmapUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(bitmapUrl);

    let { width, height } = img;
    if (Math.max(width, height) > MAX_EDGE) {
      const scale = MAX_EDGE / Math.max(width, height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, width, height);

    const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
    const base64 = dataUrl.split(",")[1];
    return { dataUrl, base64, mediaType: "image/jpeg" };
  } finally {
    URL.revokeObjectURL(bitmapUrl);
  }
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () =>
      reject(
        new Error(
          "Could not read this image. On iPhone this should work in Safari; on desktop, HEIC files may not load."
        )
      );
    img.src = src;
  });
}
