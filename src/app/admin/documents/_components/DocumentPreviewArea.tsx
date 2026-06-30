"use client";

// Reusable preview body for a financial document — the bare bytes-rendering
// pane (PDF iframe / image tag) without any modal chrome around it.
//
// Two callers:
//   • DocumentPreviewDialog — wraps this in the inbox lightbox.
//   • TriageClient           — embeds it full-screen as the main work area.
//
// Pulled out so the triage screen doesn't have to inline-duplicate the
// mime-type branching, and so we don't pay for the modal chrome (backdrop,
// ESC handler, scroll lock) when the preview is just a panel on a page.

import type { DocRow } from "./labels";

export default function DocumentPreviewArea({
  doc,
  className = "",
  pdfHeightClassName = "h-[70vh] sm:h-[78vh]",
  imageMaxHeightClassName = "max-h-[78vh]",
}: {
  doc: DocRow;
  /** Wrapper class — typically a bone-tinted scroll container. */
  className?: string;
  /** Height class for the PDF iframe. Inbox modal uses the default; the
   *  triage screen overrides to fill its column. */
  pdfHeightClassName?: string;
  /** Cap for the image tag so a tall photo doesn't push the panel layout. */
  imageMaxHeightClassName?: string;
}) {
  const fileUrl = `/api/admin/documents/${doc.id}/file`;
  // mime_type drives the render path; admins occasionally upload HEIC
  // which the browser renders as an image just fine. Anything not a
  // PDF goes through <img>.
  const isPdf = (doc.mime_type ?? "").toLowerCase() === "application/pdf";

  return (
    <div className={className}>
      {isPdf ? (
        <iframe
          src={fileUrl}
          title="מסמך"
          className={`w-full bg-white ${pdfHeightClassName}`}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={fileUrl}
          alt="מסמך"
          className={`w-full h-auto ${imageMaxHeightClassName} object-contain mx-auto`}
        />
      )}
    </div>
  );
}
