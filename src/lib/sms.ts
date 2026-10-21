/**
 * Αποστολή SMS μέσω πραγματικού παρόχου.
 * --------------------------------------------------------------------------
 * - Χωρίς ρυθμισμένο πάροχο → { ok:false, reason:"not_configured" } (ΔΕΝ στέλνει
 *   ψεύτικο SMS, δεν προσποιείται ότι στάλθηκε).
 * - Με SMS_PROVIDER="twilio" + κλειδιά → πραγματική αποστολή μέσω Twilio REST API.
 *   Μπορείτε να προσθέσετε κι άλλον πάροχο (π.χ. Yuboto) στο switch.
 */

export type SmsResult = { ok: true } | { ok: false; reason: "not_configured" | "error"; error?: string };

/** Μετατροπή τηλεφώνου σε E.164 (προεπιλογή Ελλάδα +30). */
export function toE164(raw: string, defaultCc = "30"): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("+")) return "+" + trimmed.slice(1).replace(/\D/g, "");
  const digits = trimmed.replace(/\D/g, "");
  if (digits.startsWith("00")) return "+" + digits.slice(2);
  // Ελληνικό 10ψήφιο (κινητό 69… ή σταθερό 2…) → +30
  if (digits.length === 10) return `+${defaultCc}${digits}`;
  return "+" + digits;
}

export async function sendSms(to: string, body: string): Promise<SmsResult> {
  const provider = process.env.SMS_PROVIDER;
  if (!provider) return { ok: false, reason: "not_configured" };

  if (provider === "twilio") {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.SMS_FROM;
    if (!sid || !token || !from) return { ok: false, reason: "not_configured" };
    try {
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: "POST",
        headers: {
          Authorization: "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ To: to, From: from, Body: body }),
      });
      if (!res.ok) {
        const t = await res.text();
        return { ok: false, reason: "error", error: `Twilio ${res.status}: ${t.slice(0, 200)}` };
      }
      return { ok: true };
    } catch (e) {
      return { ok: false, reason: "error", error: e instanceof Error ? e.message : String(e) };
    }
  }

  // Άγνωστος/μη υλοποιημένος πάροχος → αντιμετωπίζεται ως μη ρυθμισμένος.
  return { ok: false, reason: "not_configured" };
}
