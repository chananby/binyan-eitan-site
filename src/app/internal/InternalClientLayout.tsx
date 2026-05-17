"use client";

import React, { createContext, Suspense, useContext, useEffect, useMemo, useState } from "react";
import ErrorTrigger from "../_dev/ErrorTrigger";

type Person = "Chanan" | "Moti" | "Nachman" | "Akiva";

export type Task = {
  id: string;
  title: string;
  description?: string;
  creator: Person;
  assignees: Person[];
  status: "todo" | "in-progress" | "done";
  priority: "Normal" | "Urgent";
  company: "Binyan Eitan" | "Prime Steel";
  version?: number;
};

type TaskContextType = {
  tasks: Task[];
  addTask: (t: Omit<Task, "id">) => Promise<void>;
  updateTask: (id: string, patch: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  conflictNotice: string | null;
  dismissConflict: () => void;
};

const TaskContext = createContext<TaskContextType | null>(null);

export function useTasks() {
  const ctx = useContext(TaskContext);
  if (!ctx) throw new Error("useTasks must be used within TaskProvider");
  return ctx;
}

export function TaskProvider({ company = "Binyan Eitan", children }: { company?: string; children: React.ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [conflictNotice, setConflictNotice] = useState<string | null>(null);
  const dismissConflict = () => setConflictNotice(null);

  const fetchTasks = async () => {
    try {
      const res = await fetch(`/internal/api/tasks?company=${encodeURIComponent(company)}`);
      if (!res.ok) return;
      const data = await res.json();
      setTasks(data.tasks || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchTasks();
    const id = setInterval(fetchTasks, 3000);
    return () => clearInterval(id);
  }, [company]);

  const addTask = async (t: Omit<Task, "id">) => {
    try {
      const res = await fetch(`/internal/api/tasks`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ company, task: t }) });
      const data = await res.json();
      setTasks((s) => [data.task, ...s]);
    } catch (e) {
      console.error(e);
    }
  };

  const updateTask = async (id: string, patch: Partial<Task>) => {
    // Optimistic concurrency: include the version we last saw for this task.
    // If someone else moved it first, the server returns 409 — we re-fetch and
    // surface a notice so the user knows their click was ignored.
    const local = tasks.find((t) => t.id === id);
    const expectedVersion = typeof local?.version === "number" ? local.version : undefined;
    try {
      const res = await fetch(`/internal/api/tasks`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ company, id, patch, expectedVersion }),
      });
      if (res.status === 409) {
        const data = await res.json().catch(() => ({}));
        await fetchTasks();
        setConflictNotice(
          `המשימה "${local?.title ?? ""}" עודכנה ע"י מישהו אחר. הצגתי את הגרסה החדשה — נסה שוב.`,
        );
        // Surface server's view to caller for completeness (no-op for current UI)
        if (data?.currentTask) {
          setTasks((s) => s.map((t) => (t.id === id ? { ...t, ...data.currentTask } : t)));
        }
        return;
      }
      if (!res.ok) return;
      const data = await res.json().catch(() => ({}));
      // Server returns the updated task with its new version — keep local in sync.
      if (data?.task) {
        setTasks((s) => s.map((t) => (t.id === id ? { ...t, ...data.task } : t)));
      } else {
        setTasks((s) => s.map((t) => (t.id === id ? { ...t, ...patch } : t)));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deleteTask = async (id: string) => {
    try {
      await fetch(`/internal/api/tasks`, { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ company, id }) });
      setTasks((s) => s.filter((t) => t.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const value = useMemo(
    () => ({ tasks, addTask, updateTask, deleteTask, conflictNotice, dismissConflict }),
    [tasks, conflictNotice],
  );

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
}

/** Toast that surfaces tasks lost-update conflicts to the user. Sits inside
 *  the TaskProvider so it appears on any internal dashboard automatically. */
function TaskConflictToast() {
  const ctx = useContext(TaskContext);
  if (!ctx || !ctx.conflictNotice) return null;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[120] w-[min(440px,calc(100vw-2rem))] bg-amber-600 text-white shadow-2xl rounded-lg px-4 py-3 flex items-start gap-3">
      <p className="flex-1 text-xs leading-relaxed">{ctx.conflictNotice}</p>
      <button
        onClick={ctx.dismissConflict}
        className="shrink-0 text-xs font-bold bg-white/15 hover:bg-white/25 rounded px-2 py-1"
      >
        סגור
      </button>
    </div>
  );
}

function PinGate({ children }: { children: React.ReactNode }) {
  const [input, setInput] = useState("");
  const [unlocked, setUnlocked] = useState<boolean | null>(null); // null = checking
  const [error, setError] = useState(false);

  // Probe server cookie on mount — no client-side trust, no sessionStorage.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/internal-auth", { method: "GET", credentials: "same-origin" })
      .then((r) => { if (!cancelled) setUnlocked(r.ok); })
      .catch(() => { if (!cancelled) setUnlocked(false); });
    return () => { cancelled = true; };
  }, []);

  const press = (d: string) => {
    if (input.length >= 4) return;
    setError(false);
    setInput((s) => s + d);
  };

  const back = () => { setError(false); setInput((s) => s.slice(0, -1)); };
  const clear = () => { setError(false); setInput(""); };

  useEffect(() => {
    if (input.length !== 4) return;
    const submitted = input;
    fetch("/api/internal-auth", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ code: submitted }),
    })
      .then(async (r) => {
        if (r.ok) {
          setUnlocked(true);
        } else {
          setError(true);
          setTimeout(() => { setInput(""); setError(false); }, 400);
        }
      })
      .catch(() => {
        setError(true);
        setTimeout(() => { setInput(""); setError(false); }, 400);
      });
  }, [input]);

  if (unlocked === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#121212] text-zinc-500 text-sm">
        בודק הרשאות…
      </div>
    );
  }

  if (unlocked) return <>{children}</>;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#121212] text-white px-6">
      <div className="w-full max-w-sm text-center">
        <h2 className="text-2xl font-semibold mb-2">Internal Dashboards</h2>
        <p className="text-sm text-zinc-400 mb-6">Enter 4‑digit PIN to continue</p>

        <div className="flex justify-center mb-6">
          <div className="flex gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={`w-12 h-12 rounded-md flex items-center justify-center text-lg transition-colors ${error ? "bg-red-900/40" : "bg-zinc-800"}`}>
                {input[i] ? "•" : ""}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "clear", "0", "back"].map((k) => (
            <button
              key={k}
              onClick={() => {
                if (k === "back") back();
                else if (k === "clear") clear();
                else press(k);
              }}
              className="h-14 min-h-[44px] flex items-center justify-center rounded-lg bg-zinc-900 text-xl font-medium"
            >
              {k === "back" ? "⌫" : k === "clear" ? "Clear" : k}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function InternalClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#121212] text-white">
      <Suspense fallback={null}>
        <ErrorTrigger />
      </Suspense>
      <PinGate>
        <TaskProvider>
          {children}
          <TaskConflictToast />
        </TaskProvider>
      </PinGate>
    </div>
  );
}
