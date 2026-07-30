import type { Metadata } from "next";

// The entire /admin tree is auth-gated and renders per-request — it never
// benefited from static generation. Until now it was dynamic only as a side
// effect of the root layout's headers() read; with that removed (static root),
// admin pages would attempt to prerender and fail (e.g. useSearchParams in
// /admin/quotes and /admin/reset-password bail out of CSR during export).
// Declaring the segment dynamic here restores the prior behavior in one place.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // The admin-portal class is a stable hook that globals.css targets via
  // `html:has(.admin-portal)` to disable the marketing site's smooth
  // scrolling for /admin routes. Without this, the browser animates
  // focus-restore scrolls after every modal close (e.g. AssignCellDialog
  // in the schedule tab), which reads as "the page is drifting on its
  // own after every action". `scroll-behavior` cascades from the scroll
  // container (html), so a nested override wouldn't work — the parent
  // hook + `:has()` is the minimum-blast-radius way to keep the
  // marketing site smooth while making /admin snap.
  return <div className="admin-portal">{children}</div>;
}
