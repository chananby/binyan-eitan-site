"use client";

import { useState, useCallback } from "react";

interface Feedback {
  success: () => void;
  error: () => void;
}

// Password-change form (admin account tab). Validates length / mismatch /
// same-as-current client-side, then posts to /api/admin/change-password.
// feedback is passed in so this hook shares the parent's UI feedback
// instance instead of allocating its own.

export function useChangePassword(feedback: Feedback) {
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew,     setPwNew]     = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwSaving,  setPwSaving]  = useState(false);
  const [pwMsg,     setPwMsg]     = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const handleChangePassword = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg(null);
    if (!pwCurrent || !pwNew || !pwConfirm) return;
    if (pwNew.length < 8) {
      setPwMsg({ kind: "err", text: "סיסמה חדשה חייבת להיות באורך 8 תווים לפחות." });
      return;
    }
    if (pwNew !== pwConfirm) {
      setPwMsg({ kind: "err", text: "אישור הסיסמה לא תואם לסיסמה החדשה." });
      return;
    }
    if (pwNew === pwCurrent) {
      setPwMsg({ kind: "err", text: "הסיסמה החדשה זהה לנוכחית. בחר/י סיסמה אחרת." });
      return;
    }
    setPwSaving(true);
    try {
      const res = await fetch("/api/admin/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: pwCurrent, newPassword: pwNew }),
      });
      const data = await res.json();
      if (data.ok) {
        feedback.success();
        setPwCurrent(""); setPwNew(""); setPwConfirm("");
        setPwMsg({ kind: "ok", text: "הסיסמה הוחלפה בהצלחה." });
      } else if (res.status === 401 && data.error === "wrong_current_password") {
        feedback.error();
        setPwMsg({ kind: "err", text: "הסיסמה הנוכחית שגויה." });
      } else if (res.status === 401) {
        feedback.error();
        setPwMsg({ kind: "err", text: "ההתחברות פגה. חזור/חזרי להתחבר." });
      } else if (res.status === 400 && data.error === "password_too_short") {
        feedback.error();
        setPwMsg({ kind: "err", text: "סיסמה חדשה חייבת להיות באורך 8 תווים לפחות." });
      } else {
        feedback.error();
        setPwMsg({ kind: "err", text: "שגיאה בשינוי סיסמה. נסה/י שוב." });
      }
    } catch {
      feedback.error();
      setPwMsg({ kind: "err", text: "שגיאת רשת. נסה/י שוב." });
    } finally {
      setPwSaving(false);
    }
  }, [pwCurrent, pwNew, pwConfirm, feedback]);

  return {
    pwCurrent, setPwCurrent,
    pwNew,     setPwNew,
    pwConfirm, setPwConfirm,
    pwSaving,
    pwMsg, setPwMsg,
    handleChangePassword,
  };
}
