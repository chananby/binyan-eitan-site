import { useEffect, useRef } from "react";

/**
 * Intercepts the browser/hardware back button while a lightbox is open.
 *
 * - Lightbox opens  → pushState so back button doesn't navigate away
 * - Back button pressed → popstate fires → onClose() called, page stays
 * - X / backdrop close → history.back() pops the pushed entry cleanly
 *
 * Works on Android (hardware key) and iOS (swipe-back / back button).
 */
export function useLightboxHistory(isOpen: boolean, onClose: () => void) {
  const pushedRef       = useRef(false);
  const backInitiated   = useRef(false);

  // Push a history entry when lightbox opens
  useEffect(() => {
    if (isOpen && !pushedRef.current) {
      window.history.pushState({ lightbox: true }, "");
      pushedRef.current = true;
    }
  }, [isOpen]);

  // Listen for browser/hardware back button
  useEffect(() => {
    const handler = () => {
      if (pushedRef.current) {
        pushedRef.current     = false;
        backInitiated.current = true;
        onClose();
      }
    };
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, [onClose]);

  // When lightbox closes via X/backdrop: pop the entry we pushed
  useEffect(() => {
    if (!isOpen && pushedRef.current) {
      pushedRef.current = false;
      if (!backInitiated.current) {
        window.history.back();
      }
      backInitiated.current = false;
    }
  }, [isOpen]);
}
