import React, { useState, useEffect } from "react";
import { CATEGORIES } from "../config.js";
import { setBudget } from "../api/sheets.js";
import { colorFor, fmtMoney } from "../utils/categoryColors.js";

export default function BudgetSettings({ budget, setBudgetState, showToast, onSignOut }) {
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const d = { Total: budget.Total ?? 0 };
    CATEGORIES.forEach((c) => (d[c] = budget[c] ?? 0));
    setDraft(d);
  }, [budget]);

  function update(k, v) {
    const num = v === "" ? "" : v;
    setDraft((d) => ({ ...d, [k]: num }));
  }

  const categorySum = CATEGORIES.reduce((s, c) => s + (Number(draft[c]) || 0), 0);

  async function save() {
    setSaving(true);
    try {
      const clean = { Total: Number(draft.Total) || 0 };
      CATEGORIES.forEach((c) => (clean[c] = Number(draft[c]) || 0));
      await setBudget(clean);
      setBudgetState(clean);
      showToast("Budget saved", "good");
    } catch (e) {
      showToast("Couldn't save — " + e.message, "bad");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="screen">
      <div className="screen-title">Budget</div>
      <div className="screen-sub">Monthly targets</div>

      <div className="card">
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Total monthly budget</label>
          <input
            className="input mono"
            inputMode="decimal"
            value={draft.Total ?? ""}
            onChange={(e) => update("Total", e.target.value)}
            placeholder="0"
          />
        </div>
      </div>

      <div className="card">
        <div className="card-label">Per category</div>
        {CATEGORIES.map((c) => (
          <div className="row-between" key={c} style={{ marginBottom: 12, gap: 12 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 14.5, flex: 1 }}>
              <span className="txn-dot" style={{ background: colorFor(c) }} />
              {c}
            </span>
            <input
              className="input mono"
              inputMode="decimal"
              value={draft[c] ?? ""}
              onChange={(e) => update(c, e.target.value)}
              placeholder="0"
              style={{ width: 110, minHeight: 42 }}
            />
          </div>
        ))}
        <div className="row-between" style={{ marginTop: 6, paddingTop: 12, borderTop: "1px solid var(--line)" }}>
          <span className="small muted">Category total</span>
          <span
            className="amount small"
            style={{ fontWeight: 600, color: categorySum > (Number(draft.Total) || 0) ? "var(--bad)" : "var(--ink-mute)" }}
          >
            ${fmtMoney(categorySum)}
          </span>
        </div>
      </div>

      <button className="btn" onClick={save} disabled={saving}>
        {saving ? <span className="spinner dark" /> : "Save Budget"}
      </button>

      <button className="btn btn-danger" onClick={onSignOut} style={{ marginTop: 28 }}>
        Sign out of Google
      </button>
    </div>
  );
}
