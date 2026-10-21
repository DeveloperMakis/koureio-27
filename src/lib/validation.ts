import { z } from "zod";

const dateStr = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Μη έγκυρη ημερομηνία");

const timeStr = z
  .string()
  .regex(/^\d{2}:\d{2}$/, "Μη έγκυρη ώρα");

// Ελληνικό τηλέφωνο: 10ψήφιο (σταθερό/κινητό) με προαιρετικό +30, κενά/παύλες.
const phone = z
  .string()
  .trim()
  .min(10, "Συμπληρώστε έγκυρο τηλέφωνο")
  .max(20)
  .refine((v) => {
    const digits = v.replace(/[^\d]/g, "");
    return digits.length >= 10 && digits.length <= 14;
  }, "Συμπληρώστε έγκυρο τηλέφωνο");

export const availabilityQuerySchema = z.object({
  serviceId: z.string().min(1).optional(),
  serviceIds: z.string().min(1).optional(), // CSV: "id1,id2"
  date: dateStr,
  barberId: z.string().min(1).optional(),
});

export const firstAvailableQuerySchema = z.object({
  serviceId: z.string().min(1).optional(),
  serviceIds: z.string().min(1).optional(), // CSV
  barberId: z.string().min(1).optional(),
  fromDate: dateStr.optional(),
});

export const rescheduleSchema = z.object({
  date: dateStr,
  time: timeStr,
  barberId: z.string().min(1).optional(),
});

export const waitlistSchema = z.object({
  serviceId: z.string().min(1, "Επιλέξτε υπηρεσία"),
  barberId: z.string().min(1).optional(),
  dateFrom: dateStr,
  dateTo: dateStr,
  timeFrom: timeStr.optional(),
  timeTo: timeStr.optional(),
  customerName: z.string().trim().min(2, "Συμπληρώστε το όνομά σας").max(80),
  customerPhone: z
    .string()
    .trim()
    .min(10, "Συμπληρώστε έγκυρο τηλέφωνο")
    .max(20)
    .refine((v) => {
      const d = v.replace(/[^\d]/g, "");
      return d.length >= 10 && d.length <= 14;
    }, "Συμπληρώστε έγκυρο τηλέφωνο"),
});

// Μία ή περισσότερες υπηρεσίες: δέχεται `serviceIds` (πίνακας) ή legacy `serviceId`.
const serviceSelection = {
  serviceId: z.string().min(1).optional(),
  serviceIds: z.array(z.string().min(1)).min(1).max(5).optional(),
};

// Επανάληψη ραντεβού: none/κάθε 2 εβδ./3 εβδ./μήνα (~4 εβδ.).
export const repeatField = z.enum(["none", "2w", "3w", "1m"]).optional();
export const REPEAT_DAYS: Record<string, number> = { "2w": 14, "3w": 21, "1m": 28 };
export const REPEAT_COUNT = 4; // συνολικά ραντεβού (1 + 3 επαναλήψεις)
const requireService = (d: { serviceId?: string; serviceIds?: string[] }) =>
  (d.serviceIds?.length ?? 0) > 0 || !!d.serviceId;

/** Ενοποιεί serviceId/serviceIds σε μοναδικό πίνακα id (διατηρεί σειρά, χωρίς διπλά). */
export function normalizeServiceIds(input: { serviceId?: string; serviceIds?: string[] }): string[] {
  const raw = input.serviceIds?.length ? input.serviceIds : input.serviceId ? [input.serviceId] : [];
  return Array.from(new Set(raw));
}

export const createBookingSchema = z
  .object({
    ...serviceSelection,
    barberId: z.string().min(1).optional(), // λείπει = χωρίς προτίμηση
    date: dateStr,
    time: timeStr,
    customerName: z.string().trim().min(2, "Συμπληρώστε το όνομά σας").max(80),
    customerPhone: phone,
    customerEmail: z.union([z.string().trim().email("Μη έγκυρο email"), z.literal("")]).optional(),
    notes: z.string().trim().max(500).optional(),
    repeat: repeatField,
    otpCode: z.string().trim().max(10).optional(), // κωδικός SMS επιβεβαίωσης (νέοι πελάτες)
  })
  .refine(requireService, { message: "Επιλέξτε τουλάχιστον μία υπηρεσία", path: ["serviceIds"] });

export type CreateBookingInput = z.infer<typeof createBookingSchema>;

// ---- Mobile / customer auth ----
const emailField = z.string().trim().toLowerCase().email("Μη έγκυρο email");
const passwordField = z.string().min(8, "Τουλάχιστον 8 χαρακτήρες").max(100);

export const registerSchema = z.object({
  email: emailField,
  password: passwordField,
  name: z.string().trim().min(2, "Συμπληρώστε το όνομά σας").max(80),
  phone: z.string().trim().max(20).optional(),
});

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Συμπληρώστε κωδικό").max(100),
});

export const refreshSchema = z.object({ refreshToken: z.string().min(10) });

export const deviceSchema = z.object({
  expoPushToken: z.string().min(5).max(255),
  platform: z.enum(["ios", "android"]),
  installationId: z.string().min(3).max(128),
});

export const profileUpdateSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  phone: z.union([z.string().trim().max(20), z.literal("")]).optional(),
  favoriteBarberId: z.union([z.string().min(1), z.null()]).optional(),
  notifyPush: z.boolean().optional(),
});

export const mobileBookingSchema = z
  .object({
    ...serviceSelection,
    barberId: z.string().min(1).optional(),
    date: dateStr,
    time: timeStr,
    notes: z.string().trim().max(500).optional(),
  })
  .refine(requireService, { message: "Επιλέξτε τουλάχιστον μία υπηρεσία", path: ["serviceIds"] });

export const adminLoginSchema = z.object({
  email: z.string().trim().email("Μη έγκυρο email"),
  password: z.string().min(1, "Συμπληρώστε κωδικό"),
});

export const serviceUpdateSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500),
  durationMin: z.coerce.number().int().min(5).max(480),
  priceEuros: z.union([z.coerce.number().min(0).max(9999), z.literal("")]).optional(),
  active: z.coerce.boolean(),
  order: z.coerce.number().int().min(0).max(999),
});

export const closureCreateSchema = z.object({
  date: dateStr,
  allDay: z.coerce.boolean().optional(),
  startTime: timeStr.optional(),
  endTime: timeStr.optional(),
  barberId: z.string().optional(), // "" ή λείπει = όλο το κατάστημα
  reason: z.string().trim().max(200).optional(),
});

export const manualBookingSchema = z.object({
  serviceId: z.string().min(1).optional(),
  serviceIds: z.array(z.string().min(1)).min(1).max(5).optional(),
  barberId: z.string().min(1),
  date: dateStr,
  time: timeStr,
  customerName: z.string().trim().min(1).max(80),
  customerPhone: z.string().trim().max(20).optional(),
  notes: z.string().trim().max(500).optional(),
  repeat: repeatField,
}).refine((d) => (d.serviceIds?.length ?? 0) > 0 || !!d.serviceId, {
  message: "Επιλέξτε υπηρεσία",
  path: ["serviceIds"],
});
