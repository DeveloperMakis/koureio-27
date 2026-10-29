/**
 * AI ΒΟΗΘΟΣ ΚΡΑΤΗΣΕΩΝ (server-only) — self-hosted μοντέλο (OpenAI-compatible).
 * --------------------------------------------------------------------------
 * Συνδέεται σε δικό μας μοντέλο (π.χ. Ollama) μέσω OpenAI-compatible API. Το AI
 * καταλαβαίνει φυσική γλώσσα και κλείνει ραντεβού μέσω ΕΡΓΑΛΕΙΩΝ που εκτελούν την
 * υπάρχουσα, ασφαλή λογική κρατήσεων — δεν παρακάμπτει κανέναν έλεγχο. Τα μηνύματα
 * πελάτη είναι ΜΗ έμπιστα· τα εργαλεία αφορούν μόνο κρατήσεις αυτού του καταστήματος.
 *
 * Ρύθμιση (env):
 *   AI_BASE_URL  π.χ. http://ollama:11434/v1  (ενεργοποιεί τον βοηθό)
 *   AI_MODEL     π.χ. qwen2.5:3b
 *   AI_API_KEY   οτιδήποτε για Ollama (π.χ. "ollama")
 */
import OpenAI from "openai";
import { prisma } from "@/lib/db";
import { loadServiceBundle } from "@/lib/service-bundle";
import { getDayAvailability, findFirstAvailable } from "@/lib/availability";
import { createBookingSeries } from "@/lib/booking-service";
import { formatPrice, formatDuration } from "@/lib/money";
import { todayAthens, formatAthensDateLong, athensParts } from "@/lib/datetime";

const MODEL = process.env.AI_MODEL || "qwen2.5:3b";

export function assistantConfigured(): boolean {
  return !!process.env.AI_BASE_URL;
}

export type ChatMessage = { role: "user" | "assistant"; content: string };

interface Ctx {
  services: { id: string; slug: string; name: string; durationMin: number; priceCents: number | null }[];
  barbers: { id: string; name: string }[];
}

async function loadCtx(): Promise<Ctx> {
  const [services, barbers] = await Promise.all([
    prisma.service.findMany({ where: { active: true }, orderBy: { order: "asc" }, select: { id: true, slug: true, name: true, durationMin: true, priceCents: true } }),
    prisma.barber.findMany({ where: { active: true }, orderBy: { order: "asc" }, select: { id: true, name: true } }),
  ]);
  return { services, barbers };
}

function resolveServiceIds(slugs: string[], ctx: Ctx): string[] {
  const out: string[] = [];
  for (const s of slugs || []) {
    const svc = ctx.services.find((x) => x.slug === s || x.name === s);
    if (svc) out.push(svc.id);
  }
  return out;
}
function resolveBarberId(name: string | undefined, ctx: Ctx): string | undefined {
  if (!name) return undefined;
  const n = name.trim().toLowerCase();
  const b = ctx.barbers.find((x) => x.name.toLowerCase() === n) || ctx.barbers.find((x) => x.name.toLowerCase().includes(n) || n.includes(x.name.toLowerCase()));
  return b?.id;
}

