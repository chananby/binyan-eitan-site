"use client";

// BoardManualEntry — the "+ עובד ידני" + "+ הוסף אתר" pair that sits
// below the assignment board. Pulled out of BoardTab so the tab stays
// under the 400-line ceiling AND so the form behaviour is one self-
// contained chunk: input → dropdown → submit, no shared state with the
// drag-and-drop layer.
//
// "הוסף אתר" creates a persistent manual column the moment the admin
// clicks it (POST /api/admin/board-manual-projects via the parent),
// so a fresh column appears immediately and is shared across admins.
// The newly-created name is also stashed as the "next target" in the
// worker form, so the natural flow (create site → drop a worker on it)
// is one continuous gesture.

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
  /** Persist a new manual site server-side. The parent POSTs and
   *  refreshes the board; resolves with the encoded "manual:<name>"
   *  column id on success so the form can stage it as the next worker
   *  target. Resolves null on failure (the parent surfaces the error). */
  onAddManualProject: (projectName: string) => Promise<string | null>;
  posting: boolean;
}

export default function BoardManualEntry({ targetOptions, onAddWorker, onAddManualProject, posting }: Props) {
  const [workerName, setWorkerName]     = useState("");
  const [workerTarget, setWorkerTarget] = useState("");
  const [projectName, setProjectName]   = useState("");
  const [projectPosting, setProjectPosting] = useState(false);

  const workerReady = workerName.trim() && workerTarget;
  const projectReady = projectName.trim().length > 0;

  async function submitWorker() {
    if (!workerReady) return;
    await onAddWorker(workerName.trim(), workerTarget);
    setWorkerName("");
  }
  async function submitProject() {
    if (!projectReady || projectPosting) return;
    setProjectPosting(true);
    const id = await onAddManualProject(projectName.trim());
    setProjectPosting(false);
    if (!id) return; // parent surfaced the error already
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
          <Plus size={13} className="text-accent" /> הוסף אתר
        </p>
        <p className="font-body text-xs text-charcoal/65 leading-snug">
          הוסף עמודת אתר חדשה. ניתן לגרור עובדים אליה.
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
          disabled={projectPosting || !projectReady}
          className="w-full bg-accent text-bone py-1.5 rounded text-sm font-semibold hover:bg-accent-dark disabled:opacity-40 transition-colors"
        >
          הוסף אתר
        </button>
      </div>
    </div>
  );
}
