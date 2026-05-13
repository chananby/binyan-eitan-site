"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Loader2, ChevronRight, FileText, Plus, Search, Trash2, ExternalLink, AlertCircle,
} from "lucide-react";

type AuthState = "loading" | "unauthenticated" | "admin";

type QuoteRow = {
  id: string;
  quote_number: string | null;
  customer_name: string | null;
  issue_date: string | null;
  total_before_vat: number | null;
  status: string;
  updated_at: string;
  created_at: string;
};

const STATUS_LABELS: Record<string, string> = {
  draft:    "טיוטה",
  sent:     "נשלחה",
  accepted: "התקבלה",
  rejected: "נדחתה",
  archived: "ארכיון",
};

const STATUS_STYLE: Record<string, string> = {
  draft:    "bg-gray-100 text-gray-700",
  sent:     "bg-blue-100 text-blue-700",
  accepted: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
  archived: "bg-amber-100 text-amber-700",
};

function fmtCurrency(n: number | null): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(n);
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function fmtRelative(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1)  return "עכשיו";
  if (minutes < 60) return `לפני ${minutes} דק'`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24)   return `לפני ${hours} שעות`;
  const days = Math.floor(hours / 24);
  if (days < 7)     return `לפני ${days} ימים`;
  return d.toLocaleDateString("he-IL");
}

