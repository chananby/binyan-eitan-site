"use client";

// Gallery manager — round 2 (DB-backed projects + images).
//
// Round 1 gave per-image upload into gallery_images. Round 2 adds full PROJECT
// management (gallery_projects): add / edit / publish / reorder / delete, with
// all the fields the public site shows (title he/en, category he/en, description
// he/en, filter categories, aspect, url_slug, order). The upload picker now
// reads projects from the DB (falling back to the hard-coded GALLERY_PROJECTS
// list only if the DB call returns nothing — e.g. before the content migration).
//
// The public /projects gallery reads these tables via /api/gallery (with the
// hard-coded array as a safety fallback). Uploads still ride Vercel Blob and
// downscale on the client (lib/image-resize).

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Upload, Star, Trash2, ChevronUp, ChevronDown, Loader2, AlertCircle, Images,
  Plus, Pencil, Eye, EyeOff, Save, X, Film, Check,
} from "lucide-react";
import { Card } from "../shared/Card";
import { GALLERY_PROJECTS } from "../../../../lib/projects";
import { resizeImageToBlob } from "../../../../lib/image-resize";
import {
  extractFramesAuto, framesToFiles, revokeFrames, FRAME_COUNT,
  type ExtractedFrame,
} from "../../../../lib/video-frames";

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

interface GalleryProjectRow {
  id: string;
  slug: string;
  url_slug: string;
  title_he: string;
  title_en: string;
  category_he: string;
  category_en: string;
  description_he: string;
  description_en: string;
  categories: string[];
  aspect: string;
  sort_order: number;
  is_published: boolean;
  created_at: string;
}

const CATEGORY_OPTIONS: { key: string; he: string }[] = [
  { key: "construction", he: "בינוי" }, { key: "renovations", he: "שיפוצים" },
  { key: "finish", he: "עבודות גמר" }, { key: "infrastructure", he: "תשתיות" },
  { key: "plastering", he: "טיח" }, { key: "painting", he: "צבע" },
  { key: "waterproofing", he: "איטום" }, { key: "tiling", he: "ריצוף וחיפוי" },
  { key: "aluminum", he: "אלומיניום" }, { key: "drywall", he: "גבס" },
  { key: "ac", he: "מיזוג אוויר" }, { key: "carpentry", he: "נגרות" },
  { key: "handover", he: "ניקיון ומסירה" }, { key: "before-after", he: "לפני ואחרי" },
];
const ASPECT_OPTIONS = ["4/3", "3/4", "16/9", "1/1"];
const UPLOAD_CONCURRENCY = 3;

type EditState = null | "new" | string; // null=closed, "new"=create, otherwise project id

interface ProjectForm {
  slug: string; url_slug: string;
  title_he: string; title_en: string;
  category_he: string; category_en: string;
  description_he: string; description_en: string;
  categories: string[]; aspect: string; is_published: boolean;
}
const EMPTY_FORM: ProjectForm = {
  slug: "", url_slug: "", title_he: "", title_en: "", category_he: "", category_en: "",
  description_he: "", description_en: "", categories: [], aspect: "4/3", is_published: true,
};

