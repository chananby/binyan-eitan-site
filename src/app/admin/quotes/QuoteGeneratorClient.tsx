"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2, ChevronRight, FileText, List } from "lucide-react";

type AuthState = "loading" | "unauthenticated" | "admin";

export default function QuoteGeneratorClient() {
  const [auth, setAuth] = useState<AuthState>("loading");
  const [adminName, setAdminName] = useState<string>("");
  const searchParams = useSearchParams();
  const quoteId = searchParams?.get("id") || "";

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

  // iframe → parent bridge:
  //  • quote-id-assigned: sync the URL so a browser refresh keeps the same quote.
  //  • quote-title:       mirror the iframe's document.title onto the parent tab.
  //  • quote-new:         the "new quote" button inside the iframe — drop ?id=
  //                       and reload so the iframe boots into a fresh defaultState.
  useEffect(() => {
    function onMsg(e: MessageEvent) {
      const d = e.data as { type?: string; id?: string; title?: string } | null;
      if (!d || typeof d !== "object") return;
      if (d.type === "quote-id-assigned" && d.id && !quoteId) {
        try {
          const url = new URL(window.location.href);
          url.searchParams.set("id", d.id);
          window.history.replaceState({}, "", url.toString());
        } catch {}
      } else if (d.type === "quote-title" && typeof d.title === "string") {
        document.title = d.title;
      } else if (d.type === "quote-new") {
        window.location.assign("/admin/quotes");
      }
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [quoteId]);

  if (auth === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F4F0]">
        <Loader2 className="animate-spin text-[#8D775F]" size={32} strokeWidth={1.5} />
      </div>
    );
  }

  if (auth === "unauthenticated") {
    const here = typeof window !== "undefined"
      ? window.location.pathname + window.location.search
      : "/admin/quotes";
    const loginHref = `/admin?redirectTo=${encodeURIComponent(here)}`;
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
          href={loginHref}
          className="text-[#8D775F] underline text-sm hover:no-underline"
        >
          לעמוד ההתחברות ←
        </Link>
      </div>
    );
  }

  // Pass the quote id through to the iframe via URL parameter so the HTML
  // can hydrate from the cloud when editing an existing quote.
  const iframeSrc = quoteId
    ? `/admin-tools/quote-generator.html?id=${encodeURIComponent(quoteId)}`
    : "/admin-tools/quote-generator.html";

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F4F0]">
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
          <Link
            href="/admin/quotes/list"
            className="text-[#8D775F] flex items-center gap-1 hover:underline"
          >
            רשימת הצעות
          </Link>
          <span className="text-[#2D2926]/40">/</span>
          <span className="text-[#2D2926] font-semibold flex items-center gap-1.5">
            <FileText size={14} strokeWidth={2} />
            {quoteId ? "עריכת הצעה" : "הצעה חדשה"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/quotes/list"
            className="text-[#8D775F] text-xs flex items-center gap-1 hover:underline"
          >
            <List size={13} />
            כל ההצעות
          </Link>
          {adminName && (
            <div className="text-[#2D2926]/60 text-xs">
              מחובר כ-<span className="font-semibold text-[#2D2926]">{adminName}</span>
            </div>
          )}
        </div>
      </header>

      <iframe
        src={iframeSrc}
        className="flex-1 w-full border-0 bg-white"
        title="מחולל הצעות מחיר"
      />
    </div>
  );
}
