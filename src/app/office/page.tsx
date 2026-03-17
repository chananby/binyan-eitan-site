"use client";

import { useState, useEffect } from "react";

interface StaffMember {
  id: string;
  name: string;
  phone: string;
  role: string;
  active: boolean;
}

export default function OfficePage() {
  const [authed, setAuthed]     = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const [staff, setStaff]         = useState<StaffMember[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffError, setStaffError]     = useState("");

  const [newName, setNewName]   = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newRole, setNewRole]   = useState("פועל");
  const [addLoading, setAddLoading] = useState(false);
  const [addMsg, setAddMsg]         = useState("");

  // Check session on mount
  useEffect(() => {
    if (sessionStorage.getItem("office_authed") === "1") {
      setAuthed(true);
    }
  }, []);

  // Load staff once authed
  useEffect(() => {
    if (!authed) return;
    loadStaff();
  }, [authed]);

  async function loadStaff() {
    setStaffLoading(true);
    setStaffError("");
    try {
      const res = await fetch("/api/admin/staff");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setStaff(data.staff ?? []);
    } catch (e) {
      setStaffError("שגיאה בטעינת העובדים: " + String(e));
    } finally {
      setStaffLoading(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");
    try {
      const res = await fetch("/api/admin-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (data.ok) {
        sessionStorage.setItem("office_authed", "1");
        setAuthed(true);
      } else {
        setAuthError("סיסמה שגויה");
        setPassword("");
      }
    } catch {
      setAuthError("שגיאת רשת — נסה שוב");
    } finally {
      setAuthLoading(false);
    }
  }

  async function toggleActive(id: string, current: boolean) {
    await fetch(`/api/admin/staff/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !current }),
    });
    loadStaff();
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddLoading(true);
    setAddMsg("");
    try {
      const res = await fetch("/api/admin/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, phone: newPhone, role: newRole }),
      });
      const data = await res.json();
      if (res.ok) {
        setAddMsg("✓ " + newName + " נוסף בהצלחה");
        setNewName(""); setNewPhone(""); setNewRole("פועל");
        loadStaff();
      } else {
        setAddMsg("שגיאה: " + (data.error ?? res.status));
      }
    } catch (e) {
      setAddMsg("שגיאת רשת: " + String(e));
    } finally {
      setAddLoading(false);
    }
  }

  // ── Login screen ──────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <div dir="rtl" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F3F2EE", padding: "2rem" }}>
        <div style={{ background: "#fff", border: "1px solid #D1CFCA", padding: "2.5rem", width: "100%", maxWidth: "360px" }}>
          <h1 style={{ fontFamily: "sans-serif", fontSize: "1.25rem", fontWeight: 700, marginBottom: "1.5rem", textAlign: "center", color: "#2D2926" }}>
            ניהול בנין איתן
          </h1>
          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <input
              type="password"
              autoFocus
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="סיסמת כניסה"
              style={{ border: "1px solid #ccc", padding: "0.75rem 1rem", fontSize: "1rem", textAlign: "center", letterSpacing: "0.2em", outline: "none" }}
            />
            {authError && <p style={{ color: "#dc2626", fontSize: "0.85rem", textAlign: "center", margin: 0 }}>{authError}</p>}
            <button
              type="submit"
              disabled={authLoading || !password.trim()}
              style={{ background: "#8D775F", color: "#F3F2EE", border: "none", padding: "0.75rem", fontSize: "0.9rem", fontWeight: 600, cursor: "pointer", opacity: authLoading ? 0.6 : 1 }}
            >
              {authLoading ? "מאמת..." : "כניסה"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────
  const active   = staff.filter(s => s.active);
  const inactive = staff.filter(s => !s.active);

  return (
    <div dir="rtl" style={{ minHeight: "100vh", background: "#F3F2EE", padding: "2rem", fontFamily: "sans-serif", color: "#2D2926" }}>
      <div style={{ maxWidth: "860px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "2rem" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>ניהול עובדים — בנין איתן</h1>
          <button
            onClick={() => { sessionStorage.removeItem("office_authed"); setAuthed(false); }}
            style={{ background: "transparent", border: "1px solid #ccc", padding: "0.4rem 0.9rem", fontSize: "0.8rem", cursor: "pointer", color: "#666" }}
          >
            יציאה
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: "1rem" }}>
          {[
            { label: "עובדים פעילים", value: active.length },
            { label: "לא פעילים", value: inactive.length },
            { label: "סה״כ", value: staff.length },
          ].map(s => (
            <div key={s.label} style={{ flex: 1, background: "#fff", border: "1px solid #D1CFCA", padding: "1rem", textAlign: "center" }}>
              <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "#8D775F" }}>{s.value}</div>
              <div style={{ fontSize: "0.8rem", color: "#666", marginTop: "0.25rem" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Add Worker */}
        <div style={{ background: "#fff", border: "1px solid #D1CFCA", padding: "1.5rem" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1rem", marginTop: 0 }}>הוספת עובד</h2>
          <form onSubmit={handleAdd} style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "flex-end" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", flex: "2 1 160px" }}>
              <label style={{ fontSize: "0.75rem", color: "#666" }}>שם</label>
              <input value={newName} onChange={e => setNewName(e.target.value)} required
                placeholder="ישראל ישראלי"
                style={{ border: "1px solid #ccc", padding: "0.5rem 0.75rem", fontSize: "0.9rem" }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", flex: "2 1 140px" }}>
              <label style={{ fontSize: "0.75rem", color: "#666" }}>טלפון</label>
              <input value={newPhone} onChange={e => setNewPhone(e.target.value)} required
                placeholder="05X-XXXXXXX" type="tel"
                style={{ border: "1px solid #ccc", padding: "0.5rem 0.75rem", fontSize: "0.9rem" }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", flex: "1 1 110px" }}>
              <label style={{ fontSize: "0.75rem", color: "#666" }}>תפקיד</label>
              <select value={newRole} onChange={e => setNewRole(e.target.value)}
                style={{ border: "1px solid #ccc", padding: "0.5rem 0.75rem", fontSize: "0.9rem", background: "#fff" }}>
                <option>פועל</option>
                <option>מנהל עבודה</option>
                <option>קבלן משנה</option>
                <option>מנהל</option>
              </select>
            </div>
            <button type="submit" disabled={addLoading}
              style={{ background: "#8D775F", color: "#fff", border: "none", padding: "0.5rem 1.25rem", fontSize: "0.9rem", fontWeight: 600, cursor: "pointer", flexShrink: 0, height: "36px" }}>
              {addLoading ? "מוסיף..." : "הוסף"}
            </button>
          </form>
          {addMsg && <p style={{ marginTop: "0.75rem", fontSize: "0.85rem", color: addMsg.startsWith("✓") ? "#16a34a" : "#dc2626" }}>{addMsg}</p>}
        </div>

        {/* Staff List */}
        <div style={{ background: "#fff", border: "1px solid #D1CFCA", padding: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h2 style={{ fontSize: "1rem", fontWeight: 700, margin: 0 }}>רשימת עובדים ({staff.length})</h2>
            <button onClick={loadStaff} style={{ background: "transparent", border: "1px solid #ccc", padding: "0.3rem 0.75rem", fontSize: "0.8rem", cursor: "pointer" }}>
              רענן
            </button>
          </div>

          {staffError && <p style={{ color: "#dc2626", fontSize: "0.85rem" }}>{staffError}</p>}
          {staffLoading && <p style={{ color: "#666", fontSize: "0.85rem" }}>טוען...</p>}

          {!staffLoading && staff.length === 0 && (
            <p style={{ color: "#999", fontSize: "0.85rem", textAlign: "center", padding: "1rem 0" }}>אין עובדים רשומים</p>
          )}

          {staff.length > 0 && (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #eee" }}>
                  <th style={{ textAlign: "right", padding: "0.5rem 0.75rem", fontWeight: 600, color: "#666", fontSize: "0.8rem" }}>שם</th>
                  <th style={{ textAlign: "right", padding: "0.5rem 0.75rem", fontWeight: 600, color: "#666", fontSize: "0.8rem" }}>טלפון</th>
                  <th style={{ textAlign: "right", padding: "0.5rem 0.75rem", fontWeight: 600, color: "#666", fontSize: "0.8rem" }}>תפקיד</th>
                  <th style={{ textAlign: "right", padding: "0.5rem 0.75rem", fontWeight: 600, color: "#666", fontSize: "0.8rem" }}>סטטוס</th>
                  <th style={{ textAlign: "right", padding: "0.5rem 0.75rem", fontWeight: 600, color: "#666", fontSize: "0.8rem" }}></th>
                </tr>
              </thead>
              <tbody>
                {staff.map(s => (
                  <tr key={s.id} style={{ borderBottom: "1px solid #f0f0f0", opacity: s.active ? 1 : 0.5 }}>
                    <td style={{ padding: "0.6rem 0.75rem", fontWeight: 500 }}>{s.name}</td>
                    <td style={{ padding: "0.6rem 0.75rem", direction: "ltr", textAlign: "right" }}>{s.phone}</td>
                    <td style={{ padding: "0.6rem 0.75rem", color: "#666" }}>{s.role}</td>
                    <td style={{ padding: "0.6rem 0.75rem" }}>
                      <span style={{ display: "inline-block", padding: "0.2rem 0.5rem", fontSize: "0.75rem", borderRadius: "2px",
                        background: s.active ? "#dcfce7" : "#f3f4f6", color: s.active ? "#16a34a" : "#6b7280" }}>
                        {s.active ? "פעיל" : "לא פעיל"}
                      </span>
                    </td>
                    <td style={{ padding: "0.6rem 0.75rem" }}>
                      <button onClick={() => toggleActive(s.id, s.active)}
                        style={{ background: "transparent", border: "1px solid #ccc", padding: "0.25rem 0.6rem", fontSize: "0.75rem", cursor: "pointer", color: "#444" }}>
                        {s.active ? "השבת" : "הפעל"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </div>
  );
}
