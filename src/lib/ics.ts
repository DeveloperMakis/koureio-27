/** Δημιουργία αρχείου ICS (RFC 5545) για προσθήκη ραντεβού στο ημερολόγιο. */

function toIcsUtc(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function escapeText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export function buildIcs(params: {
  uid: string;
  start: Date;
  end: Date;
  summary: string;
  description?: string;
  location?: string;
  url?: string;
}): string {
  const now = new Date();
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TO KOUREION 27//Booking//EL",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${params.uid}`,
    `DTSTAMP:${toIcsUtc(now)}`,
    `DTSTART:${toIcsUtc(params.start)}`,
    `DTEND:${toIcsUtc(params.end)}`,
    `SUMMARY:${escapeText(params.summary)}`,
    params.description ? `DESCRIPTION:${escapeText(params.description)}` : "",
    params.location ? `LOCATION:${escapeText(params.location)}` : "",
    params.url ? `URL:${params.url}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);
  return lines.join("\r\n") + "\r\n";
}
