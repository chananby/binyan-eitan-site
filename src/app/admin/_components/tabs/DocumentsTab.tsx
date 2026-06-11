"use client";

// Documents tab — entry point from the admin portal to the financial-inbox
// screen (which lives at its own route, /admin/documents). Same link-card
// pattern as QuotesTab. Navigates in-place (not a new tab) since the inbox is
// a primary mobile workflow with its own header/back-nav.

import React from "react";
import Link from "next/link";
import { Inbox, ChevronLeft } from "lucide-react";
import { Card } from "../shared/Card";

export default function DocumentsTab() {
  return (
    <div className="space-y-5">
      <Link href="/admin/documents"
        className="group block bg-white border border-warm-gray-light shadow-sm p-6 hover:border-accent hover:shadow transition-all duration-200">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center size-12 bg-accent/10 text-accent shrink-0">
            <Inbox size={24} strokeWidth={1.5} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-heading text-base font-bold text-charcoal flex items-center gap-1.5">
              תיבת אסמכתאות
              <ChevronLeft size={15} className="text-charcoal/30 group-hover:text-accent transition-colors" />
            </p>
            <p className="text-xs text-charcoal/55 mt-0.5">העלאה, חילוץ אוטומטי, סקירה ואישור של חשבוניות וקבלות</p>
          </div>
        </div>
      </Link>

      <Card>
        <p className="text-xs text-charcoal/55 leading-relaxed">
          צלם או העלה חשבונית/קבלה — המערכת מחלצת את הספק, הסכום והסוג אוטומטית.
          האסמכתאות ממתינות לאישורך בתיבה, ומשם אפשר לערוך ולאשר.
        </p>
      </Card>
    </div>
  );
}