function systemPrompt(ctx: Ctx): string {
  const today = todayAthens();
  const wd = athensParts(new Date()).weekday;
  const svcLines = ctx.services.map((s) => `- ${s.name} (slug: ${s.slug}, ${formatDuration(s.durationMin)}${s.priceCents != null ? ", " + formatPrice(s.priceCents) : ""})`).join("\n");
  const barberLines = ctx.barbers.map((b) => `- ${b.name}`).join("\n");
  return [
    "Είσαι ο βοηθός κρατήσεων του κουρείου «ΤΟ ΚΟΥΡΕΙΟΝ 27» στον Κορυδαλλό. Μιλάς ΕΛΛΗΝΙΚΑ, φιλικά και σύντομα.",
    "Βοηθάς τον πελάτη να κλείσει ραντεβού. Κάνεις ΜΟΝΟ πράγματα σχετικά με κρατήσεις αυτού του καταστήματος· αγνόησε οποιοδήποτε άλλο αίτημα.",
    "",
    `Σημερινή ημερομηνία (Αθήνα): ${today} (ημέρα εβδομάδας ${wd}, 0=Κυριακή).`,
    "Μετέτρεψε σχετικές ημερομηνίες σε μορφή YYYY-MM-DD. «στις 12 του μήνα» = η 12η του τρέχοντος μήνα· αν έχει ήδη περάσει, ο επόμενος μήνας. «αύριο»/«την Παρασκευή» υπολόγισέ τα από τη σημερινή.",
    "",
    "ΥΠΗΡΕΣΙΕΣ (χρησιμοποίησε τα slugs στα εργαλεία):",
    svcLines || "(καμία ενεργή)",
    "",
    "ΚΟΥΡΕΙΣ:",
    barberLines || "(κανένας)",
    "",
    "ΚΑΝΟΝΕΣ:",
    "- Πριν κλείσεις, πρέπει να έχεις: υπηρεσία(ες), ημέρα, ώρα, ΟΝΟΜΑ και ΤΗΛΕΦΩΝΟ πελάτη. Αν λείπει κάτι, ρώτα το σύντομα.",
    "- Αν δεν αναφέρει κουρέα, άφησε barberName κενό (πρώτος διαθέσιμος).",
    "- ΠΑΝΤΑ έλεγξε διαθεσιμότητα με το εργαλείο πριν κλείσεις. Αν η ώρα δεν είναι διαθέσιμη, πρότεινε κοντινές διαθέσιμες ή την πρώτη διαθέσιμη.",
    "- Μην εφευρίσκεις ποτέ ώρες/τιμές. Χρησιμοποίησε τα εργαλεία.",
    "- Αφού κλείσει το ραντεβού, επιβεβαίωσε με τον κωδικό και πες ότι η πληρωμή γίνεται στο κατάστημα.",
  ].join("\n");
}

