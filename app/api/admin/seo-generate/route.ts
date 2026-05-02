import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { requireAdmin } from "@/app/lib/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Strip HTML and collapse whitespace so we hand the model clean prose, not markup.
function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

const SYSTEM_PROMPT = `You are an SEO editor for Autisable, a community publication for autistic adults, parents, and professionals. You write metadata that is honest, specific, and avoids clickbait or stigmatizing language.

Rules:
- Meta title: ≤60 characters, includes the focus keyphrase naturally, never ends with "— Autisable" (the site appends that).
- Meta description: 140–160 characters, written as a complete sentence or two, gives a concrete reason to click.
- Focus keyword: 2–5 words, the single search term most likely to bring the right reader. Should appear in the title and description.
- Keywords: 4–8 related search phrases (not single words unless unavoidable). Reflect what readers actually search for, not topic categories.
- Use neurodiversity-affirming language: identity-first ("autistic person") unless the post itself uses person-first.
- Never invent facts not present in the post. If the post is thin, write metadata about what's actually there.`;

export async function POST(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "Server misconfigured: OPENAI_API_KEY not set" },
      { status: 500 }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const excerpt = typeof body.excerpt === "string" ? body.excerpt.trim() : "";
  const contentHtml = typeof body.content === "string" ? body.content : "";
  const category = typeof body.category === "string" ? body.category.trim() : "";

  if (!title && !contentHtml) {
    return NextResponse.json(
      { error: "Need at least a title or content to generate SEO" },
      { status: 400 }
    );
  }

  const cleanContent = stripHtml(contentHtml).slice(0, 8000);

  const userPrompt = [
    title && `TITLE: ${title}`,
    category && `CATEGORY: ${category}`,
    excerpt && `EDITOR EXCERPT: ${excerpt}`,
    cleanContent && `CONTENT:\n${cleanContent}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const client = new OpenAI();

  try {
    // Structured outputs: OpenAI guarantees the response matches our schema,
    // so no defensive parsing of free-form text needed.
    const completion = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "seo_metadata",
          strict: true,
          schema: {
            type: "object",
            properties: {
              meta_title: {
                type: "string",
                description: "≤60 chars. Do not append '— Autisable'.",
              },
              meta_description: {
                type: "string",
                description: "140–160 chars. Concrete reason to click.",
              },
              focus_keyword: {
                type: "string",
                description: "2–5 words. The primary search term.",
              },
              keywords: {
                type: "array",
                items: { type: "string" },
                description: "4–8 related search phrases.",
              },
            },
            required: ["meta_title", "meta_description", "focus_keyword", "keywords"],
            additionalProperties: false,
          },
        },
      },
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      return NextResponse.json(
        { error: "Model did not return SEO metadata" },
        { status: 502 }
      );
    }

    const seo = JSON.parse(raw) as {
      meta_title: string;
      meta_description: string;
      focus_keyword: string;
      keywords: string[];
    };

    return NextResponse.json({
      ok: true,
      seo: {
        meta_title: seo.meta_title?.slice(0, 70) || "",
        meta_description: seo.meta_description?.slice(0, 200) || "",
        focus_keyword: seo.focus_keyword || "",
        keywords: Array.isArray(seo.keywords) ? seo.keywords.filter((k) => typeof k === "string") : [],
      },
      usage: {
        input_tokens: completion.usage?.prompt_tokens ?? 0,
        output_tokens: completion.usage?.completion_tokens ?? 0,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[seo-generate] OpenAI call failed:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
