"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, ChevronRight, FileText } from "lucide-react";

type AuthState = "loading" | "unauthenticated" | "admin";

export default function QuoteGeneratorClient() {
  const [auth, setAuth] = useState<AuthState>("loading");
  const [adminName, setAdminName] = useState<string>("");

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
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Loading state ───────────────────────────────────────────────────────────
  if (auth === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F4F0]">
        <Loader2 className="animate-spin text-[#8D775F]" size={32} strokeWidth={1.5} />
      </div>
    );
  }

  // ── Not authenticated — point user to the admin portal ──────────────────────
  if (auth === "unauthenticated") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F5F4F0] p-8 text-center">
        <FileText size={32} strokeWidth={1.5} className="text-[#8D775F] mb-4" />
        <p className="text-[#8D775F] text-xs font-bold tracking-[0.28em] uppercase mb-2">
          מחולל הצעות מחיר
        </p>
        <h1 className="text-[#2D2926] text-xl font-semibold mb-2">נדרשת התחברות</h1>
        <p className="text-[#2D2926]/70 text-sm mb-6 max-w-sm">
          רק מנהלים יכולים לגשת למחולל ההצעות
        </p>
        <Link
          href="/admin"
          className="text-[#8D775F] underline text-sm hover:no-underline"
        >
          לעמוד ההתחברות ←
        </Link>
      </div>
    );
  }

  // ── Admin: render the iframe to the standalone quote generator HTML ────────
  return (
    <div className="min-h-screen flex flex-col bg-[#F5F4F0]">
      {/* Slim top bar with breadcrumb + admin name */}
      <header className="bg-white border-b border-[#2D2926]/10 px-4 py-2 flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center gap-2 text-sm">
          <Link
            href="/admin/hub"
            className="text-[#8D775F] flex items-center gap-1 hover:underline"
          >
            <ChevronRight size={14} />
            Hub
          </Link>
          <span className="text-[#2D2926]/40">/</span>
          <span className="text-[#2D2926] font-semibold flex items-center gap-1.5">
            <FileText size={14} strokeWidth={2} />
            מחולל הצעות מחיר
          </span>
        </div>
        {adminName && (
          <div className="text-[#2D2926]/60 text-xs">
            מחובר כ-<span className="font-semibold text-[#2D2926]">{adminName}</span>
          </div>
        )}
      </header>

      {/* The generator itself, sandboxed in an iframe.
          Uses localStorage (same origin) so all data persists naturally. */}
      <iframe
        src="/admin-tools/quote-generator.html"
        className="flex-1 w-full border-0 bg-white"
        title="מחולל הצעות מחיר"
      />
    </div>
  );
}
