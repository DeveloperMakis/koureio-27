import { NextRequest, NextResponse } from "next/server";
import { runAssistant, assistantConfigured, type ChatMessage } from "@/lib/assistant";
import { rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

export async function POST(req: NextRequest) {
  if (!assistantConfigured()) {
    return NextResponse.json({ ok: false, configured: false, error: "Ο βοηθός δεν είναι διαθέσιμος αυτή τη στιγμή." }, { status: 503 });
  }

  const ip = clientIp(req);
  if (!rateLimit(`assist:${ip}`, 15, 60_000).ok) {
    return NextResponse.json({ ok: false, error: "Πολλά μηνύματα. Δοκίμασε σε λίγο." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Μη έγκυρο αίτημα." }, { status: 400 });
  }

  const raw = (body as { messages?: unknown }).messages;
  if (!Array.isArray(raw)) return NextResponse.json({ ok: false, error: "Λείπουν μηνύματα." }, { status: 400 });

  // Καθαρισμός + όρια (anti-abuse).
  const messages: ChatMessage[] = raw
    .filter((m): m is ChatMessage => !!m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .map((m) => ({ role: m.role, content: m.content.slice(0, 1000) }))
    .slice(-16);

  try {
    const result = await runAssistant(messages);
    return NextResponse.json({ ok: true, reply: result.reply, booked: result.booked });
  } catch (e) {
    console.error("assistant error", e);
    return NextResponse.json({ ok: false, error: "Προέκυψε πρόβλημα με τον βοηθό. Δοκίμασε ξανά ή κλείσε με τη φόρμα." }, { status: 500 });
  }
}
