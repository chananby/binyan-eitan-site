"use client";

import React, { useMemo, useState } from "react";
import { useTasks } from "../InternalClientLayout";
import { AutoGrowTextarea } from "../../components/AutoGrowTextarea";

const people = ["Chanan", "Moti", "Nachman", "Akiva"] as const;

function Badge({ text, className = "" }: { text: string; className?: string }) {
  return <span className={`text-xs font-semibold px-2 py-1 rounded ${className}`}>{text}</span>;
}

function Avatar({ name }: { name: string }) {
  const color = name === "Moti" ? "bg-yellow-500" : name === "Nachman" ? "bg-blue-500" : name === "Akiva" ? "bg-zinc-400" : "bg-amber-600";
  return <div className={`${color} w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold`}>{name[0]}</div>;
}

function TaskCard({ task, onUpdate, onDelete }: any) {
  return (
    <div className={`p-4 rounded-md shadow-md bg-[#161616] border-l-4 ${task.priority === "Urgent" ? "border-red-500" : "border-amber-700"}`}>
      <div className="flex justify-between items-start gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-medium">{task.title}</h3>
            {task.priority === "Urgent" && <Badge text="URGENT" className="bg-red-600 text-white" />}
          </div>
          <p className="text-sm text-zinc-300 mt-2">{task.description}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            {task.assignees.map((a: string) => (
              <Avatar key={a} name={a} />
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={() => onUpdate(task.id, { status: task.status === "todo" ? "in-progress" : task.status === "in-progress" ? "done" : "todo" })} className="px-3 py-1 rounded bg-zinc-800 text-sm">
              Move
            </button>
            <button onClick={() => onDelete(task.id)} className="px-3 py-1 rounded bg-red-600 text-sm">
              Del
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardClient({ company }: { company: string }) {
  const { tasks, addTask, updateTask, deleteTask } = useTasks();
  const companyTasks = useMemo(() => tasks.filter((t) => t.company === company), [tasks, company]);
  const [showNew, setShowNew] = useState(false);
  const [mobileView, setMobileView] = useState<"todo"|"in-progress"|"done">("todo");

  const statuses: Array<{ key: any; label: string }> = [
    { key: "todo", label: "To Do" },
    { key: "in-progress", label: "In Progress" },
    { key: "done", label: "Done" },
  ];

  return (
    <div className="min-h-screen p-4 md:p-8 bg-[#121212] text-white">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">{company} — Internal</h1>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowNew(true)} className="px-4 py-2 bg-amber-600 text-black rounded-lg">New Task</button>
        </div>
      </header>

      {/* Mobile segment control */}
      <div className="md:hidden mb-4">
        <div className="flex bg-zinc-900 rounded-md overflow-hidden">
          {statuses.map((s) => (
            <button key={s.key} onClick={() => setMobileView(s.key as any)} className={`flex-1 py-3 text-sm ${mobileView === s.key ? "bg-amber-700 text-black" : "text-zinc-300"}`}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <main className="grid md:grid-cols-3 gap-4">
        {statuses.map((s) => (
          <section key={s.key} className={`p-3 rounded-md ${mobileView && mobileView !== s.key ? "hidden md:block" : "block"}`}>
            <h2 className="text-lg font-medium mb-3">{s.label}</h2>
            <div className="space-y-3">
              {companyTasks.filter((t) => t.status === s.key).map((task) => (
                <TaskCard key={task.id} task={task} onUpdate={updateTask} onDelete={deleteTask} />
              ))}
            </div>
          </section>
        ))}
      </main>

      {/* New Task Modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#161616] p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-3">New Task ({company})</h3>
            <NewTaskForm company={company} onCreate={(t) => { addTask(t); setShowNew(false); }} onCancel={() => setShowNew(false)} />
          </div>
        </div>
      )}
    </div>
  );
}

type NewTaskPayload = Omit<import("../InternalClientLayout").Task, "id">;

function NewTaskForm({ company, onCreate, onCancel }: { company: string; onCreate: (t: NewTaskPayload) => void; onCancel: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [creator, setCreator] = useState("Chanan");
  const [assignees, setAssignees] = useState<string[]>(["Chanan"]);
  const [priority, setPriority] = useState<"Normal" | "Urgent">("Normal");
  const [status, setStatus] = useState<"todo" | "in-progress" | "done">("todo");

  const toggleAssign = (p: string) => setAssignees((s) => (s.includes(p) ? s.filter((x) => x !== p) : [...s, p]));

  return (
    <div className="space-y-3">
      <AutoGrowTextarea value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="w-full p-3 rounded bg-zinc-900" />
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" className="w-full p-3 rounded bg-zinc-900" />
      <div className="flex gap-2">
        <select value={creator} onChange={(e) => setCreator(e.target.value)} className="p-2 rounded bg-zinc-900">
          {people.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={priority} onChange={(e) => setPriority(e.target.value as any)} className="p-2 rounded bg-zinc-900">
          <option>Normal</option>
          <option>Urgent</option>
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value as any)} className="p-2 rounded bg-zinc-900">
          <option value="todo">To Do</option>
          <option value="in-progress">In Progress</option>
          <option value="done">Done</option>
        </select>
      </div>
      <div className="flex gap-2 flex-wrap">
        {people.map((p) => (
          <button key={p} onClick={() => toggleAssign(p)} className={`px-3 py-1 rounded ${assignees.includes(p) ? "bg-amber-600 text-black" : "bg-zinc-800"}`}>{p}</button>
        ))}
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="px-4 py-2 rounded bg-zinc-700">Cancel</button>
        <button onClick={() => onCreate({ title, description, creator: creator as any, assignees: assignees as any, priority, status, company: company as any } as any)} className="px-4 py-2 rounded bg-amber-600 text-black">Create</button>
      </div>
    </div>
  );
}
