"use client";

// Gallery manager — round 1 (management only).
//
// Lets the admin upload marketing-gallery images per project into Vercel Blob
// and catalogue them in gallery_images (list / reorder / set-cover / delete).
// The PUBLIC gallery still renders from the hard-coded GALLERY_PROJECTS array
// in lib/projects.ts — nothing here feeds it yet (round 2 does the migration).
//
// The project picker imports GALLERY_PROJECTS read-only so it always matches
// the live project list without duplicating it.
//
// Bulk upload: each file is downscaled on the client (lib/image-resize —
// ~1920px, q0.8, ~3–5 MB → ~200–500 KB) then POSTed one-file-per-request with
// bounded concurrency, so every file gets a progress tick and a single failure
// isolates to that file instead of dropping the batch.

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Upload, Star, Trash2, ChevronUp, ChevronDown, Loader2, AlertCircle, Images,
} from "lucide-react";
import { Card } from "../shared/Card";
import { GALLERY_PROJECTS } from "../../../../lib/projects";
import { resizeImageToBlob } from "../../../../lib/image-resize";

interface GalleryImage {
  id: string;
  project_slug: string;
  url: string;
  sort_order: number;
  is_cover: boolean;
  category: string | null;
  alt_he: string | null;
  alt_en: string | null;
  created_at: string;
}

const PROJECTS = GALLERY_PROJECTS.map((p) => ({ slug: p.id, title: p.he.title }));
const UPLOAD_CONCURRENCY = 3;

