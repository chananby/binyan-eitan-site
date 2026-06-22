"use client";

// Quotes tab — quick access from the admin portal to the (static) quote
// generator and the quotes-list page, both of which otherwise live outside
// the portal. Below the two action cards it shows the 5 most-recent quotes
// (read-only) pulled from the existing /api/admin/quotes endpoint, each
// linking to that quote in the generator — the same href the list page uses.

import React, { useEffect, useState } from "react";
import { FilePlus2, ListChecks, ExternalLink, Loader2, AlertCircle } from "lucide-react";
import { Card } from "../shared/Card";

const GENERATOR_URL = "/admin-tools/quote-generator.html";
const LIST_URL = "/admin/quotes/list";

interface RecentQuote {
  id: string;
  quote_number: string | null;
  customer_name: string | null;
  issue_date: string | null;
  total_before_vat: number | null;
}

function formatAmount(n: number | null): string {
  if (n == null) return "—";
  return "₪" + n.toLocaleString("he-IL", { maximumFractionDigits: 0 });
}

function formatDate(d: string | null): string {
  if (!d) return "";
  const [y, m, day] = d.slice(0, 10).split("-");
  return y && m && day ? `${day}/${m}/${y}` : d;
}

function ActionCard({ href, icon, title, subtitle }: {
  href: string; icon: React.ReactNode; title: string; subtitle: string;
}) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="group bg-white border border-warm-gray-light shadow-sm p-6 flex items-center gap-4 hover:border-accent hover:shadow transition-all duration-200">
      <div className="flex items-center justify-center size-12 bg-accent/10 text-accent shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-heading text-base font-bold text-charcoal flex items-center gap-1.5">
          {title}
          <ExternalLink size={13} className="text-charcoal/30 group-hover:text-accent transition-colors" />
        </p>
        <p className="text-xs text-charcoal/70 mt-0.5">{subtitle}</p>
      </div>
    </a>
  );
}

export default function QuotesTab() {
  const [quotes, setQuotes]   = useState<RecentQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/quotes?limit=5");
        if (!res.ok) throw new Error(`שגיאה ${res.status}`);
        const d = await res.json();
        if (!cancelled) setQuotes(d.quotes ?? []);
      } catch (e) {
        if (!cancelled) setError(String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ActionCard href={GENERATOR_URL} icon={<FilePlus2 size={24} strokeWidth={1.5} />}
          title="מחולל הצעות מחיר" subtitle="יצירת הצעת מחיר חדשה" />
        <ActionCard href={LIST_URL} icon={<ListChecks size={24} strokeWidth={1.5} />}
          title="רשימת הצעות" subtitle="צפייה וניהול ההצעות הקיימות" />
      </div>

      <Card title="הצעות אחרונות">
        {loading && (
          <div className="flex items-center gap-2 text-charcoal/70 text-sm py-3">
            <Loader2 size={14} className="animate-spin" /> טוען...
          </div>
        )}
        {!loading && error && (
          <p className="text-xs text-red-500 flex items-center gap-1.5"><AlertCircle size={12} /> {error}</p>
        )}
        {!loading && !error && quotes.length === 0 && (
          <p className="text-sm text-charcoal/70 text-center py-3">אין הצעות עדיין</p>
        )}
        {!loading && !error && quotes.length > 0 && (
          <div className="divide-y divide-charcoal/5">
            {quotes.map(q => (
              <a key={q.id} href={`/admin/quotes?id=${q.id}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-between gap-3 py-2.5 -mx-2 px-2 hover:bg-bone/50 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-[0.7rem] font-bold text-accent tabular-nums shrink-0">#{q.quote_number || "—"}</span>
                  <span className="text-sm font-semibold text-charcoal truncate">{q.customer_name || "ללא שם"}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-charcoal/60 tabular-nums hidden sm:block" dir="ltr">{formatDate(q.issue_date)}</span>
                  <span className="text-sm font-bold text-charcoal tabular-nums">{formatAmount(q.total_before_vat)}</span>
                </div>
              </a>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
