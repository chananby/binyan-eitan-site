"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Download, Trash2, FileText, Upload, AlertCircle } from "lucide-react";

// Inline "Documents" block in the edit-worker form. Lists existing
// documents (free-text name, mime, uploaded date) and offers a small
// upload form. Renders only when editing a worker (a staffId exists);
// the parent doesn't pass one for the add-form because the worker
// doesn't have an id yet.
//
// SECURITY: all four endpoints behind this component are admin-only and
// stream document bytes through the server. No URL is exposed to the
// browser that could be shared or scraped.

interface DocRow {
  id: string;
  file_name: string;
  mime_type: string | null;
  file_size: number | null;
  uploaded_by: string | null;
  uploaded_at: string;
}

interface Props {
  staffId: string;
}

function formatSize(n: number | null): string {
  if (!n || n <= 0) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch { return iso; }
}

export default function StaffDocumentsSection({ staffId }: Props) {
  const [docs, setDocs]       = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr]         = useState<string | null>(null);

  // Upload form state
  const [file, setFile]         = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);

  // Per-row spinners — keeps the download/delete actions responsive
  // without blocking other rows.
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchDocs = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      const res = await fetch(`/api/admin/staff/${staffId}/documents`);
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? `שגיאה ${res.status}`);
      }
      const d = await res.json();
      setDocs(d.documents ?? []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [staffId]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { setUploadErr("בחר קובץ"); return; }
    setUploading(true); setUploadErr(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (fileName.trim()) fd.append("file_name", fileName.trim());
      const res = await fetch(`/api/admin/staff/${staffId}/documents`, {
        method: "POST",
        body: fd,
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setUploadErr(d.error ?? `שגיאה ${res.status}`);
        return;
      }
      setFile(null); setFileName("");
      // Reset the file-input element by remounting the form via a key
      // trick — simpler: clear via ref query. Inline form is small
      // enough that re-fetching the list refreshes the UI cleanly.
      const fileInput = document.getElementById(`staff-doc-file-${staffId}`) as HTMLInputElement | null;
      if (fileInput) fileInput.value = "";
      await fetchDocs();
    } catch (ex) {
      setUploadErr(ex instanceof Error ? ex.message : String(ex));
    } finally {
      setUploading(false);
    }
  }

  async function download(doc: DocRow) {
    setDownloadingId(doc.id);
    try {
      const res = await fetch(`/api/admin/staff/${staffId}/documents/${doc.id}`);
      if (!res.ok) {
        alert("שגיאה בהורדה: " + res.status);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      // Open in a new tab so PDFs/images render natively; the browser's
      // own "Save As" lets the admin keep a local copy.
      window.open(url, "_blank");
      // Revoke after a short delay so the new tab can finish loading.
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } finally {
      setDownloadingId(null);
    }
  }

  async function remove(doc: DocRow) {
    if (!confirm(`למחוק את "${doc.file_name}"? פעולה לא הפיכה.`)) return;
    setDeletingId(doc.id);
    try {
      const res = await fetch(`/api/admin/staff/${staffId}/documents/${doc.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        alert("שגיאה במחיקה: " + (d.error ?? res.status));
        return;
      }
      setDocs(p => p.filter(d => d.id !== doc.id));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <details className="border border-charcoal/10 rounded-sm p-3 bg-bone-dark/30">
      <summary className="cursor-pointer text-micro font-semibold text-charcoal/70 uppercase tracking-wider">
        מסמכים ({docs.length})
      </summary>
      <div className="mt-3 space-y-3">
        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-3 text-charcoal/70">
            <Loader2 size={14} className="animate-spin" />
            <span className="text-caption">טוען…</span>
          </div>
        ) : err ? (
          <p className="flex items-center gap-1.5 text-caption text-red-600">
            <AlertCircle size={12} /> {err}
          </p>
        ) : docs.length === 0 ? (
          <p className="text-caption text-charcoal/70 text-center py-2">אין עדיין מסמכים מצורפים</p>
        ) : (
          <div className="divide-y divide-charcoal/8 border border-charcoal/10 bg-white">
            {docs.map(d => (
              <div key={d.id} className="flex items-center gap-2 px-2.5 py-2">
                <FileText size={13} strokeWidth={1.5} className="text-charcoal/70 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-content font-semibold truncate" title={d.file_name}>{d.file_name}</p>
                  <p className="text-caption text-charcoal/70">
                    {formatDate(d.uploaded_at)} · {formatSize(d.file_size)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => download(d)}
                  disabled={downloadingId === d.id}
                  className="text-micro text-accent hover:text-accent-dark p-1 disabled:opacity-40"
                  title="הורד / פתח"
                >
                  {downloadingId === d.id
                    ? <Loader2 size={12} className="animate-spin" />
                    : <Download size={12} strokeWidth={1.5} />}
                </button>
                <button
                  type="button"
                  onClick={() => remove(d)}
                  disabled={deletingId === d.id}
                  className="text-micro text-red-500 hover:text-red-700 p-1 disabled:opacity-40"
                  title="מחק"
                >
                  {deletingId === d.id
                    ? <Loader2 size={12} className="animate-spin" />
                    : <Trash2 size={12} strokeWidth={1.5} />}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Upload form */}
        <form onSubmit={submit} className="border-t border-charcoal/10 pt-3 space-y-2">
          <p className="text-micro font-semibold text-charcoal/70 uppercase tracking-wider">
            העלאת מסמך חדש
          </p>
          <input
            id={`staff-doc-file-${staffId}`}
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif"
            onChange={e => setFile(e.target.files?.[0] ?? null)}
            className="w-full text-content file:me-2 file:py-1.5 file:px-3 file:text-micro file:font-semibold file:bg-accent file:text-bone file:border-0 file:cursor-pointer cursor-pointer"
          />
          <input
            type="text"
            value={fileName}
            onChange={e => setFileName(e.target.value)}
            placeholder='שם המסמך (לדוגמה: "ת.ז. — קדמי")'
            maxLength={200}
            className="w-full border border-charcoal/20 bg-white px-2 py-1.5 text-content focus:outline-none focus:border-accent"
          />
          {uploadErr && (
            <p className="flex items-center gap-1.5 text-caption text-red-600">
              <AlertCircle size={12} /> {uploadErr}
            </p>
          )}
          <button
            type="submit"
            disabled={uploading || !file}
            className="w-full bg-accent text-bone py-1.5 text-micro font-semibold tracking-wider uppercase hover:bg-accent-dark disabled:opacity-40 transition-colors flex items-center justify-center gap-1.5"
          >
            {uploading
              ? <><Loader2 size={12} className="animate-spin" /> מעלה…</>
              : <><Upload size={12} /> העלה</>}
          </button>
          <p className="text-caption text-charcoal/70">
            PDF / JPG / PNG / WEBP / HEIC · עד 10MB
          </p>
        </form>
      </div>
    </details>
  );
}