export default function GalleryTab() {
  const [slug, setSlug] = useState<string>(PROJECTS[0]?.slug ?? "");
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [listErr, setListErr] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);
  const [uploadTotal, setUploadTotal] = useState(0);
  const [uploadDone, setUploadDone] = useState(0);
  const [failures, setFailures] = useState<{ name: string; reason: string }[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadImages = useCallback(async (s: string) => {
    if (!s) return;
    setLoading(true);
    setListErr(null);
    try {
      const res = await fetch(`/api/admin/gallery?project=${encodeURIComponent(s)}`);
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setListErr(d.error ?? `שגיאה ${res.status}`);
        return;
      }
      const d = await res.json();
      setImages(d.images ?? []);
    } catch (e) {
      setListErr(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadImages(slug);
  }, [slug, loadImages]);

  // ── Bulk upload (client resize → parallel one-file POSTs) ──────────────────
  async function uploadFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    if (files.length === 0 || uploading) return;

    setUploading(true);
    setUploadTotal(files.length);
    setUploadDone(0);
    setFailures([]);

    const queue = [...files];
    const batchFailures: { name: string; reason: string }[] = [];
    let done = 0;

    async function worker() {
      while (queue.length) {
        const file = queue.shift();
        if (!file) break;
        try {
          const blob = await resizeImageToBlob(file);
          const fd = new FormData();
          const base = (file.name.replace(/\.[^.]+$/, "") || "image").slice(0, 60);
          fd.append("file", blob, `${base}.jpg`);
          fd.append("project_slug", slug);
          const res = await fetch("/api/admin/gallery/upload", { method: "POST", body: fd });
          if (!res.ok) {
            const d = await res.json().catch(() => ({}));
            throw new Error(d.error || `שגיאה ${res.status}`);
          }
        } catch (e) {
          batchFailures.push({ name: file.name, reason: e instanceof Error ? e.message : String(e) });
        } finally {
          done++;
          setUploadDone(done);
        }
      }
    }

    await Promise.all(
      Array.from({ length: Math.min(UPLOAD_CONCURRENCY, files.length) }, worker),
    );

    setFailures(batchFailures);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    await loadImages(slug);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer?.files?.length) uploadFiles(e.dataTransfer.files);
  }

  // ── Per-image actions ──────────────────────────────────────────────────────
  async function deleteImage(id: string) {
    if (!window.confirm("למחוק את התמונה מהגלריה?")) return;
    const res = await fetch(`/api/admin/gallery/${id}`, { method: "DELETE" });
    if (res.ok) setImages((prev) => prev.filter((im) => im.id !== id));
    else alert("מחיקה נכשלה");
  }

  async function setCover(id: string) {
    const res = await fetch(`/api/admin/gallery/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_cover: true }),
    });
    if (res.ok) {
      setImages((prev) => prev.map((im) => ({ ...im, is_cover: im.id === id })));
    } else {
      alert("סימון שער נכשל");
    }
  }

  // Swap sort_order with the neighbour (reliable on mobile; no drag needed).
  async function move(index: number, dir: -1 | 1) {
    const j = index + dir;
    if (j < 0 || j >= images.length) return;
    const a = images[index];
    const b = images[j];

    // Optimistic reorder.
    const next = [...images];
    next[index] = b;
    next[j] = a;
    setImages(next);

    const [ra, rb] = await Promise.all([
      fetch(`/api/admin/gallery/${a.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sort_order: b.sort_order }),
      }),
      fetch(`/api/admin/gallery/${b.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sort_order: a.sort_order }),
      }),
    ]);
    if (!ra.ok || !rb.ok) {
      // Revert on failure and reload the authoritative order.
      await loadImages(slug);
    }
  }

  const uploadPct = uploadTotal > 0 ? Math.round((uploadDone / uploadTotal) * 100) : 0;

  return (
    <div className="space-y-4">
      <Card title="גלריית האתר — ניהול תמונות">
        <p className="text-caption text-charcoal/60">
          העלאת תמונות לגלריית אתר התדמית. התמונות מוקטנות אוטומטית לפני העלאה
          (~1920px). <strong>סבב 1 — ניהול בלבד:</strong> האתר הציבורי עדיין מציג
          מהרשימה הקבועה; המעבר לתצוגה מכאן יגיע בסבב 2.
        </p>

        {/* Project picker */}
        <div className="flex items-center gap-2 flex-wrap">
          <label className="text-caption font-semibold text-charcoal/80">פרויקט:</label>
          <select
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="border border-charcoal/20 rounded px-2 py-1 text-content bg-white"
          >
            {PROJECTS.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.title}
              </option>
            ))}
          </select>
        </div>

        {/* Drop zone + file picker */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            dragOver ? "border-accent bg-accent/5" : "border-charcoal/20"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            id="gallery-file-input"
            onChange={(e) => e.target.files && uploadFiles(e.target.files)}
          />
          <Upload size={22} strokeWidth={1.5} className="mx-auto mb-2 text-charcoal/40" />
          <label
            htmlFor="gallery-file-input"
            className="inline-block px-4 py-2 bg-accent text-white font-bold rounded cursor-pointer hover:bg-accent/90 transition-colors"
          >
            בחר תמונות
          </label>
          <p className="text-caption text-charcoal/50 mt-2">
            אפשר לבחור עשרות בבת אחת · או לגרור לכאן · בנייד נפתחת הגלריה/מצלמה
          </p>
        </div>

        {/* Progress */}
        {uploading && (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-caption text-charcoal/70">
              <Loader2 size={13} className="animate-spin" />
              עלו {uploadDone} מתוך {uploadTotal}
            </div>
            <div className="h-1.5 bg-charcoal/10 rounded overflow-hidden">
              <div className="h-full bg-accent transition-all" style={{ width: `${uploadPct}%` }} />
            </div>
          </div>
        )}

        {/* Failures from the last batch */}
        {failures.length > 0 && (
          <div className="border border-amber-300 bg-amber-50 rounded p-2 space-y-1">
            <div className="flex items-center gap-1.5 text-caption font-bold text-amber-700">
              <AlertCircle size={13} /> {failures.length} תמונות נכשלו (השאר עלו)
            </div>
            <ul className="text-caption text-amber-800/90 list-disc list-inside">
              {failures.map((f, i) => (
                <li key={i}>
                  {f.name} — {f.reason}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {/* Image grid */}
      <Card title={`תמונות בפרויקט (${images.length})`}>
        {loading ? (
          <div className="flex items-center gap-2 text-caption text-charcoal/60">
            <Loader2 size={14} className="animate-spin" /> טוען…
          </div>
        ) : listErr ? (
          <div className="flex items-center gap-1.5 text-caption text-red-600">
            <AlertCircle size={13} /> {listErr}
          </div>
        ) : images.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-charcoal/40">
            <Images size={28} strokeWidth={1.5} />
            <span className="text-caption">אין עדיין תמונות בפרויקט הזה</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {images.map((im, idx) => (
              <div
                key={im.id}
                className="relative group border border-charcoal/10 rounded-md overflow-hidden bg-charcoal/[0.03]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={im.url}
                  alt={im.alt_he ?? ""}
                  className="w-full aspect-square object-cover"
                  loading="lazy"
                />
                {im.is_cover && (
                  <span className="absolute top-1 start-1 inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-500 text-white text-caption font-bold rounded">
                    <Star size={10} strokeWidth={2.5} /> שער
                  </span>
                )}
                {/* Controls */}
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 p-1 bg-gradient-to-t from-black/60 to-transparent">
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => move(idx, -1)}
                      disabled={idx === 0}
                      title="הזז שמאלה"
                      className="p-1 text-white/90 hover:text-white disabled:opacity-30"
                    >
                      <ChevronUp size={15} className="rotate-[-90deg]" />
                    </button>
                    <button
                      onClick={() => move(idx, 1)}
                      disabled={idx === images.length - 1}
                      title="הזז ימינה"
                      className="p-1 text-white/90 hover:text-white disabled:opacity-30"
                    >
                      <ChevronDown size={15} className="rotate-[-90deg]" />
                    </button>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => setCover(im.id)}
                      title="סמן כתמונת שער"
                      className={`p-1 hover:text-amber-300 ${im.is_cover ? "text-amber-300" : "text-white/90"}`}
                    >
                      <Star size={15} strokeWidth={im.is_cover ? 2.5 : 1.8} />
                    </button>
                    <button
                      onClick={() => deleteImage(im.id)}
                      title="מחק"
                      className="p-1 text-white/90 hover:text-red-400"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
