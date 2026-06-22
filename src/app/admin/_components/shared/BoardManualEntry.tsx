"use client";

// BoardManualEntry — the "+ עובד ידני" + "+ אתר ידני" pair that sits
// below the assignment board. Pulled out of BoardTab so the tab stays
// under the 400-line ceiling AND so the form behaviour is one self-
// contained chunk: input → dropdown → submit, no shared state with the
// drag-and-drop layer.
//
// A "manual project" only materialises as a column once a manual worker
// is assigned to it. The "set as next target" button writes the name
// into the target dropdown so the very next "add manual worker" lands
// on it; we never insert an empty manual column.

import { useState } from "react";
import { Plus } from "lucide-react";

export interface ManualEntryTargetOption {
  /** Encoded id matching BoardTab's column ids ("project:<uuid>" or "manual:<name>"). */
  value: string;
  /** Human label shown in the dropdown. */
  label: string;
}

interface Props {
  targetOptions: ManualEntryTargetOption[];
  /** Submitted with a fully-encoded targetId — the parent decodes back
   *  to project_id / project_name before calling the API. */
  onAddWorker: (workerName: string, targetId: string) => Promise<void>;
  /** Returns the encoded id for a fresh "manual:<name>" target so the
   *  parent can stash it into its state. */
  onStageManualProject: (projectName: string) => void;
  posting: boolean;
}

function manualProjectId(name: string): string {
  return `manual:${name}`;
}

export default function BoardManualEntry({ targetOptions, onAddWorker, onStageManualProject, posting }: Props) {
  const [workerName, setWorkerName]     = useState("");
  const [workerTarget, setWorkerTarget] = useState("");
  const [projectName, setProjectName]   = useState("");

  const workerReady = workerName.trim() && workerTarget;
  const projectReady = projectName.trim();

  async function submitWorker() {
    if (!workerReady) return;
    await onAddWorker(workerName.trim(), workerTarget);
    setWorkerName("");
  }
  function submitProject() {
    if (!projectReady) return;
    const id = manualProjectId(projectName.trim());
    onStageManualProject(projectName.trim());
    setWorkerTarget(id);
    setProjectName("");
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-charcoal/10">
      <div className="bg-white border border-charcoal/10 rounded-md p-3 space-y-2">
        <p className="font-heading text-sm font-bold text-charcoal flex items-center gap-1.5">
          <Plus size={13} className="text-accent" /> עובד ידני
        </p>
        <input
          value={workerName}
          onChange={(e) => setWorkerName(e.target.value)}
          placeholder="שם העובד"
          className="w-full border border-charcoal/15 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-accent"
        />
        <select
          value={workerTarget}
          onChange={(e) => setWorkerTarget(e.target.value)}
          className="w-full border border-charcoal/15 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-accent"
        >
          <option value="">— בחר אתר —</option>
          {targetOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <button
          type="button"
          onClick={submitWorker}
          disabled={posting || !workerReady}
          className="w-full bg-accent text-bone py-1.5 rounded text-sm font-semibold hover:bg-accent-dark disabled:opacity-40 transition-colors"
        >
          הוסף לאתר
        </button>
      </div>

      <div className="bg-white border border-charcoal/10 rounded-md p-3 space-y-2">
        <p className="font-heading text-sm font-bold text-charcoal flex items-center gap-1.5">
          <Plus size={13} className="text-amber-500" /> אתר ידני (זמני)
        </p>
        <p className="font-body text-[0.7rem] text-charcoal/50 leading-snug">
          הוסף שם של אתר זמני — הוא יוגדר כיעד הבא לטופס "עובד ידני". העמודה נוצרת ברגע שמשובץ אליה עובד ראשון.
        </p>
        <input
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          placeholder='שם האתר (למשל: "בית שמש זמני")'
          className="w-full border border-charcoal/15 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-accent"
        />
        <button
          type="button"
          onClick={submitProject}
          disabled={!projectReady}
          className="w-full border border-amber-300 text-amber-700 bg-amber-50 py-1.5 rounded text-sm font-semibold hover:bg-amber-100 disabled:opacity-40 transition-colors"
        >
          הגדר כיעד הבא
        </button>
      </div>
    </div>
  );
}
