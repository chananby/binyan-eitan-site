"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

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
};

type TaskContextType = {
  tasks: Task[];
  addTask: (t: Omit<Task, "id">) => Promise<void>;
  updateTask: (id: string, patch: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
};

const TaskContext = createContext<TaskContextType | null>(null);

export function useTasks() {
  const ctx = useContext(TaskContext);
  if (!ctx) throw new Error("useTasks must be used within TaskProvider");
  return ctx;
}

export function TaskProvider({ company = "Binyan Eitan", children }: { company?: string; children: React.ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);

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
    try {
      await fetch(`/internal/api/tasks`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ company, id, patch }) });
      setTasks((s) => s.map((t) => (t.id === id ? { ...t, ...patch } : t)));
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

  const value = useMemo(() => ({ tasks, addTask, updateTask, deleteTask }), [tasks]);

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
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
      <PinGate>
        <TaskProvider>{children}</TaskProvider>
      </PinGate>
    </div>
  );
}
