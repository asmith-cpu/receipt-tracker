import React, { useMemo, useState } from "react";
import { colorFor, fmtMoney, fmtDateShort } from "../utils/categoryColors.js";

export default function TransactionHistory({ txns }) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("date"); // date | amount | category

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list = txns.filter(
      (t) =>
        !needle ||
        t.merchant.toLowerCase().includes(needle) ||
        t.category.toLowerCase().includes(needle) ||
        (t.description || "").toLowerCase().includes(needle)
    );
    list = [...list].sort((a, b) => {
      if (sort === "amount") return b.amount - a.amount;
      if (sort === "category") return a.category.localeCompare(b.category);
      return (b.date || "").localeCompare(a.date || ""); // date desc
    });
    return list;
  }, [txns, q, sort]);

  const sum = filtered.reduce((s, t) => s + (t.amount || 0), 0);

  return (
    <div className="screen">
      <div className="screen-title">History</div>
      <div className="screen-sub">
        {filtered.length} receipt{filtered.length !== 1 ? "s" : ""} · ${fmtMoney(sum)}
      </div>

      <div className="field" style={{ marginBottom: 10 }}>
        <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search merchant, category, notes" />
      </div>

      <div className="chips" style={{ marginBottom: 16 }}>
        {[
          ["date", "Newest"],
          ["amount", "Largest"],
          ["category", "Category"],
        ].map(([k, label]) => (
          <button key={k} className={`chip ${sort === k ? "active" : ""}`} onClick={() => setSort(k)}>
            {label}
          </button>
        ))}
      </div>

      <div className="card">
        {filtered.length === 0 && <div className="muted small">Nothing matches.</div>}
        {filtered.map((t, i) => (
          <div className="txn" key={i}>
            <span className="txn-dot" style={{ background: colorFor(t.category) }} />
            <div className="txn-main">
              <div className="txn-merchant">{t.merchant || "—"}</div>
              <div className="txn-meta">
                {fmtDateShort(t.date)} · {t.category}
                {t.pdfLink && (
                  <>
                    {" · "}
                    <a className="link" href={t.pdfLink} target="_blank" rel="noopener noreferrer">
                      PDF
                    </a>
                  </>
                )}
              </div>
            </div>
            <div className="txn-amt amount">${fmtMoney(t.amount)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
