import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerClient, type ProjectRow } from "../../../../lib/supabase";
import { isAdminAuthed } from "../../../../lib/admin-auth";
import { ChevronLeft, MapPin, Calendar, User, LayoutDashboard } from "lucide-react";

export const metadata: Metadata = {
  title: "ניהול פרויקטים",
  robots: { index: false, follow: false },
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active:    { label: "פעיל",   color: "bg-green-100 text-green-700 border-green-200" },
  planning:  { label: "תכנון",  color: "bg-sky-100 text-sky-700 border-sky-200" },
  completed: { label: "הושלם", color: "bg-charcoal/10 text-charcoal/50 border-charcoal/10" },
  paused:    { label: "מושהה", color: "bg-amber-100 text-amber-700 border-amber-200" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_LABELS[status] ?? { label: status, color: "bg-charcoal/10 text-charcoal/50 border-charcoal/10" };
  return (
    <span className={`inline-block rounded-sm border px-2 py-0.5 font-body text-[0.6rem] font-semibold tracking-[0.15em] uppercase ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit", year: "numeric" });
}

async function getProjects(): Promise<{ projects: ProjectRow[]; error: string | null }> {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("projects")
      .select("id, name, status, address, start_date, end_date")
      .order("status", { ascending: true })
      .order("name", { ascending: true });
    if (error) return { projects: [], error: error.message };
    return { projects: (data as ProjectRow[]) ?? [], error: null };
  } catch (err) {
    return { projects: [], error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export default async function AdminProjectsPage() {
  if (!(await isAdminAuthed())) redirect("/he/internal");

  const { projects, error } = await getProjects();

  const active    = projects.filter((p) => p.status === "active");
  const planning  = projects.filter((p) => p.status === "planning");
  const completed = projects.filter((p) => p.status === "completed");
  const other     = projects.filter((p) => !["active", "planning", "completed"].includes(p.status));

  const sections = [
    { label: "פרויקטים פעילים", items: active },
    { label: "בתכנון",           items: planning },
    { label: "הושלמו",           items: completed },
    { label: "אחר",              items: other },
  ].filter((s) => s.items.length > 0);

  return (
    <main className="min-h-screen bg-bone" dir="rtl">
      <div className="mx-auto max-w-4xl px-6 py-16 md:py-24">

        {/* Header */}
        <div className="mb-10 flex items-start justify-between gap-4">
          <div>
            <p className="font-body text-[0.65rem] font-semibold tracking-[0.22em] uppercase text-accent mb-2">
              בניין איתן — ניהול
            </p>
            <h1 className="font-heading text-3xl font-bold text-charcoal md:text-4xl">פרויקטים</h1>
            <p className="mt-2 font-body text-sm text-charcoal/40">
              {projects.length} פרויקטים בסה&quot;כ
            </p>
          </div>
          <div className="flex items-center gap-4 mt-1">
            <Link
              href="/admin"
              className="flex items-center gap-1 font-body text-xs text-accent hover:text-accent-dark transition-colors duration-200"
            >
              <LayoutDashboard size={13} strokeWidth={1.5} />
              דשבורד
            </Link>
            <Link
              href="/he/internal"
              className="flex items-center gap-1 font-body text-xs text-charcoal/35 hover:text-accent transition-colors duration-200"
            >
              <ChevronLeft size={14} strokeWidth={1.5} />
              פורטל
            </Link>
          </div>
        </div>

        {/* Error state */}
        {error && (
          <div className="mb-8 rounded-sm border border-red-200 bg-red-50 px-5 py-4 font-body text-sm text-red-700">
            שגיאה בטעינת הנתונים: {error}
          </div>
        )}

        {/* Empty state */}
        {!error && projects.length === 0 && (
          <div className="rounded-sm border border-charcoal/10 bg-white px-8 py-16 text-center">
            <p className="font-body text-sm text-charcoal/40">אין פרויקטים עדיין</p>
          </div>
        )}

        {/* Project sections */}
        {sections.map((section) => (
          <div key={section.label} className="mb-10">
            <h2 className="mb-4 font-body text-[0.65rem] font-bold tracking-[0.2em] uppercase text-charcoal/40 border-b border-warm-gray-light pb-2">
              {section.label} ({section.items.length})
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {section.items.map((project) => (
                <Link
                  key={project.id}
                  href={`/he/internal/admin/projects/${project.id}`}
                  className="group flex flex-col gap-3 border border-charcoal/10 bg-white p-5 hover:border-accent/40 hover:shadow-sm transition-all duration-200"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-heading text-base font-bold text-charcoal group-hover:text-accent transition-colors duration-200 leading-snug">
                      {project.name}
                    </h3>
                    <StatusBadge status={project.status} />
                  </div>

                  <div className="space-y-1.5">
                    {project.address && (
                      <div className="flex items-center gap-2 font-body text-xs text-charcoal/50">
                        <MapPin size={11} strokeWidth={1.5} className="shrink-0" />
                        <span>{project.address}</span>
                      </div>
                    )}
                    {(project.start_date || project.end_date) && (
                      <div className="flex items-center gap-2 font-body text-xs text-charcoal/50">
                        <Calendar size={11} strokeWidth={1.5} className="shrink-0" />
                        <span dir="ltr">{formatDate(project.start_date)} – {formatDate(project.end_date)}</span>
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}

      </div>
    </main>
  );
}
