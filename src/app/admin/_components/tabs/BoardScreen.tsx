"use client";

/**
 * BoardScreen — sub-tab host for the admin "שיבוץ" tab.
 *
 *   "live"     → the existing drag-and-drop board (BoardTab, untouched).
 *   "schedule" → the new weekly worker-schedule view (ScheduleTab,
 *                read-only in PR 2; edit lands in PR 3).
 *
 * Mounted by AdminPortal where <BoardTab /> used to be mounted directly.
 * Owns nothing but the sub-tab state — both children manage their own
 * data fetches.
 */

import { useState } from "react";
import { Users, Calendar } from "lucide-react";
import BoardTab from "./BoardTab";
import ScheduleTab from "./ScheduleTab";

type SubTab = "live" | "schedule";

export default function BoardScreen() {
  const [subTab, setSubTab] = useState<SubTab>("live");

  return (
    <div className="space-y-3">
      {/* Sub-tab bar — same idiom as AttendanceTab's live/history. */}
      <div className="flex border-b border-charcoal/10">
        <SubTabButton
          active={subTab === "live"}
          onClick={() => setSubTab("live")}
          icon={<Users size={13} strokeWidth={1.5} />}
        >
          לוח חי
        </SubTabButton>
        <SubTabButton
          active={subTab === "schedule"}
          onClick={() => setSubTab("schedule")}
          icon={<Calendar size={13} strokeWidth={1.5} />}
        >
          תכנון שבועי
        </SubTabButton>
      </div>

      {subTab === "live"     && <BoardTab />}
      {subTab === "schedule" && <ScheduleTab />}
    </div>
  );
}

function SubTabButton({
  active, onClick, icon, children,
}: {
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex items-center gap-1.5 px-3 py-2 text-xs font-semibold tracking-wide border-b-2 transition-colors duration-150 ${
        active ? "border-accent text-accent" : "border-transparent text-charcoal/70 hover:text-charcoal/70"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}
