// Extract a pasted image from a ClipboardEvent as a File, or null when the
// clipboard holds no image (plain text, or a PDF — browsers generally don't
// expose PDFs via the clipboard, which is fine: the file picker handles PDFs).
// A synthetic "pasted-<timestamp>.<ext>" name is used when the blob has none.
export function extractPastedImage(e: ClipboardEvent): File | null {
  const items = e.clipboardData?.items;
  if (!items) return null;
  for (const it of Array.from(items)) {
    if (it.kind === "file" && it.type.startsWith("image/")) {
      const blob = it.getAsFile();
      if (!blob) continue;
      const ext = (it.type.split("/")[1] || "png").replace("jpeg", "jpg");
      const name = blob.name && /\.[a-z0-9]+$/i.test(blob.name) ? blob.name : `pasted-${Date.now()}.${ext}`;
      return new File([blob], name, { type: it.type });
    }
  }
  return null;
}
