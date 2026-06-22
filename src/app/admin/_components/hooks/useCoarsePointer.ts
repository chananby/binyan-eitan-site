"use client";

// useCoarsePointer — reactive `matchMedia('(pointer: coarse)')`. True on
// phones / tablets / anything where the primary input is a finger or
// stylus without sub-pixel precision. The board uses it to decide
// between drag (fine) and tap-to-move (coarse).
//
// SSR-safe: starts as `false` (drag mode) on the server; the first
// client effect flips it if the device is actually touch.

import { useEffect, useState } from "react";

const QUERY = "(pointer: coarse)";

export function useCoarsePointer(): boolean {
  const [coarse, setCoarse] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia(QUERY);
    setCoarse(mql.matches);
    const handler = (e: MediaQueryListEvent) => setCoarse(e.matches);
    // addEventListener is the modern API; older Safari uses addListener.
    if (mql.addEventListener) mql.addEventListener("change", handler);
    else mql.addListener(handler);
    return () => {
      if (mql.removeEventListener) mql.removeEventListener("change", handler);
      else mql.removeListener(handler);
    };
  }, []);

  return coarse;
}
