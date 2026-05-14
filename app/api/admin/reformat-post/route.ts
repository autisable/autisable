import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { requireAdmin } from "@/app/lib/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Reformatting a long post can take several seconds on Opus 4.7 — leave
// headroom against the platform's default timeout.
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are an HTML reformatter. The user will give you the raw HTML body of a blog post whose paragraph structure has been stripped (often imported from WordPress as one long block of text).

Your job is to insert paragraph breaks so the post becomes readable, WITHOUT changing any words. Specifically:

- Preserve every word, character, and punctuation mark exactly as the input has them. No rewording, no rephrasing, no spelling fixes, no adding or removing content.
- Preserve every existing HTML tag (headings, lists, images, links, blockquotes, etc.). Do not strip or alter them.
- Insert <p>...</p> boundaries between paragraphs so the post reads naturally. A paragraph is a coherent thought unit — usually 2–6 sentences.
- If the input already wraps prose in <p> tags, only split paragraphs that are clearly too long (multiple distinct subjects mashed together). Don't split for the sake of splitting.
- Keep dialog/quoted speech on its own paragraph where appropriate.
- Where the input has block-level tags like <h2>, <h3>, <ul>, <ol>, <blockquote>, <figure>, <hr>, <iframe>, leave them in place — paragraph wrappers go around prose only, not around those.
- Output the reformatted HTML directly. No commentary, no markdown fences, just the HTML.`;

export async function POST(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "Server misconfigured: ANTHROPIC_API_KEY not set" },
      { status: 500 }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const content = typeof body.content === "string" ? body.content : "";
  if (!content.trim()) {
    return NextResponse.json({ error: "content required" }, { status: 400 });
  }

  // Truncation guard. Opus 4.7 has a 1M context window but we don't want
  // to pay for absurdly long inputs and the model's tendency to drift
  // increases with length. 40k chars is plenty for the longest real
  // Autisable post.
  const inputContent = content.length > 40_000 ? content.slice(0, 40_000) : content;

  const client = new Anthropic();
  try {
    // No `thinking` configured — paragraph reinsertion is a deterministic
    // text transformation, not a reasoning task. Skipping thinking keeps
    // latency and cost low. Output is bounded by input length: paragraph
    // tags add ~5% bytes, so 16k tokens leaves comfortable headroom for a
    // 40k-char input. 16k is the safe non-streaming default that stays
    // under the SDK's HTTP timeout.
    const response = await client.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 16_000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: inputContent }],
    });

    // content is a discriminated union (text / thinking / tool_use / ...).
    // For a plain completion with no thinking and no tools we expect one
    // or more text blocks; concatenate them all to be safe.
    let reformatted = "";
    for (const block of response.content) {
      if (block.type === "text") reformatted += block.text;
    }
    reformatted = reformatted.trim();

    if (!reformatted) {
      return NextResponse.json(
        { error: "Model did not return reformatted HTML" },
        { status: 502 }
      );
    }

    // Word-conservation guard. If the model accidentally dropped (or added)
    // a meaningful number of words, we refuse to return the result rather
    // than silently corrupt the post. ±2% leeway because punctuation /
    // whitespace handling can shift the word count slightly even with no
    // semantic change.
    const wordsIn = inputContent.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
    const wordsOut = reformatted.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
    const drift = wordsIn === 0 ? 0 : Math.abs(wordsOut - wordsIn) / wordsIn;
    if (drift > 0.02) {
      return NextResponse.json(
        {
          error: `Word count drifted by ${(drift * 100).toFixed(1)}% (${wordsIn} → ${wordsOut}). Refusing to apply — original preserved.`,
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      ok: true,
      content: reformatted,
      stats: {
        wordsIn,
        wordsOut,
        charsIn: inputContent.length,
        charsOut: reformatted.length,
      },
    });
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      console.error("[reformat-post] Anthropic API error", err.status, err.message);
      return NextResponse.json(
        { error: `Anthropic API error (${err.status}): ${err.message}` },
        { status: 500 }
      );
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[reformat-post] call failed:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