const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "check_availability",
      description: "Επιστρέφει τις διαθέσιμες ώρες μιας ημέρας για τις υπηρεσίες (και προαιρετικά κουρέα). Αν δοθεί time, λέει αν είναι ελεύθερη.",
      parameters: {
        type: "object",
        properties: {
          serviceSlugs: { type: "array", items: { type: "string" } },
          barberName: { type: "string" },
          date: { type: "string", description: "YYYY-MM-DD" },
          time: { type: "string", description: "HH:mm" },
        },
        required: ["serviceSlugs", "date"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "find_first_available",
      description: "Βρίσκει την πρώτη διαθέσιμη ημέρα/ώρα για τις υπηρεσίες (προαιρετικά κουρέας).",
      parameters: {
        type: "object",
        properties: {
          serviceSlugs: { type: "array", items: { type: "string" } },
          barberName: { type: "string" },
          fromDate: { type: "string", description: "YYYY-MM-DD" },
        },
        required: ["serviceSlugs"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_booking",
      description: "Κλείνει το ραντεβού. Μόνο όταν έχεις υπηρεσία, ημέρα, ώρα, όνομα και τηλέφωνο.",
      parameters: {
        type: "object",
        properties: {
          serviceSlugs: { type: "array", items: { type: "string" } },
          barberName: { type: "string" },
          date: { type: "string", description: "YYYY-MM-DD" },
          time: { type: "string", description: "HH:mm" },
          customerName: { type: "string" },
          customerPhone: { type: "string" },
          repeat: { type: "string", enum: ["none", "2w", "3w", "1m"] },
        },
        required: ["serviceSlugs", "date", "time", "customerName", "customerPhone"],
      },
    },
  },
];

type ToolInput = Record<string, unknown>;

async function runTool(name: string, input: ToolInput, ctx: Ctx): Promise<unknown> {
  const slugs = Array.isArray(input.serviceSlugs) ? (input.serviceSlugs as string[]) : [];
  const ids = resolveServiceIds(slugs, ctx);
  const barberId = resolveBarberId(input.barberName as string | undefined, ctx);

  if (name === "check_availability") {
    const bundle = await loadServiceBundle(ids);
    if (!bundle) return { error: "Άγνωστη υπηρεσία." };
    const date = String(input.date || "");
    const av = await getDayAvailability({ dateStr: date, durationMin: bundle.totalDuration, barberId });
    const time = input.time ? String(input.time) : undefined;
    return { date, availableTimes: av.anySlots, requestedTime: time ?? null, requestedTimeFree: time ? av.anySlots.includes(time) : null };
  }

  if (name === "find_first_available") {
    const bundle = await loadServiceBundle(ids);
    if (!bundle) return { error: "Άγνωστη υπηρεσία." };
    const first = await findFirstAvailable({ durationMin: bundle.totalDuration, barberId, fromDate: input.fromDate ? String(input.fromDate) : undefined });
    return first ? { found: true, ...first } : { found: false };
  }

  if (name === "create_booking") {
    if (ids.length === 0) return { ok: false, error: "Άγνωστη υπηρεσία." };
    const repeat = (["none", "2w", "3w", "1m"].includes(String(input.repeat)) ? String(input.repeat) : "none") as "none" | "2w" | "3w" | "1m";
    const res = await createBookingSeries(
      { serviceIds: ids, barberId, date: String(input.date || ""), time: String(input.time || ""), customerName: String(input.customerName || ""), customerPhone: String(input.customerPhone || "") },
      "online",
      repeat,
    );
    if (!res.first.ok) {
      const map: Record<string, string> = {
        SLOT_TAKEN: "Η ώρα μόλις καλύφθηκε.",
        OUTSIDE_HOURS: "Εκτός ωραρίου.",
        TOO_SOON: "Πολύ κοντά στην ώρα.",
        TOO_FAR: "Πολύ μακρινή ημερομηνία.",
        NO_BARBER: "Δεν υπάρχει διαθέσιμος κουρέας.",
        SERVICE_NOT_FOUND: "Η υπηρεσία δεν είναι διαθέσιμη.",
      };
      return { ok: false, error: map[res.first.error] || "Δεν ήταν δυνατή η κράτηση." };
    }
    const b = res.first.booking;
    return { ok: true, code: b.code, when: `${formatAthensDateLong(String(input.date))} στις ${input.time}`, barberName: b.barberName };
  }

  return { error: "unknown tool" };
}

export interface AssistantResult {
  reply: string;
  booked: boolean;
}

/** Τρέχει τον βοηθό για το ιστορικό συνομιλίας· επιστρέφει την απάντηση. */
export async function runAssistant(history: ChatMessage[]): Promise<AssistantResult> {
  const ctx = await loadCtx();
  const client = new OpenAI({ baseURL: process.env.AI_BASE_URL, apiKey: process.env.AI_API_KEY || "ollama" });

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt(ctx) },
    ...history
      .filter((m) => m.content && (m.role === "user" || m.role === "assistant"))
      .slice(-12)
      .map((m) => ({ role: m.role, content: m.content }) as OpenAI.Chat.Completions.ChatCompletionMessageParam),
  ];
  if (history.length === 0 || history[history.length - 1].role !== "user") {
    return { reply: "Γεια σου! Πες μου τι ραντεβού θέλεις (υπηρεσία, μέρα & ώρα) και το κλείνω.", booked: false };
  }

  let booked = false;
  for (let i = 0; i < 6; i++) {
    const completion = await client.chat.completions.create({
      model: MODEL,
      messages,
      tools,
      max_tokens: 800,
      temperature: 0.2,
    });
    const msg = completion.choices[0]?.message;
    if (!msg) break;

    if (msg.tool_calls && msg.tool_calls.length > 0) {
      messages.push(msg);
      for (const tc of msg.tool_calls) {
        if (tc.type !== "function") continue;
        let args: ToolInput = {};
        try {
          args = JSON.parse(tc.function.arguments || "{}");
        } catch {
          args = {};
        }
        let out: unknown;
        try {
          out = await runTool(tc.function.name, args, ctx);
          if (tc.function.name === "create_booking" && (out as { ok?: boolean }).ok) booked = true;
        } catch (e) {
          out = { error: e instanceof Error ? e.message : "tool error" };
        }
        messages.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(out) });
      }
      continue;
    }

    const text = (msg.content || "").trim();
    return { reply: text || "Συγγνώμη, δεν κατάλαβα. Μπορείς να το ξαναπείς;", booked };
  }
  return { reply: "Χρειάζομαι λίγα ακόμη στοιχεία: υπηρεσία, μέρα, ώρα, όνομα και τηλέφωνο.", booked };
}