export default function GalleryTab() {
  // ── Projects ────────────────────────────────────────────────────────────────
  const [projects, setProjects] = useState<GalleryProjectRow[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsErr, setProjectsErr] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditState>(null);
  const [form, setForm] = useState<ProjectForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    setProjectsLoading(true);
    setProjectsErr(null);
    try {
      const res = await fetch("/api/admin/gallery/projects");
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setProjectsErr(d.error ?? `שגיאה ${res.status}`);
        return;
      }
      const d = await res.json();
      setProjects(d.projects ?? []);
    } catch (e) {
      setProjectsErr(String(e));
    } finally {
      setProjectsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Picker options: DB projects, or the hard-coded list as a pre-migration fallback.
  const pickerOptions =
    projects.length > 0
      ? projects.map((p) => ({ slug: p.slug, title: p.title_he || p.slug }))
      : GALLERY_PROJECTS.map((p) => ({ slug: p.id, title: p.he.title }));

  // ── Selected project for image upload/management ────────────────────────────
  const [slug, setSlug] = useState<string>("");
  useEffect(() => {
    // Default the image picker to the first available project once loaded.
    if (!slug && pickerOptions.length > 0) setSlug(pickerOptions[0].slug);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects]);

  // ── Project form actions ────────────────────────────────────────────────────
  function openNew() {
    setForm(EMPTY_FORM);
    setFormErr(null);
    setEditing("new");
  }
  function openEdit(p: GalleryProjectRow) {
    setForm({
      slug: p.slug, url_slug: p.url_slug, title_he: p.title_he, title_en: p.title_en,
      category_he: p.category_he, category_en: p.category_en,
      description_he: p.description_he, description_en: p.description_en,
      categories: p.categories ?? [], aspect: p.aspect, is_published: p.is_published,
    });
    setFormErr(null);
    setEditing(p.id);
  }
  function toggleFormCategory(key: string) {
    setForm((f) => ({
      ...f,
      categories: f.categories.includes(key)
        ? f.categories.filter((c) => c !== key)
        : [...f.categories, key],
    }));
  }

  async function saveProject() {
    setSaving(true);
    setFormErr(null);
    try {
      const isNew = editing === "new";
      const url = isNew ? "/api/admin/gallery/projects" : `/api/admin/gallery/projects/${editing}`;
      const method = isNew ? "POST" : "PATCH";
      // slug is immutable on edit — only send it when creating.
      const payload = isNew ? form : { ...form, slug: undefined };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setFormErr(d.error ?? `שגיאה ${res.status}`);
        return;
      }
      setEditing(null);
      await loadProjects();
    } catch (e) {
      setFormErr(String(e));
    } finally {
      setSaving(false);
    }
  }

  async function deleteProject(p: GalleryProjectRow) {
    if (!window.confirm(`למחוק את הפרויקט "${p.title_he || p.slug}"? (התמונות נשארות)`)) return;
    const res = await fetch(`/api/admin/gallery/projects/${p.id}`, { method: "DELETE" });
    if (res.ok) await loadProjects();
    else alert("מחיקה נכשלה");
  }

  async function togglePublish(p: GalleryProjectRow) {
    const res = await fetch(`/api/admin/gallery/projects/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_published: !p.is_published }),
    });
    if (res.ok) await loadProjects();
    else alert("עדכון פרסום נכשל");
  }

  async function moveProject(index: number, dir: -1 | 1) {
    const j = index + dir;
    if (j < 0 || j >= projects.length) return;
    const a = projects[index];
    const b = projects[j];
    const next = [...projects];
    next[index] = b;
    next[j] = a;
    setProjects(next);
    const [ra, rb] = await Promise.all([
      fetch(`/api/admin/gallery/projects/${a.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sort_order: b.sort_order }),
      }),
      fetch(`/api/admin/gallery/projects/${b.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sort_order: a.sort_order }),
      }),
    ]);
    if (!ra.ok || !rb.ok) await loadProjects();
  }

  // ── Images ──────────────────────────────────────────────────────────────────
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [listErr, setListErr] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadTotal, setUploadTotal] = useState(0);
  const [uploadDone, setUploadDone] = useState(0);
  const [failures, setFailures] = useState<{ name: string; reason: string }[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Video frame extraction (100% client-side; the video never leaves here) ──
  const [frames, setFrames] = useState<ExtractedFrame[]>([]);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [extracting, setExtracting] = useState(false);
  const [extractDone, setExtractDone] = useState(0);
  const [extractTotal, setExtractTotal] = useState(0);
  const [videoErr, setVideoErr] = useState<string | null>(null);
  // True once we've fallen back to ffmpeg.wasm — drives the "this will take
  // longer" notice so a slow decode doesn't look like a hang.
  const [slowPath, setSlowPath] = useState(false);
  const [passCount, setPassCount] = useState(0); // how many extraction passes so far
  const videoFileRef = useRef<File | null>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

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
    if (slug) loadImages(slug);
  }, [slug, loadImages]);

  async function uploadFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    if (files.length === 0 || uploading || !slug) return;
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

    await Promise.all(Array.from({ length: Math.min(UPLOAD_CONCURRENCY, files.length) }, worker));
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

  // ── Video → frames ──────────────────────────────────────────────────────────
  // Runs one extraction pass. `phase` interleaves a later pass halfway between
  // the previous timestamps ("חלץ עוד"). Frames are appended, never uploaded
  // automatically — the admin picks which ones go to the project.
  async function runExtraction(file: File, phase: number, append: boolean) {
    setExtracting(true);
    setVideoErr(null);
    setSlowPath(false);
    setExtractDone(0);
    setExtractTotal(FRAME_COUNT);
    try {
      const got = await extractFramesAuto(file, {
        phase,
        onProgress: (done, total) => { setExtractDone(done); setExtractTotal(total); },
        onFallback: () => { setSlowPath(true); setExtractDone(0); },
      });
      if (append) {
        setFrames((prev) => [...prev, ...got]);
      } else {
        setFrames((prev) => { revokeFrames(prev); return got; });
        setPicked(new Set());
      }
      setPassCount((n) => n + 1);
    } catch (e) {
      // Codec/decode failures surface here with a Hebrew message — never silent.
      setVideoErr(e instanceof Error ? e.message : "חילוץ התמונות מהסרטון נכשל");
    } finally {
      setExtracting(false);
    }
  }

  function onPickVideo(file: File | undefined) {
    if (!file || extracting) return;
    videoFileRef.current = file;
    setPassCount(0);
    runExtraction(file, 0, false);
  }

  function extractMore() {
    const f = videoFileRef.current;
    if (!f || extracting) return;
    // Each further pass shifts another half-slot so new timestamps interleave.
    runExtraction(f, passCount * 0.5, true);
  }

  function togglePick(i: number) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  function clearFrames() {
    revokeFrames(frames);
    setFrames([]);
    setPicked(new Set());
    setVideoErr(null);
    setPassCount(0);
    videoFileRef.current = null;
    if (videoInputRef.current) videoInputRef.current.value = "";
  }

  // Picked frames go through the EXISTING upload path (resize → same endpoint).
  async function uploadPickedFrames() {
    if (picked.size === 0 || uploading) return;
    const chosen = [...picked].sort((a, b) => a - b).map((i) => frames[i]).filter(Boolean);
    const base = (videoFileRef.current?.name.replace(/\.[^.]+$/, "") || "video").slice(0, 40);
    await uploadFiles(framesToFiles(chosen, base));
    clearFrames();
  }

  // Release preview object URLs if the tab unmounts mid-session.
  useEffect(() => {
    return () => { revokeFrames(frames); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function deleteImage(id: string) {
    if (!window.confirm("למחוק את התמונה מהגלריה?")) return;
    const res = await fetch(`/api/admin/gallery/${id}`, { method: "DELETE" });
    if (res.ok) setImages((prev) => prev.filter((im) => im.id !== id));
    else alert("מחיקה נכשלה");
  }
  async function setCover(id: string) {
    const res = await fetch(`/api/admin/gallery/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_cover: true }),
    });
    if (res.ok) setImages((prev) => prev.map((im) => ({ ...im, is_cover: im.id === id })));
    else alert("סימון שער נכשל");
  }
  async function moveImage(index: number, dir: -1 | 1) {
    const j = index + dir;
    if (j < 0 || j >= images.length) return;
    const a = images[index];
    const b = images[j];
    const next = [...images];
    next[index] = b;
    next[j] = a;
    setImages(next);
    const [ra, rb] = await Promise.all([
      fetch(`/api/admin/gallery/${a.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sort_order: b.sort_order }),
      }),
      fetch(`/api/admin/gallery/${b.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sort_order: a.sort_order }),
      }),
    ]);
    if (!ra.ok || !rb.ok) await loadImages(slug);
  }

  const uploadPct = uploadTotal > 0 ? Math.round((uploadDone / uploadTotal) * 100) : 0;
  const inp = "border border-charcoal/20 rounded px-2 py-1 text-content bg-white w-full";
  // Long-text fields: vertical-only drag handle (horizontal would overflow the
  // grid column and break the form), a roomy default so a typical 3–4 line
  // description fits without scrolling, and a floor so it can't be dragged shut.
  const txt = `${inp} resize-y min-h-[5.5rem] leading-relaxed`;

  return (
    <div className="space-y-4">
      {/* ── Project management ─────────────────────────────────────────────── */}
      <Card title="פרויקטים בגלריה">
        <p className="text-caption text-charcoal/60">
          ניהול הפרויקטים שמוצגים בגלריית האתר — כותרת, תיאור, קטגוריות, סדר ופרסום.
        </p>

        {projectsLoading ? (
          <div className="flex items-center gap-2 text-caption text-charcoal/60">
            <Loader2 size={14} className="animate-spin" /> טוען…
          </div>
        ) : projectsErr ? (
          <div className="flex items-center gap-1.5 text-caption text-red-600">
            <AlertCircle size={13} /> {projectsErr}
          </div>
        ) : (
          <ul className="divide-y divide-charcoal/10">
            {projects.map((p, idx) => (
              <li key={p.id} className="flex items-center gap-2 py-2 flex-wrap">
                <span className="font-semibold text-content min-w-[8rem]">{p.title_he || p.slug}</span>
                <span className="text-caption text-charcoal/40">{p.slug}</span>
                {!p.is_published && (
                  <span className="text-caption px-1.5 py-0.5 rounded bg-charcoal/[0.06] text-charcoal/60">
                    לא מפורסם
                  </span>
                )}
                <span className="ms-auto flex items-center gap-1 shrink-0">
                  <button onClick={() => moveProject(idx, -1)} disabled={idx === 0}
                    title="למעלה" className="p-1 text-charcoal/60 hover:text-accent disabled:opacity-30">
                    <ChevronUp size={15} />
                  </button>
                  <button onClick={() => moveProject(idx, 1)} disabled={idx === projects.length - 1}
                    title="למטה" className="p-1 text-charcoal/60 hover:text-accent disabled:opacity-30">
                    <ChevronDown size={15} />
                  </button>
                  <button onClick={() => togglePublish(p)}
                    title={p.is_published ? "הסתר" : "פרסם"}
                    className="p-1 text-charcoal/60 hover:text-accent">
                    {p.is_published ? <Eye size={15} /> : <EyeOff size={15} />}
                  </button>
                  <button onClick={() => openEdit(p)} title="ערוך" className="p-1 text-charcoal/60 hover:text-accent">
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => deleteProject(p)} title="מחק" className="p-1 text-charcoal/60 hover:text-red-500">
                    <Trash2 size={15} />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}

        {editing === null ? (
          <button onClick={openNew}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white font-bold rounded hover:bg-accent/90 transition-colors">
            <Plus size={15} /> הוסף פרויקט
          </button>
        ) : (
          <div className="border border-charcoal/15 rounded-md p-3 space-y-2 bg-charcoal/[0.02]">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-content">{editing === "new" ? "פרויקט חדש" : "עריכת פרויקט"}</h3>
              <button onClick={() => setEditing(null)} className="p-1 text-charcoal/50 hover:text-charcoal">
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {editing === "new" && (
                <label className="text-caption text-charcoal/70">
                  slug (מזהה, אנגלית-מקפים)
                  <input className={inp} value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="new-project" />
                </label>
              )}
              <label className="text-caption text-charcoal/70">
                url_slug (לכתובת דף הפרויקט)
                <input className={inp} value={form.url_slug}
                  onChange={(e) => setForm({ ...form, url_slug: e.target.value })} />
              </label>
              <label className="text-caption text-charcoal/70">
                כותרת (עברית)
                <input className={inp} value={form.title_he}
                  onChange={(e) => setForm({ ...form, title_he: e.target.value })} />
              </label>
              <label className="text-caption text-charcoal/70">
                Title (English)
                <input className={inp} value={form.title_en}
                  onChange={(e) => setForm({ ...form, title_en: e.target.value })} />
              </label>
              <label className="text-caption text-charcoal/70">
                קטגוריה-תווית (עברית)
                <input className={inp} value={form.category_he}
                  onChange={(e) => setForm({ ...form, category_he: e.target.value })} />
              </label>
              <label className="text-caption text-charcoal/70">
                Category label (English)
                <input className={inp} value={form.category_en}
                  onChange={(e) => setForm({ ...form, category_en: e.target.value })} />
              </label>
              <label className="text-caption text-charcoal/70">
                תיאור (עברית)
                <textarea className={txt} rows={5} value={form.description_he}
                  onChange={(e) => setForm({ ...form, description_he: e.target.value })} />
              </label>
              <label className="text-caption text-charcoal/70">
                Description (English)
                <textarea className={txt} rows={5} value={form.description_en}
                  onChange={(e) => setForm({ ...form, description_en: e.target.value })} />
              </label>
              <label className="text-caption text-charcoal/70">
                יחס תמונת-שער (aspect)
                <select className={inp} value={form.aspect}
                  onChange={(e) => setForm({ ...form, aspect: e.target.value })}>
                  {ASPECT_OPTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </label>
              <label className="flex items-center gap-2 text-caption text-charcoal/70 self-end pb-1">
                <input type="checkbox" checked={form.is_published}
                  onChange={(e) => setForm({ ...form, is_published: e.target.checked })} />
                מפורסם באתר
              </label>
            </div>
            <div>
              <div className="text-caption text-charcoal/70 mb-1">קטגוריות סינון:</div>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORY_OPTIONS.map((c) => (
                  <button key={c.key} type="button" onClick={() => toggleFormCategory(c.key)}
                    className={`px-2 py-0.5 rounded text-caption border transition-colors ${
                      form.categories.includes(c.key)
                        ? "bg-accent text-white border-accent"
                        : "border-charcoal/20 text-charcoal/70 hover:border-accent"
                    }`}>
                    {c.he}
                  </button>
                ))}
              </div>
            </div>
            {formErr && (
              <div className="flex items-center gap-1.5 text-caption text-red-600">
                <AlertCircle size={13} /> {formErr}
              </div>
            )}
            <div className="flex items-center gap-2">
              <button onClick={saveProject} disabled={saving}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white font-bold rounded hover:bg-accent/90 disabled:opacity-50">
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} שמור
              </button>
              <button onClick={() => setEditing(null)} className="px-3 py-1.5 border border-charcoal/20 rounded text-charcoal/70">
                ביטול
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* ── Image upload for the selected project ──────────────────────────── */}
      <Card title="תמונות — העלאה וניהול">
        <p className="text-caption text-charcoal/60">
          התמונות מוקטנות אוטומטית לפני העלאה (~1920px). האתר הציבורי מתעדכן תוך ~60 שניות.
        </p>

        <div className="flex items-center gap-2 flex-wrap">
          <label className="text-caption font-semibold text-charcoal/80">פרויקט:</label>
          <select value={slug} onChange={(e) => setSlug(e.target.value)}
            className="border border-charcoal/20 rounded px-2 py-1 text-content bg-white">
            {pickerOptions.map((p) => (
              <option key={p.slug} value={p.slug}>{p.title}</option>
            ))}
          </select>
        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            dragOver ? "border-accent bg-accent/5" : "border-charcoal/20"
          }`}>
          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
            id="gallery-file-input" onChange={(e) => e.target.files && uploadFiles(e.target.files)} />
          <Upload size={22} strokeWidth={1.5} className="mx-auto mb-2 text-charcoal/40" />
          <label htmlFor="gallery-file-input"
            className="inline-block px-4 py-2 bg-accent text-white font-bold rounded cursor-pointer hover:bg-accent/90 transition-colors">
            בחר תמונות
          </label>
          <p className="text-caption text-charcoal/50 mt-2">
            אפשר לבחור עשרות בבת אחת · או לגרור לכאן · בנייד נפתחת הגלריה/מצלמה
          </p>
        </div>

        {uploading && (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-caption text-charcoal/70">
              <Loader2 size={13} className="animate-spin" /> עלו {uploadDone} מתוך {uploadTotal}
            </div>
            <div className="h-1.5 bg-charcoal/10 rounded overflow-hidden">
              <div className="h-full bg-accent transition-all" style={{ width: `${uploadPct}%` }} />
            </div>
          </div>
        )}
        {failures.length > 0 && (
          <div className="border border-amber-300 bg-amber-50 rounded p-2 space-y-1">
            <div className="flex items-center gap-1.5 text-caption font-bold text-amber-700">
              <AlertCircle size={13} /> {failures.length} תמונות נכשלו (השאר עלו)
            </div>
            <ul className="text-caption text-amber-800/90 list-disc list-inside">
              {failures.map((f, i) => <li key={i}>{f.name} — {f.reason}</li>)}
            </ul>
          </div>
        )}

        {/* ── Extract stills from a video (entirely in the browser) ────────── */}
        <div className="border-t border-charcoal/10 pt-3 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Film size={15} strokeWidth={1.5} className="text-charcoal/50" />
            <span className="font-semibold text-content">חלץ תמונות מסרטון</span>
            <input ref={videoInputRef} type="file" accept="video/*" className="hidden"
              id="gallery-video-input"
              onChange={(e) => onPickVideo(e.target.files?.[0])} />
            <label htmlFor="gallery-video-input"
              className={`inline-block px-3 py-1.5 border border-charcoal/25 rounded font-bold transition-colors ${
                extracting ? "opacity-50 pointer-events-none" : "cursor-pointer hover:border-accent hover:text-accent"
              }`}>
              בחר סרטון
            </label>
          </div>
          <p className="text-caption text-charcoal/50">
            הסרטון <strong>נשאר במחשב שלך</strong> ולא נשלח לשרת — הדפדפן מחלץ {FRAME_COUNT} תמונות
            ורק מה שתסמן יעלה לגלריה.
          </p>

          {extracting && (
            <div className="space-y-1">
              {slowPath && (
                <div className="text-caption text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                  הסרטון בפורמט שהדפדפן לא קורא — מפענח בדרך אחרת, זה ייקח קצת יותר זמן.
                </div>
              )}
              <div className="flex items-center gap-2 text-caption text-charcoal/70">
                <Loader2 size={13} className="animate-spin" />
                מחלץ {extractDone} מתוך {extractTotal}
              </div>
            </div>
          )}

          {videoErr && (
            <div className="flex items-start gap-1.5 text-caption text-red-600 border border-red-200 bg-red-50 rounded p-2">
              <AlertCircle size={13} className="mt-0.5 shrink-0" />
              <span className="whitespace-pre-line">{videoErr}</span>
            </div>
          )}

          {frames.length > 0 && (
            <div className="space-y-2">
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
                {frames.map((f, i) => {
                  const on = picked.has(i);
                  return (
                    <button key={f.previewUrl} type="button" onClick={() => togglePick(i)}
                      className={`relative rounded-md overflow-hidden border-2 transition-colors ${
                        on ? "border-accent" : "border-transparent hover:border-charcoal/25"
                      }`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={f.previewUrl} alt={`פריים ${Math.round(f.time)} שניות`}
                        className="w-full aspect-video object-cover" />
                      <span className={`absolute top-1 start-1 w-4 h-4 rounded flex items-center justify-center ${
                        on ? "bg-accent text-white" : "bg-black/40 text-white/70"
                      }`}>
                        {on && <Check size={11} strokeWidth={3} />}
                      </span>
                      <span className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-caption tabular-nums">
                        {Math.round(f.time)}s
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button onClick={uploadPickedFrames} disabled={picked.size === 0 || uploading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white font-bold rounded hover:bg-accent/90 disabled:opacity-50">
                  {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                  הוסף לפרויקט ({picked.size})
                </button>
                <button onClick={extractMore} disabled={extracting || !videoFileRef.current}
                  className="px-3 py-1.5 border border-charcoal/20 rounded text-charcoal/70 hover:border-accent hover:text-accent disabled:opacity-50">
                  חלץ עוד {FRAME_COUNT}
                </button>
                <button onClick={clearFrames} disabled={extracting}
                  className="px-3 py-1.5 border border-charcoal/20 rounded text-charcoal/70 disabled:opacity-50">
                  נקה
                </button>
              </div>
            </div>
          )}
        </div>
      </Card>

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
              <div key={im.id}
                className="relative group border border-charcoal/10 rounded-md overflow-hidden bg-charcoal/[0.03]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={im.url} alt={im.alt_he ?? ""} className="w-full aspect-square object-cover" loading="lazy" />
                {im.is_cover && (
                  <span className="absolute top-1 start-1 inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-500 text-white text-caption font-bold rounded">
                    <Star size={10} strokeWidth={2.5} /> שער
                  </span>
                )}
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 p-1 bg-gradient-to-t from-black/60 to-transparent">
                  <div className="flex items-center gap-0.5">
                    <button onClick={() => moveImage(idx, -1)} disabled={idx === 0} title="הזז שמאלה"
                      className="p-1 text-white/90 hover:text-white disabled:opacity-30">
                      <ChevronUp size={15} className="rotate-[-90deg]" />
                    </button>
                    <button onClick={() => moveImage(idx, 1)} disabled={idx === images.length - 1} title="הזז ימינה"
                      className="p-1 text-white/90 hover:text-white disabled:opacity-30">
                      <ChevronDown size={15} className="rotate-[-90deg]" />
                    </button>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <button onClick={() => setCover(im.id)} title="סמן כתמונת שער"
                      className={`p-1 hover:text-amber-300 ${im.is_cover ? "text-amber-300" : "text-white/90"}`}>
                      <Star size={15} strokeWidth={im.is_cover ? 2.5 : 1.8} />
                    </button>
                    <button onClick={() => deleteImage(im.id)} title="מחק" className="p-1 text-white/90 hover:text-red-400">
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
