// categoryColors.js — one color per category, used across dashboard,
// transaction dots, and budget bars so the palette stays coherent.

export const CATEGORY_COLORS = {
  Food: "#E8B04B",
  Gas: "#7FB069",
  Lodging: "#6FA8C7",
  Airfare: "#C58AC5",
  "Office Supplies": "#D98C6A",
  Software: "#8E9AE0",
  Other: "#A89D8E",
};

export function colorFor(category) {
  return CATEGORY_COLORS[category] || CATEGORY_COLORS.Other;
}

export function fmtMoney(n) {
  const v = Number(n) || 0;
  return v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// "2026-05-31" -> "May 31"
export function fmtDateShort(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d)) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function currentMonthKey() {
  return new Date().toISOString().slice(0, 7); // "2026-05"
}
