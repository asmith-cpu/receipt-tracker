import React, { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { colorFor, fmtMoney, fmtDateShort, currentMonthKey } from "../utils/categoryColors.js";

export default function Dashboard({ txns, budget, loading, onRefresh }) {
  const month = currentMonthKey();

  const monthTxns = useMemo(
    () => txns.filter((t) => (t.date || "").startsWith(month)),
    [txns, month]
  );

  const spent = useMemo(
    () => monthTxns.reduce((s, t) => s + (t.amount || 0), 0),
    [monthTxns]
  );

  const total = budget.Total || 0;
  const remaining = total - spent;
  const pct = total > 0 ? Math.min(100, (spent / total) * 100) : 0;

  const byCategory = useMemo(() => {
    const map = {};
    monthTxns.forEach((t) => {
      map[t.category] = (map[t.category] || 0) + (t.amount || 0);
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [monthTxns]);

  const monthLabel = new Date(month + "-01T00:00:00").toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="screen stagger">
      <div className="row-between">
        <div>
          <div className="screen-title">Dashboard</div>
          <div className="screen-sub">{monthLabel}</div>
        </div>
        <button className="chip" onClick={onRefresh} disabled={loading}>
          {loading ? "…" : "Refresh"}
        </button>
      </div>

      {/* Hero: spent this month */}
      <div className="card">
        <div className="card-label">Spent this month</div>
        <div className="amount-hero">
          <span className="cur">$</span>
          {fmtMoney(spent)}
        </div>
        {total > 0 && (
          <>
            <div className="bar-track">
              <div
                className="bar-fill"
                style={{
                  width: pct + "%",
                  background: remaining < 0 ? "var(--bad-strong)" : "var(--amber)",
                }}
              />
            </div>
            <div className="row-between" style={{ marginTop: 8 }}>
              <span className="small muted">of ${fmtMoney(total)} budget</span>
              <span
                className="small amount"
                style={{ color: remaining < 0 ? "var(--bad)" : "var(--good)", fontWeight: 600 }}
              >
                {remaining < 0 ? "-$" + fmtMoney(-remaining) + " over" : "$" + fmtMoney(remaining) + " left"}
              </span>
            </div>
          </>
        )}
        {total === 0 && (
          <div className="small muted" style={{ marginTop: 6 }}>
            Set a monthly budget in the Budget tab to track against a target.
          </div>
        )}
      </div>

      {/* Category breakdown */}
      {byCategory.length > 0 && (
        <div className="card">
          <div className="card-label">By category</div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 120, height: 120, flex: "0 0 auto" }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={byCategory}
                    dataKey="value"
                    innerRadius={34}
                    outerRadius={56}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {byCategory.map((d) => (
                      <Cell key={d.name} fill={colorFor(d.name)} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ flex: 1 }}>
              {byCategory.map((d) => (
                <div className="row-between" key={d.name} style={{ marginBottom: 7 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5 }}>
                    <span
                      className="txn-dot"
                      style={{ background: colorFor(d.name) }}
                    />
                    {d.name}
                  </span>
                  <span className="amount small" style={{ fontWeight: 600 }}>
                    ${fmtMoney(d.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recent */}
      <div className="card">
        <div className="card-label">Recent</div>
        {txns.length === 0 && <div className="muted small">No receipts yet. Tap Capture to add one.</div>}
        {txns.slice(0, 10).map((t, i) => (
          <div className="txn" key={i}>
            <span className="txn-dot" style={{ background: colorFor(t.category) }} />
            <div className="txn-main">
              <div className="txn-merchant">{t.merchant || "—"}</div>
              <div className="txn-meta">
                {fmtDateShort(t.date)} · {t.category}
              </div>
            </div>
            <div className="txn-amt amount">${fmtMoney(t.amount)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
