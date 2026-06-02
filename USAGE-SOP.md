# Ledger — Standard Operating Procedure (How to Use It)

**Purpose:** turn a pile of paper and email receipts into clean, categorized,
backed-up expense records with almost no manual data entry — and keep a running
view of spending against budget.

**Who this is for:** the day-to-day operator. No technical knowledge needed. If
something is broken rather than confusing, see the Build & Handoff Guide instead.

---

## The 30-second version

1. Open the app, tap **Capture**, photograph the receipt.
2. Glance at the four fields it filled in. Fix anything wrong.
3. Tap **Save Receipt.**

That's it. The PDF is filed to Drive, the row is logged to the sheet, and the
dashboard updates. Everything below is detail on doing it well.

---

## 1. Before you start each session

- **Sign in.** The app stays signed in for about an hour, then asks you to tap
  **Connect Google** again. This is normal — it's a security trade-off of keeping
  the app simple. If Capture is greyed out, you're either signed out or offline.
- **Be online.** Capturing needs a connection. If you lose signal mid-day, a
  saved receipt will queue and sync automatically next time you open the app
  with a connection.

---

## 2. Capturing a receipt (the core task)

1. Tap **Capture** in the bottom bar.
2. Tap **Capture Receipt.** The rear camera opens.
3. **Photograph the whole receipt.** What matters for a good auto-read:
   - Flat, not curled. Smooth it on a table if you can.
   - The **merchant name** (usually top) and the **total** (usually bottom) both
     in frame and in focus.
   - Even lighting, no glare across the total.
   - It's fine if the receipt is long and the photo is tall — capture all of it.
4. Wait a few seconds while it reads ("Reading the receipt…").

You can also pull from your photo library instead of shooting live — same button,
choose the library option your phone offers.

---

## 3. Reviewing the parse — what to check

The app pre-fills four things. **Always glance at these before saving** — the
reader is good, not perfect, and a wrong number now is a wrong number in your
books later.

| Field | What to watch for |
|---|---|
| **Amount** | The single most important field. On faded thermal receipts the reader can grab a subtotal, a line item, or tax instead of the grand total. Confirm it's the final total. |
| **Date** | Usually right. Occasionally pulls an unrelated date printed on the receipt. |
| **Merchant** | Sometimes grabs a slogan or location line instead of the business name. Tidy it if so. |
| **Category** | Its best guess. Re-tap the correct chip if it's off — this is what makes your dashboard meaningful. |

**Notes** is optional — use it for the *why* (e.g. "client lunch — Henderson
account," "fuel, job site run"). Future-you and your accountant will thank you.

If the reader couldn't make sense of the image, you'll get a blank form and a
note to fill it in manually. Just type the four fields and save — the receipt
photo is still captured and will still be filed as a PDF.

---

## 4. What happens when you tap Save

In order, automatically:
1. A clean **8.5×11 PDF** is generated — the receipt photo plus a data table.
2. That PDF is uploaded to your **Drive receipts folder.**
3. A row is written to the **Transactions** sheet, including a link to the PDF.
4. The **dashboard** totals update.

You'll see "Receipt saved." If you were offline, you'll see "Saved offline — will
sync next time" instead, and it completes itself later. Either way you're done.

---

## 5. Reading the Dashboard

The default screen, scoped to the **current calendar month:**

- **Spent this month** — the big amber number; everything logged this month.
- **Budget bar** — fills toward your monthly target. It turns red and reads
  "over" once you cross it. (No bar means you haven't set a total budget yet —
  see §7.)
- **By category** — the donut and list show where the money went, largest first.
  This is only as accurate as your category choices at capture time.
- **Recent** — your last ten receipts.

Tap **Refresh** if you've added rows directly in the sheet on another device and
want the app to re-pull.

---

## 6. Finding past receipts (History)

The **History** tab is the full record:

- **Search** by merchant, category, or anything in your notes.
- **Sort** by Newest, Largest, or Category.
- Each row shows a **PDF** link that opens the filed copy in Google Drive — this
  is what you hand to an accountant or attach to an expense report.

The header shows the count and dollar sum of whatever's currently filtered, which
is handy for questions like "how much did I spend on Software this year" — search
"Software," read the sum.

---

## 7. Setting and using budgets

In the **Budget** tab:

- **Total monthly budget** — the number the dashboard bar tracks against.
- **Per category** — optional targets for each category. The "Category total" line
  warns (turns red) if your per-category targets add up to more than your total.
- Tap **Save Budget.**

Budgets are monthly targets, not hard limits — nothing stops you from spending;
the dashboard just shows you where you stand. Revisit at the start of each month
if your targets change.

---

## 8. Recommended monthly close routine

A 10-minute habit that keeps the books trustworthy:

1. On the 1st, open the **Dashboard** and read last month's total and category mix.
2. Open the **Google Sheet** directly. Skim the month's rows for anything
   obviously wrong (a $1,400 coffee, a blank merchant). Fix in the sheet — the
   app reads from it, so corrections there flow through on next Refresh.
3. Spot-check that **PDF links** open. Your Drive folder is the audit trail.
4. If you report expenses to anyone, filter History to the month, read the sum,
   and pull the PDFs you need.
5. Adjust **Budget** targets for the new month if anything's changed.

---

## 9. Where your data lives (and backups)

- **The numbers** live in your Google Sheet. That *is* the database — you own it,
  you can open it, export it to Excel, or chart it however you like.
- **The receipt images** live as PDFs in your Drive folder.
- The app stores nothing important of its own — it's just a convenient window
  onto your Sheet and Drive. If the app vanished tomorrow, all your records would
  still be sitting in your Google account, fully intact.
- For belt-and-suspenders backup: Google already retains version history on the
  Sheet, and you can download the folder anytime.

---

## 10. Quick troubleshooting (operator-level)

| What you see | What to do |
|---|---|
| Capture button is greyed out | You're offline, or signed out — tap **Connect Google.** |
| "Google hasn't verified this app" | Tap **Advanced → continue.** It's your own app; this is expected. |
| It asks you to sign in again | Normal after ~an hour. Tap **Connect Google.** |
| Parsed amount looks wrong | Just edit the field before saving. Retake the photo if the receipt was glare-y or curled. |
| "Saved offline" | Fine — it'll sync when you next open the app online. Don't re-capture. |
| A receipt won't read at all | Save it manually (type the fields); the PDF is still filed. |
| Something's genuinely broken | That's a build issue — see the Build & Handoff Guide's Troubleshooting table. |

---

## 11. Habits that keep it clean

- **Capture at the point of sale**, while you still remember the context, rather
  than letting paper pile up.
- **Always fix the category** when it's wrong — it's the difference between a
  dashboard that informs decisions and one that just looks busy.
- **Use Notes for anything you'd have to explain later** to an accountant, a
  client, or the IRS.
- **Glance, don't trust blindly.** The reader saves you typing; it doesn't replace
  the half-second sanity check on the total.
