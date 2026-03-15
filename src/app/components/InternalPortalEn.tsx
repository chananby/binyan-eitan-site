"use client";

import Link from "next/link";
import { FileText, ClipboardList, Package, Clock, ArrowRight } from "lucide-react";

const tools = [
  {
    href: "/en/change-order",
    icon: FileText,
    title: "Change Order Form",
    desc: "Report changes, plan updates, and approval requests from the field",
    available: true,
  },
  {
    href: "/en/internal/attendance",
    icon: Clock,
    title: "Attendance Clock",
    desc: "Check in/out with phone verification and GPS logging",
    available: true,
  },
  {
    href: "#",
    icon: ClipboardList,
    title: "Daily Log",
    desc: "Document site activity, workforce, and project milestones",
    available: false,
  },
  {
    href: "#",
    icon: Package,
    title: "Supply Request",
    desc: "Order materials and equipment for the construction site",
    available: false,
  },
];

export default function InternalPortalEn() {
  return (
    <main className="min-h-screen bg-bone" dir="ltr">
        <div className="mx-auto max-w-3xl px-6 py-16 md:py-24">
          <div className="mb-12">
            <p className="font-body text-[0.65rem] font-semibold tracking-[0.22em] uppercase text-accent mb-3">
              Binyan Eitan — Internal Portal
            </p>
            <h1 className="font-heading text-3xl font-bold text-charcoal md:text-4xl">Staff Portal</h1>
            <p className="mt-3 font-body text-sm text-charcoal/50">
              Tools for project staff use only. This page does not appear in search results.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tools.map((tool) => {
              const Icon = tool.icon;
              const card = (
                <div className={`group relative flex flex-col gap-4 border p-6 transition-all duration-200 ${
                  tool.available
                    ? "border-charcoal/12 bg-white hover:border-accent/40 hover:shadow-sm cursor-pointer"
                    : "border-charcoal/07 bg-charcoal/[0.02] opacity-50 cursor-not-allowed"
                }`}>
                  <div className="flex items-start justify-between">
                    <div className={`p-2 ${tool.available ? "bg-accent/[0.08]" : "bg-charcoal/[0.05]"}`}>
                      <Icon size={18} className={tool.available ? "text-accent" : "text-charcoal/40"} strokeWidth={1.5} />
                    </div>
                    {!tool.available && (
                      <span className="font-body text-[0.55rem] tracking-[0.18em] uppercase text-charcoal/30 border border-charcoal/10 px-1.5 py-0.5">
                        Coming Soon
                      </span>
                    )}
                    {tool.available && (
                      <ArrowRight size={14} className="text-charcoal/20 group-hover:text-accent transition-colors duration-200 mt-0.5" strokeWidth={1.5} />
                    )}
                  </div>
                  <div>
                    <h2 className="font-heading text-base font-bold text-charcoal mb-1">{tool.title}</h2>
                    <p className="font-body text-xs text-charcoal/50 leading-relaxed">{tool.desc}</p>
                  </div>
                </div>
              );
              return tool.available ? (
                <Link key={tool.title} href={tool.href} className="block">{card}</Link>
              ) : (
                <div key={tool.title}>{card}</div>
              );
            })}
          </div>

          <div className="mt-12 pt-8 border-t border-charcoal/10">
            <Link href="/en" className="font-body text-xs text-charcoal/35 hover:text-charcoal/60 transition-colors duration-200 tracking-wide">
              ← Back to site
            </Link>
          </div>
        </div>
      </main>
  );
}
