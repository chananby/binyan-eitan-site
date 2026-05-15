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

async function getTasks(company: string) {
  const key = KEY_PREFIX + company;
  try {
    const raw = await kv.get(key);
    if (!raw) return [];
    return raw as any[];
  } catch (err) {
    console.error("KV GET failed", err);
    return [];
  }
}

async function setTasks(company: string, tasks: any[]) {
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
  const tasks = (await getTasks(company)) || [];
  const id = (globalThis as any).crypto?.randomUUID?.() || Math.random().toString(36).slice(2, 9);
  const newTask = { id, ...task };
  const next = [newTask, ...tasks];
  await setTasks(company, next);
  return NextResponse.json({ task: newTask });
}

export async function PATCH(req: NextRequest) {
  if (!isInternalAuthed(req)) return unauthorized();
  const body = await req.json();
  const { company = "Binyan Eitan", id, patch } = body;
  if (!id || !patch) return NextResponse.json({ error: "missing" }, { status: 400 });
  const tasks = (await getTasks(company)) || [];
  const updated = tasks.map((t: any) => (t.id === id ? { ...t, ...patch } : t));
  await setTasks(company, updated);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  if (!isInternalAuthed(req)) return unauthorized();
  const body = await req.json();
  const { company = "Binyan Eitan", id } = body;
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });
  const tasks = (await getTasks(company)) || [];
  const next = tasks.filter((t: any) => t.id !== id);
  await setTasks(company, next);
  return NextResponse.json({ ok: true });
}
