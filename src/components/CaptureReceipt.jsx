import React, { useState, useRef } from "react";
import { CATEGORIES } from "../config.js";
import { prepareImage } from "../utils/imagePrep.js";
import { parseReceipt } from "../api/claude.js";
import { generateReceiptPdf } from "../utils/pdfGenerator.js";
import { uploadPdf } from "../api/drive.js";

const EMPTY = { merchant: "", amount: "", date: today(), category: "Other", description: "" };

export default function CaptureReceipt({ online, onCommit, showToast }) {
  const [stage, setStage] = useState("idle"); // idle | parsing | confirm | submitting
  const [imageData, setImageData] = useState(null); // { dataUrl, base64, mediaType }
  const [form, setForm] = useState(EMPTY);
  const fileRef = useRef(null);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setStage("parsing");
    try {
      const prepped = await prepareImage(file);
      setImageData(prepped);

      try {
        const result = await parseReceipt(prepped.base64, prepped.mediaType);
        if (result.needsManual) {
          setForm(EMPTY);
          showToast("Couldn't auto-read it — fill in manually", "bad");
        } else {
          setForm({ ...EMPTY, ...result.receipt });
        }
      } catch (err) {
        // Vision failed — spec says fall back to an empty manual form.
        setForm(EMPTY);
        showToast("Parser unavailable — enter details manually", "bad");
      }
      setStage("confirm");
    } catch (err) {
      showToast(err.message, "bad");
      setStage("idle");
    } finally {
      if (fileRef.current) fileRef.current.value = ""; // allow re-pick of same file
    }
  }

  function update(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit() {
    if (!form.merchant || form.amount === "" || isNaN(Number(form.amount))) {
      showToast("Merchant and a valid amount are required", "bad");
      return;
    }
    setStage("submitting");
    try {
      // 1. PDF
      const { blob, filename } = generateReceiptPdf(form, imageData?.dataUrl);
      // 2. Drive upload (retry once per spec)
      let pdfLink = "";
      try {
        pdfLink = await uploadPdf(blob, filename);
      } catch {
        pdfLink = await uploadPdf(blob, filename); // single retry
      }
      // 3. Commit to sheet (App handles offline queue on failure)
      await onCommit({ ...form, amount: Number(form.amount), pdfLink });
      // reset
      setStage("idle");
      setImageData(null);
      setForm(EMPTY);
    } catch (e) {
      showToast("Upload failed — " + e.message, "bad");
      setStage("confirm");
    }
  }

  function reset() {
    setStage("idle");
    setImageData(null);
    setForm(EMPTY);
  }

  return (
    <div className="screen">
      <div className="screen-title">Capture</div>
      <div className="screen-sub">Photograph a receipt to log it</div>

      {/* hidden camera input — capture="environment" opens rear camera on iPhone */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFile}
        style={{ display: "none" }}
      />

      {stage === "idle" && (
        <div className="card center-col" style={{ padding: 36, gap: 16 }}>
          <div className="muted small">Make sure the total and merchant are visible.</div>
          <button className="btn" onClick={() => fileRef.current?.click()} disabled={!online}>
            Capture Receipt
          </button>
        </div>
      )}

      {stage === "parsing" && (
        <div className="card center-col" style={{ padding: 44, gap: 16 }}>
          {imageData && <img src={imageData.dataUrl} className="img-preview" alt="" style={{ maxHeight: 220, objectFit: "contain" }} />}
          <div className="spinner" />
          <div className="muted small">Reading the receipt…</div>
        </div>
      )}

      {(stage === "confirm" || stage === "submitting") && (
        <div className="stagger">
          {imageData && (
            <img
              src={imageData.dataUrl}
              className="img-preview"
              alt="receipt"
              style={{ maxHeight: 200, objectFit: "contain", marginBottom: 16, background: "var(--surface)" }}
            />
          )}

          <div className="field">
            <label>Merchant</label>
            <input className="input" value={form.merchant} onChange={(e) => update("merchant", e.target.value)} placeholder="Business name" />
          </div>

          <div className="field">
            <label>Amount</label>
            <input
              className="input mono"
              inputMode="decimal"
              value={form.amount}
              onChange={(e) => update("amount", e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="field">
            <label>Date</label>
            <input className="input mono" type="date" value={form.date} onChange={(e) => update("date", e.target.value)} />
          </div>

          <div className="field">
            <label>Category</label>
            <div className="chips">
              {CATEGORIES.map((c) => (
                <button key={c} className={`chip ${form.category === c ? "active" : ""}`} onClick={() => update("category", c)}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label>Notes</label>
            <textarea className="input" value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="Optional" />
          </div>

          <button className="btn" onClick={submit} disabled={stage === "submitting"}>
            {stage === "submitting" ? <span className="spinner dark" /> : "Save Receipt"}
          </button>
          <button className="btn btn-ghost" onClick={reset} disabled={stage === "submitting"} style={{ marginTop: 10 }}>
            Discard
          </button>
        </div>
      )}
    </div>
  );
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