export default function QuotesListClient() {
  const [auth, setAuth] = useState<AuthState>("loading");
  const [adminName, setAdminName] = useState<string>("");
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/whoami", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d?.role === "admin") {
          setAuth("admin");
          if (d.name) setAdminName(String(d.name));
        } else {
          setAuth("unauthenticated");
        }
      })
      .catch(() => {
        if (!cancelled) setAuth("unauthenticated");
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (auth !== "admin") return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    const url = search
      ? `/api/admin/quotes?search=${encodeURIComponent(search)}`
      : "/api/admin/quotes";
    fetch(url, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d.error) { setError(d.error); setQuotes([]); }
        else setQuotes(d.quotes ?? []);
      })
      .catch((e) => { if (!cancelled) setError(String(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [auth, search]);

  const handleDelete = async (id: string, customer: string | null) => {
    const label = customer || "ההצעה";
    if (!confirm(`למחוק את ${label}? פעולה זו לא ניתנת לשחזור.`)) return;
    try {
      const res = await fetch(`/api/admin/quotes/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("שגיאת שרת");
      setQuotes((prev) => prev.filter((q) => q.id !== id));
    } catch (e) {
      alert("מחיקה נכשלה: " + (e instanceof Error ? e.message : String(e)));
    }
  };

  // ── Loading auth ─────────────────────────────────────────────────────────
  if (auth === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F4F0]">
        <Loader2 className="animate-spin text-[#8D775F]" size={32} strokeWidth={1.5} />
      </div>
    );
  }

  // ── Not admin ────────────────────────────────────────────────────────────
  if (auth === "unauthenticated") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F5F4F0] p-8 text-center">
        <FileText size={32} strokeWidth={1.5} className="text-[#8D775F] mb-4" />
        <h1 className="text-[#2D2926] text-xl font-semibold mb-2">נדרשת התחברות</h1>
        <Link href="/admin" className="text-[#8D775F] underline text-sm hover:no-underline">
          לעמוד ההתחברות ←
        </Link>
      </div>
    );
  }

  // ── Admin: render list ───────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F5F4F0]">
      {/* Top bar */}
      <header className="bg-white border-b border-[#2D2926]/10 px-4 py-2.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2 text-sm">
          <Link href="/admin/hub" className="text-[#8D775F] flex items-center gap-1 hover:underline">
            <ChevronRight size={14} />
            Hub
          </Link>
          <span className="text-[#2D2926]/40">/</span>
          <span className="text-[#2D2926] font-semibold flex items-center gap-1.5">
            <FileText size={14} strokeWidth={2} />
            רשימת הצעות מחיר
          </span>
        </div>
        {adminName && (
          <div className="text-[#2D2926]/60 text-xs">
            מחובר כ-<span className="font-semibold text-[#2D2926]">{adminName}</span>
          </div>
        )}
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Action row */}
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="relative flex-1 max-w-md">
            <Search
              size={16}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#2D2926]/40 pointer-events-none"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="חיפוש לפי שם לקוח..."
              className="w-full pr-10 pl-3 py-2 text-sm border border-[#2D2926]/15 rounded-md bg-white focus:outline-none focus:border-[#8D775F]"
            />
          </div>
          <Link
            href="/admin/quotes"
            className="bg-[#8D775F] text-white px-4 py-2 rounded-md text-sm font-semibold flex items-center gap-2 hover:bg-[#7a6651] transition-colors"
          >
            <Plus size={16} />
            הצעה חדשה
          </Link>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4 flex items-center gap-2 text-sm">
            <AlertCircle size={16} />
            <span>שגיאה בטעינה: {error}</span>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="animate-spin text-[#8D775F]" size={24} />
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && quotes.length === 0 && (
          <div className="bg-white border border-[#2D2926]/10 rounded-md p-12 text-center">
            <FileText size={32} strokeWidth={1.5} className="text-[#8D775F] mx-auto mb-3" />
            <p className="text-[#2D2926] mb-1">
              {search ? "לא נמצאו הצעות התואמות לחיפוש" : "עדיין לא נשמרו הצעות"}
            </p>
            <p className="text-[#2D2926]/60 text-sm mb-4">
              {search ? "נסה ביטוי אחר" : "צור הצעה חדשה כדי להתחיל"}
            </p>
            {!search && (
              <Link
                href="/admin/quotes"
                className="inline-flex items-center gap-2 text-[#8D775F] text-sm font-semibold hover:underline"
              >
                <Plus size={14} />
                צור הצעה ראשונה
              </Link>
            )}
          </div>
        )}

        {/* List */}
        {!loading && !error && quotes.length > 0 && (
          <div className="bg-white border border-[#2D2926]/10 rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[#F5F4F0] border-b border-[#2D2926]/10">
                <tr className="text-right text-[#2D2926]/70 text-xs uppercase tracking-wider">
                  <th className="px-4 py-3 font-semibold">#</th>
                  <th className="px-4 py-3 font-semibold">לקוח</th>
                  <th className="px-4 py-3 font-semibold">תאריך</th>
                  <th className="px-4 py-3 font-semibold text-left">סכום</th>
                  <th className="px-4 py-3 font-semibold">סטטוס</th>
                  <th className="px-4 py-3 font-semibold">עודכן</th>
                  <th className="px-4 py-3 font-semibold w-20"></th>
                </tr>
              </thead>
              <tbody>
                {quotes.map((q) => (
                  <tr key={q.id} className="border-b border-[#2D2926]/5 last:border-b-0 hover:bg-[#F5F4F0]/40 transition-colors">
                    <td className="px-4 py-3 font-mono text-[#2D2926]">
                      {q.quote_number || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/quotes?id=${q.id}`}
                        className="text-[#2D2926] font-semibold hover:text-[#8D775F]"
                      >
                        {q.customer_name || <span className="text-[#2D2926]/40 italic">ללא שם</span>}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-[#2D2926]/70">
                      {fmtDate(q.issue_date)}
                    </td>
                    <td className="px-4 py-3 text-left font-mono font-semibold text-[#2D2926]">
                      {fmtCurrency(q.total_before_vat)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${STATUS_STYLE[q.status] || "bg-gray-100 text-gray-700"}`}>
                        {STATUS_LABELS[q.status] || q.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#2D2926]/60 text-xs">
                      {fmtRelative(q.updated_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Link
                          href={`/admin/quotes?id=${q.id}`}
                          className="p-1.5 text-[#8D775F] hover:bg-[#8D775F]/10 rounded transition-colors"
                          title="פתח לעריכה"
                        >
                          <ExternalLink size={14} />
                        </Link>
                        <button
                          onClick={() => handleDelete(q.id, q.customer_name)}
                          className="p-1.5 text-[#2D2926]/50 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="מחק"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
