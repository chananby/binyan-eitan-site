import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file");

  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const filename = (file as File).name ?? `photo-${Date.now()}.jpg`;
  const ext = filename.split(".").pop() ?? "jpg";
  const blobName = `change-orders/${Date.now()}.${ext}`;

  const blob = await put(blobName, file, {
    access: "public",
    contentType: file.type || "image/jpeg",
  });

  return NextResponse.json({ url: blob.url });
}
