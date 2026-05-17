/**
 * Server-side translations reader — same merge logic as /api/translations GET,
 * but called directly from server components (no HTTP round-trip).
 *
 * Used by the article slug pages so generateMetadata and the page itself can
 * see live KV content (e.g. articles added through the editor) instead of
 * relying on the static translations.json shipped with the build.
 */
import { kv } from "@vercel/kv";
import defaultTranslations from "@/src/lib/translations.json";

const KV_KEY = "site_translations";

function deepMerge(
  defaults: Record<string, unknown>,
  overrides: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...defaults };
  for (const key of Object.keys(overrides)) {
    const dv = defaults[key];
    const ov = overrides[key];
    if (Array.isArray(ov) && Array.isArray(dv)) {
      result[key] = dv.length > ov.length ? dv : ov;
    } else if (
      ov && typeof ov === "object" && !Array.isArray(ov) &&
      dv && typeof dv === "object" && !Array.isArray(dv)
    ) {
      result[key] = deepMerge(
        dv as Record<string, unknown>,
        ov as Record<string, unknown>
      );
    } else {
      result[key] = ov;
    }
  }
  return result;
}

interface MinimalArticle {
  slug: string;
  title_en?: string;
  title_he?: string;
  intro_en?: string;
  intro_he?: string;
  heroImage?: string;
  archived?: boolean;
  published?: boolean;
  [k: string]: unknown;
}

export async function getServerArticles(): Promise<MinimalArticle[]> {
  try {
    const stored = await kv.get(KV_KEY);
    const merged = stored
      ? deepMerge(
          defaultTranslations as unknown as Record<string, unknown>,
          stored as Record<string, unknown>,
        )
      : (defaultTranslations as unknown as Record<string, unknown>);
    const list = (merged as { articles?: unknown }).articles;
    return Array.isArray(list) ? (list as MinimalArticle[]) : [];
  } catch {
    return Array.isArray((defaultTranslations as { articles?: unknown }).articles)
      ? ((defaultTranslations as { articles: MinimalArticle[] }).articles)
      : [];
  }
}

export async function getServerArticleBySlug(slug: string): Promise<MinimalArticle | null> {
  const list = await getServerArticles();
  return list.find((a) => a.slug === slug) ?? null;
}

/** True iff the article should be visible to the public.
 *  - `published === false` → draft, not public
 *  - `archived === true`   → hidden, not public
 *  - everything else (including missing `published` field) → public */
export function isArticlePublic(a: MinimalArticle | null | undefined): boolean {
  if (!a) return false;
  if (a.published === false) return false;
  if (a.archived === true) return false;
  return true;
}
