/**
 * Vendor matching for financial-document extraction.
 *
 * Split out of document-extraction.ts (which was at the 400-line limit) with
 * NO behaviour change — this is a pure move. matchVendor() reconciles an
 * extracted vendor against the existing `vendors` table:
 *   א. exact tax-id  →  ב. AI-suggested id  →  ג. name/alias similarity
 *   →  ד. create new  (ה. enrich aliases on a partial match)
 */

import type { ExtractedFields } from "./document-extraction";

export interface VendorListItem {
  id: string;
  name: string;
  tax_id: string | null;
  aliases: string[] | null;
}

// Enrich a matched vendor with the raw name as an alias when it differs from
// the stored name and isn't already listed. UPDATE is intentional here — this
// is additive enrichment, not an overwrite.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function maybeAddAlias(supabase: any, vendor: { id: string; name: string; aliases: string[] | null }, rawName: string) {
  const aliases = vendor.aliases ?? [];
  if (!rawName || rawName === vendor.name || aliases.includes(rawName)) return;
  await supabase.from("vendors").update({ aliases: [...aliases, rawName] }).eq("id", vendor.id);
}

// Resolve the extracted vendor to a vendors.id, creating one if needed.
// Order: exact tax-id → AI-suggested id → alias hit → name similarity → create.
export async function matchVendor(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  fields: ExtractedFields,
  vendorList: VendorListItem[],
): Promise<string | null> {
  const rawName = fields.vendor_name_raw?.trim() || null;
  const taxId = fields.vendor_tax_id?.trim() || null;

  // א. Exact tax-id match → certain.
  if (taxId) {
    const { data: byTax } = await supabase
      .from("vendors")
      .select("id, name, aliases")
      .eq("tax_id", taxId)
      .is("deleted_at", null)
      .maybeSingle();
    if (byTax) {
      if (rawName) await maybeAddAlias(supabase, byTax, rawName);
      return byTax.id;
    }
  }

  // ב. AI-suggested id, validated against the list we sent it.
  if (fields.matched_vendor_id) {
    const hit = vendorList.find(v => v.id === fields.matched_vendor_id);
    if (hit) {
      if (rawName) await maybeAddAlias(supabase, { id: hit.id, name: hit.name, aliases: hit.aliases }, rawName);
      return hit.id;
    }
  }

  // ג. Similarity by name / alias.
  if (rawName) {
    const { data: aliasHit } = await supabase
      .from("vendors")
      .select("id")
      .is("deleted_at", null)
      .contains("aliases", [rawName])
      .limit(1);
    if (aliasHit && aliasHit.length > 0) return aliasHit[0].id;

    const { data: nameHit } = await supabase
      .from("vendors")
      .select("id, name, aliases")
      .is("deleted_at", null)
      .ilike("name", `%${rawName}%`)
      .limit(1);
    if (nameHit && nameHit.length > 0) {
      await maybeAddAlias(supabase, nameHit[0], rawName); // ה. existing vendor, different name
      return nameHit[0].id;
    }
  }

  // ד. No match → create a new vendor.
  if (!rawName) return null;
  const { data: created, error } = await supabase
    .from("vendors")
    .insert({ name: rawName, tax_id: taxId })
    .select("id")
    .single();
  if (error) {
    // 23505 = unique tax_id collision (race) → fetch and reuse the existing row.
    if (error.code === "23505" && taxId) {
      const { data: existing } = await supabase
        .from("vendors")
        .select("id")
        .eq("tax_id", taxId)
        .is("deleted_at", null)
        .maybeSingle();
      if (existing) return existing.id;
    }
    console.error("[vendor-matching matchVendor]", JSON.stringify(error));
    return null;
  }
  return created.id;
}
