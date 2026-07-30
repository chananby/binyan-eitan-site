"use client";

/**
 * AdminSidebar — grouped side navigation for the admin portal, built ALONGSIDE
 * the existing horizontal tab row (stage 2, behind a flag). It reuses the same
 * navigation the tab row uses: items are real <a href> anchors that call the
 * portal's own tabHref/onTabClick (→ goToTab → hash + pushState), so deep-links,
 * Ctrl/middle-click, the back button, refresh, and shared URLs behave
 * identically. This component owns ZERO navigation logic and no state beyond
 * presentation.
 *
 * Desktop: a fixed rail on the RTL start (right). Collapsible to an icon rail
 * (native title tooltips). Mobile: a drawer opened from a hamburger, closes on
 * selection. Badges (attendance / join_requests / collections) render on the
 * item, and as a small dot-number when collapsed.
 */

import React from "react";
import { X, ChevronRight, ChevronLeft } from "lucide-react";

export interface SidebarItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  badge: number;
  href: string;
}
export interface SidebarGroup {
  /** null → an ungrouped block (dashboard on top, account pinned to the bottom). */
  label: string | null;
  /** account block → pushed to the bottom of the rail. */
  footer?: boolean;
  items: SidebarItem[];
}

export default function AdminSidebar(p: {
  groups: SidebarGroup[];
  activeKey: string;
  /** The portal's own tab-anchor click handler (modifier-aware → goToTab). */
  onItemClick: (e: React.MouseEvent<HTMLAnchorElement>, key: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}) {
  function isPlainClick(e: React.MouseEvent) {
    return e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey;
  }

  function renderItem(it: SidebarItem, collapsed: boolean) {
    const active = it.key === p.activeKey;
    return (
      <a
        key={it.key}
        href={it.href}
        onClick={(e) => {
          p.onItemClick(e, it.key);
          if (isPlainClick(e)) p.onCloseMobile(); // no-op on desktop
        }}
        aria-current={active ? "page" : undefined}
        title={collapsed ? it.label : undefined}
        className={`relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-content font-semibold no-underline transition-colors ${
          collapsed ? "justify-center" : ""
        } ${active ? "bg-accent/10 text-accent" : "text-charcoal/80 hover:bg-charcoal/[0.04] hover:text-charcoal"}`}
      >
        <span className="shrink-0 flex items-center">{it.icon}</span>
        {!collapsed && <span className="flex-1 truncate">{it.label}</span>}
        {it.badge > 0 && (
          <span
            className={`bg-red-500 text-white text-micro font-bold rounded-full flex items-center justify-center leading-none ${
              collapsed ? "absolute top-1 end-1 min-w-[15px] h-[15px] px-1" : "min-w-[16px] h-4 px-1"
            }`}
            aria-label={`${it.badge} ממתינים`}
          >
            {it.badge > 99 ? "99+" : it.badge}
          </span>
        )}
      </a>
    );
  }

  function renderNav(collapsed: boolean) {
    return (
      <nav className="flex flex-col gap-0.5 h-full">
        {p.groups.map((g, gi) => (
          <div key={gi} className={g.footer ? "mt-auto pt-2 border-t border-charcoal/10" : ""}>
            {g.label && !collapsed && (
              <p className="px-2.5 pt-4 pb-1 text-micro font-semibold uppercase tracking-[0.14em] text-charcoal/45">
                {g.label}
              </p>
            )}
            {/* Collapsed: a hairline separates groups instead of a text header. */}
            {g.label && collapsed && gi > 0 && <div className="my-1.5 mx-2 border-t border-charcoal/10" />}
            {g.items.map((it) => renderItem(it, collapsed))}
          </div>
        ))}
      </nav>
    );
  }

  return (
    <>
      {/* Desktop rail — fixed on the RTL start (right). */}
      <aside
        className={`hidden md:flex fixed top-0 bottom-0 start-0 z-30 flex-col bg-white border-e border-charcoal/10 shadow-sm transition-[width] duration-200 ${
          p.collapsed ? "w-[60px]" : "w-[240px]"
        }`}
      >
        <div className="flex items-center justify-between px-2.5 py-3 border-b border-charcoal/10">
          {!p.collapsed && (
            <span className="text-micro font-bold tracking-wider uppercase text-accent/70">ניווט</span>
          )}
          <button
            onClick={p.onToggleCollapse}
            title={p.collapsed ? "הרחב תפריט" : "כווץ תפריט"}
            aria-label={p.collapsed ? "הרחב תפריט" : "כווץ תפריט"}
            className={`p-1.5 rounded text-charcoal/50 hover:text-accent hover:bg-charcoal/[0.04] ${p.collapsed ? "mx-auto" : ""}`}
          >
            {p.collapsed ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-2 py-2">{renderNav(p.collapsed)}</div>
      </aside>

      {/* Mobile drawer — always expanded; opens from the hamburger in the header. */}
      {p.mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label="תפריט ניווט">
          <div className="absolute inset-0 bg-charcoal/40" onClick={p.onCloseMobile} />
          <aside className="absolute top-0 bottom-0 start-0 w-[260px] bg-white shadow-xl flex flex-col">
            <div className="flex items-center justify-between px-3 py-3 border-b border-charcoal/10">
              <span className="text-micro font-bold tracking-wider uppercase text-accent/70">ניווט</span>
              <button onClick={p.onCloseMobile} aria-label="סגור תפריט" className="p-1.5 text-charcoal/60 hover:text-accent">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-2 py-2">{renderNav(false)}</div>
          </aside>
        </div>
      )}
    </>
  );
}
