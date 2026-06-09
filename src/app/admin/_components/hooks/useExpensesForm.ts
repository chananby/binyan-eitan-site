"use client";

import { useState, useCallback } from "react";
import { parseMoney, parsePositive } from "../../../../lib/money";

interface Feedback { success: () => void; error: () => void; }

// Add-material form on the expenses tab. matFilter (the per-project view
// filter) stays in AdminPortal because it drives loadMaterials() — only
// the add-form state lives here.

export function useExpensesForm(loadMaterials: () => void, feedback: Feedback) {
  const [matProjectId, setMatProjectId] = useState("");
  const [matCategory,  setMatCategory]  = useState("חומרים");
  const [matName,      setMatName]      = useState("");
  const [matQty,       setMatQty]       = useState("1");
  const [matUnit,      setMatUnit]      = useState("יחידות");
  const [matSupplier,  setMatSupplier]  = useState("");
  const [matCost,      setMatCost]      = useState("");
  const [matLoading,   setMatLoading]   = useState(false);
  const [matMsg,       setMatMsg]       = useState("");

  const handleAddMaterial = useCallback(async (e: React.FormEvent) => {
    e.preventDefault(); setMatLoading(true); setMatMsg("");
    const qty = parsePositive(matQty);
    if (qty === null) { setMatMsg("שגיאה: כמות חייבת להיות מספר חיובי"); setMatLoading(false); return; }
    const cost = parseMoney(matCost); // null if empty/invalid; valid 0 stays 0
    if (matCost.trim() && cost === null) { setMatMsg("שגיאה: עלות לא תקינה"); setMatLoading(false); return; }
    try {
      const res  = await fetch("/api/admin/materials", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: matProjectId, material_name: matName, quantity: qty, unit: matUnit, supplier: matSupplier, cost, category: matCategory }) });
      const data = await res.json();
      if (res.ok) { feedback.success(); setMatMsg("✓ " + matName + " נרשם"); setMatName(""); setMatQty("1"); setMatSupplier(""); setMatCost(""); loadMaterials(); }
      else        { feedback.error(); setMatMsg("שגיאה: " + (data.error ?? res.status)); }
    } catch (err) { setMatMsg("שגיאת רשת: " + String(err)); }
    finally { setMatLoading(false); }
  }, [matProjectId, matCategory, matName, matQty, matUnit, matSupplier, matCost, loadMaterials, feedback]);

  return {
    matProjectId, setMatProjectId,
    matCategory,  setMatCategory,
    matName,      setMatName,
    matQty,       setMatQty,
    matUnit,      setMatUnit,
    matSupplier,  setMatSupplier,
    matCost,      setMatCost,
    matLoading,
    matMsg,
    handleAddMaterial,
  };
}
