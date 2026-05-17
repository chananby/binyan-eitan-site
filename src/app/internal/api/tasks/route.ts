import { NextRequest, NextResponse } from "next/server";
import kv from "@vercel/kv";
import { verifyInternalToken } from "../../../../lib/admin-auth";

const KEY_PREFIX = "internal_tasks:";
const INTERNAL_COOKIE = "be_internal_token";

function unauthorized() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

function isInternalAuthed(req: NextRequest): boolean {
  const token = req.cookies.get(INTERNAL_COOKIE)?.value;
  return !!token && verifyInternalToken(token);
}

interface Task {
  id: string;
  version?: number;
  [k: string]: unknown;
}

async function getTasks(company: string): Promise<Task[]> {
  const key = KEY_PREFIX + company;
  try {
    const raw = await kv.get(key);
    if (!raw) return [];
    return raw as Task[];
  } catch (err) {
    console.error("KV GET failed", err);
    return [];
  }
}

async function setTasks(company: string, tasks: Task[]): Promise<void> {
  const key = KEY_PREFIX + company;
  try {
    await kv.set(key, tasks);
  } catch (err) {
    console.error("KV SET failed", err);
  }
}

export async function GET(req: NextRequest) {
  if (!isInternalAuthed(req)) return unauthorized();
  const url = new URL(req.url);
  const company = url.searchParams.get("company") || "Binyan Eitan";
  const tasks = await getTasks(company);
  return NextResponse.json({ tasks });
}

export async function POST(req: NextRequest) {
  if (!isInternalAuthed(req)) return unauthorized();
  const body = await req.json();
  const { company = "Binyan Eitan", task } = body;
  if (!task) return NextResponse.json({ error: "missing task" }, { status: 400 });
  const tasks = await getTasks(company);
  const id = (globalThis as { crypto?: Crypto }).crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2, 9);
  const newTask: Task = { id, ...task, version: 1 };
  const next = [newTask, ...tasks];
  await setTasks(company, next);
  return NextResponse.json({ task: newTask });
}

export async function PATCH(req: NextRequest) {
  if (!isInternalAuthed(req)) return unauthorized();
  const body = await req.json();
  const { company = "Binyan Eitan", id, patch, expectedVersion } = body;
  if (!id || !patch) return NextResponse.json({ error: "missing" }, { status: 400 });

  const tasks = await getTasks(company);
  const idx = tasks.findIndex((t) => t.id === id);
  if (idx < 0) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const current = tasks[idx];
  const currentVersion = typeof current.version === "number" ? current.version : 0;

  // Optimistic concurrency: if caller supplies expectedVersion, it must match.
  // Older callers that don't send expectedVersion still work (no-op check).
  if (typeof expectedVersion === "number" && expectedVersion !== currentVersion) {
    return NextResponse.json(
      {
        error: "version_conflict",
        message: "מישהו אחר עדכן את המשימה הזאת",
        currentVersion,
        currentTask: current,
      },
      { status: 409 },
    );
  }

  // Strip meta from the patch so callers can't bump version directly.
  const { version: _ignored, ...sanitizedPatch } = patch as Record<string, unknown>;
  const updatedTask: Task = { ...current, ...sanitizedPatch, version: currentVersion + 1 };
  const next = [...tasks];
  next[idx] = updatedTask;
  await setTasks(company, next);
  return NextResponse.json({ ok: true, task: updatedTask });
}

export async function DELETE(req: NextRequest) {
  if (!isInternalAuthed(req)) return unauthorized();
  const body = await req.json();
  const { company = "Binyan Eitan", id } = body;
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });
  const tasks = await getTasks(company);
  const next = tasks.filter((t) => t.id !== id);
  await setTasks(company, next);
  return NextResponse.json({ ok: true });
}
