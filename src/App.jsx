import React, { useEffect, useState, useCallback } from "react";
import { CONFIG, configIsComplete } from "./config.js";
import { isSignedIn, signIn, signOut } from "./api/google.js";
import { getTransactions, getBudget, seedBudgetIfEmpty, appendTransaction } from "./api/sheets.js";
import { IconDash, IconCapture, IconHistory, IconBudget } from "./components/icons.jsx";
import Dashboard from "./components/Dashboard.jsx";
import CaptureReceipt from "./components/CaptureReceipt.jsx";
import TransactionHistory from "./components/TransactionHistory.jsx";
import BudgetSettings from "./components/BudgetSettings.jsx";

const QUEUE_KEY = "rt_pending_txns";

export default function App() {
  const [authed, setAuthed] = useState(isSignedIn());
  const [tab, setTab] = useState("dash");
  const [txns, setTxns] = useState([]);
  const [budget, setBudget] = useState({});
  const [loading, setLoading] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((msg, kind = "good") => {
    setToast({ msg, kind });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // online/offline
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!isSignedIn()) return;
    setLoading(true);
    try {
      await seedBudgetIfEmpty();
      const [t, b] = await Promise.all([getTransactions(), getBudget()]);
      setTxns(t.reverse()); // newest first
      setBudget(b);
    } catch (e) {
      showToast("Couldn't load data — " + e.message, "bad");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // On (re)auth, flush any queued offline transactions, then load.
  useEffect(() => {
    if (!authed) return;
    (async () => {
      await flushQueue(showToast);
      refresh();
    })();
  }, [authed, refresh, showToast]);

  async function handleSignIn() {
    try {
      await signIn();
      setAuthed(true);
    } catch (e) {
      showToast("Sign-in failed — " + e.message, "bad");
    }
  }

  function handleSignOut() {
    signOut();
    setAuthed(false);
    setTxns([]);
    setBudget({});
  }

  // Called by CaptureReceipt after PDF upload. Appends to Sheet; on failure
  // queues to localStorage (spec: "queue locally, retry on next open").
  async function commitTransaction(t) {
    try {
      await appendTransaction(t);
      showToast("Receipt saved", "good");
    } catch (e) {
      queueTxn(t);
      showToast("Saved offline — will sync next time", "bad");
    }
    await refresh();
    setTab("dash");
  }

  if (!configIsComplete()) return <ConfigGate />;

  if (!authed) {
    return (
      <div className="app">
        <div className="gate stagger">
          <h1>
            Led<span className="mark">ger</span>
          </h1>
          <p>
            Snap a receipt. It's parsed, filed to Drive as a PDF, and logged to your sheet —
            with a clean view of where the money's going.
          </p>
          <button className="btn" onClick={handleSignIn}>
            Connect Google
          </button>
          <p className="small muted" style={{ marginTop: 18, marginBottom: 0 }}>
            You'll grant access only to files this app creates, plus your tracker sheet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      {!online && <div className="banner">Offline — capture is paused</div>}

      {tab === "dash" && (
        <Dashboard txns={txns} budget={budget} loading={loading} onRefresh={refresh} />
      )}
      {tab === "capture" && (
        <CaptureReceipt online={online} onCommit={commitTransaction} showToast={showToast} />
      )}
      {tab === "history" && <TransactionHistory txns={txns} />}
      {tab === "budget" && (
        <BudgetSettings budget={budget} setBudgetState={setBudget} showToast={showToast} onSignOut={handleSignOut} />
      )}

      {toast && (
        <div className="toast-wrap">
          <div className={`toast ${toast.kind}`}>{toast.msg}</div>
        </div>
      )}

      <nav className="nav">
        <NavBtn id="dash" tab={tab} setTab={setTab} Icon={IconDash} label="Dashboard" />
        <NavBtn id="capture" tab={tab} setTab={setTab} Icon={IconCapture} label="Capture" disabled={!online} />
        <NavBtn id="history" tab={tab} setTab={setTab} Icon={IconHistory} label="History" />
        <NavBtn id="budget" tab={tab} setTab={setTab} Icon={IconBudget} label="Budget" />
      </nav>
    </div>
  );
}

function NavBtn({ id, tab, setTab, Icon, label, disabled }) {
  return (
    <button
      className={`nav-item ${tab === id ? "active" : ""}`}
      onClick={() => !disabled && setTab(id)}
      style={disabled ? { opacity: 0.35 } : null}
    >
      <Icon />
      {label}
    </button>
  );
}

function ConfigGate() {
  return (
    <div className="app">
      <div className="gate">
        <h1>Almost there</h1>
        <p>
          Open <code>src/config.js</code> and replace the five placeholder values with your own
          (Google Client ID, Sheet ID, Drive Folder ID, and the Worker URL). Save and reload.
        </p>
      </div>
    </div>
  );
}

// ---- offline queue helpers ----
function queueTxn(t) {
  const q = JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
  q.push(t);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
}

async function flushQueue(showToast) {
  const q = JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
  if (!q.length) return;
  const remaining = [];
  for (const t of q) {
    try {
      await appendTransaction(t);
    } catch {
      remaining.push(t);
    }
  }
  localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
  const synced = q.length - remaining.length;
  if (synced > 0) showToast(`Synced ${synced} queued receipt${synced > 1 ? "s" : ""}`, "good");
}
