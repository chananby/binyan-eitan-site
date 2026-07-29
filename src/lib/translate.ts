/**
 * On-demand Hebrew translation of short worker-written text (correction-request
 * reasons), via the SAME Anthropic integration used for document extraction.
 * Called only when the admin clicks "תרגם" — nothing is translated ahead of time.
 */
import Anthropic from "@anthropic-ai/sdk";

// Reuse the model the document pipeline already runs on, so there's no new
// model-availability surface. Translation is a tiny call (short text).
const TRANSLATE_MODEL = "claude-sonnet-4-6";

export async function translateToHebrew(
  text: string,
  sourceLangLabel?: string,
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY חסר");
  const client = new Anthropic({ apiKey });

  const hint = sourceLangLabel
    ? ` The note is probably written in ${sourceLangLabel}.`
    : "";
  const msg = await client.messages.create({
    model: TRANSLATE_MODEL,
    max_tokens: 400,
    system:
      "You translate a short attendance-correction note written by a construction " +
      "worker into Hebrew. Output ONLY the Hebrew translation — no preamble, no " +
      "quotes, no explanation. Keep it faithful and concise." + hint,
    messages: [{ role: "user", content: text }],
  });

  const out = msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
  if (!out) throw new Error("תרגום ריק");
  return out;
}
