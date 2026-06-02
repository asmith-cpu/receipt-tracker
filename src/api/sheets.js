// sheets.js — Google Sheets v4 over plain fetch.
// Two tabs: "Transactions" (A:G) and "Budget" (A:B).

import { CONFIG, CATEGORIES } from "../config.js";
import { gfetch } from "./google.js";

const BASE = "https://sheets.googleapis.com/v4/spreadsheets";
const SID = () => CONFIG.SHEET_ID;

function range(r) {
  return `${BASE}/${SID()}/values/${encodeURIComponent(r)}`;
}

// ---- Transactions ----------------------------------------------------

export async function appendTransaction(t) {
  // Column order MUST match the schema: Date, Merchant, Amount, Category,
  // Description, PDF Link, Submitted At.
  const row = [
    t.date,
    t.merchant,
    Number(t.amount).toFixed(2),
    t.category,
    t.description || "",
    t.pdfLink || "",
    new Date().toISOString(),
  ];
  const url =
    range("Transactions!A:G") + ":append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS";
  const res = await gfetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ values: [row] }),
  });
  if (!res.ok) throw new Error(`Sheets append failed: ${await res.text()}`);
  return res.json();
}

export async function getTransactions() {
  const res = await gfetch(range("Transactions!A2:G"));
  if (!res.ok) throw new Error(`Sheets read failed: ${await res.text()}`);
  const data = await res.json();
  const rows = data.values || [];
  return rows
    .filter((r) => r[0]) // skip blank rows
    .map((r) => ({
      date: r[0] || "",
      merchant: r[1] || "",
      amount: parseFloat(r[2]) || 0,
      category: r[3] || "Other",
      description: r[4] || "",
      pdfLink: r[5] || "",
      submittedAt: r[6] || "",
    }));
}

// ---- Budget ----------------------------------------------------------

export async function getBudget() {
  const res = await gfetch(range("Budget!A2:B"));
  if (!res.ok) throw new Error(`Budget read failed: ${await res.text()}`);
  const data = await res.json();
  const map = {};
  (data.values || []).forEach((r) => {
    if (r[0]) map[r[0]] = parseFloat(r[1]) || 0;
  });
  return map; // { Total: 0, Food: 0, ... }
}

export async function setBudget(budgetMap) {
  // Write the whole table back in one shot (Total first, then categories).
  const rows = [["Total", String(budgetMap.Total ?? 0)]];
  CATEGORIES.forEach((c) => rows.push([c, String(budgetMap[c] ?? 0)]));
  const url = range("Budget!A2:B") + "?valueInputOption=USER_ENTERED";
  const res = await gfetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ values: rows }),
  });
  if (!res.ok) throw new Error(`Budget write failed: ${await res.text()}`);
  return res.json();
}

// Seed Budget tab on first run if it's empty.
export async function seedBudgetIfEmpty() {
  const existing = await getBudget();
  if (Object.keys(existing).length > 0) return existing;
  const fresh = { Total: 0 };
  CATEGORIES.forEach((c) => (fresh[c] = 0));
  await setBudget(fresh);
  return fresh;
}
