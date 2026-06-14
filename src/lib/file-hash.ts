import { createHash } from "crypto";

/** SHA-256 (hex) of raw file bytes. Server-side authoritative hash used for
 *  the hard duplicate check — never trust a client-supplied hash for storage. */
export function sha256Hex(bytes: ArrayBuffer): string {
  return createHash("sha256").update(Buffer.from(bytes)).digest("hex");
}
