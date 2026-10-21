# Mobile app — κατάσταση υλοποίησης

Η εφαρμογή (Expo/React Native) χτίζεται **πάνω στο υπάρχον backend** μέσω HTTPS
API. Κοινή βάση, κοινή server-side λογική κρατήσεων — καμία διπλή υλοποίηση
διαθεσιμότητας. Prisma/μυστικά μένουν αποκλειστικά στον server.

## ✅ Ολοκληρώθηκε & δοκιμάστηκε σε αυτή τη φάση (backend foundation)

### Διορθώσεις αξιοπιστίας (ίδια συμπεριφορά σε website/app/admin)
- **Επικαλυπτόμενες ώρες**: ο έλεγχος γίνεται με overlap μέσα σε transaction (+buffer),
  όχι μόνο με `slotKey` — καλύπτει διαφορετικές ώρες έναρξης.
- **Εκπρόθεσμη αλλαγή**: το reschedule μπλοκάρεται αν το αρχικό ραντεβού είναι εντός
  του παραθύρου ακύρωσης (δεν παρακάμπτεται το όριο).
- **Idempotency**: ίδιο key με **διαφορετικό payload** → `IDEMPOTENCY_CONFLICT`
  (όχι σιωπηλή επιστροφή άλλης κράτησης).

### Βάση (νέα μοντέλα)
`Customer`, `MobileSession`, `DeviceRegistration`, `InAppNotification`,
`NotificationOutbox`, σύνδεση `Booking.customerId`, αγαπημένος κουρέας.
(Προστέθηκαν μη καταστροφικά· τα υπάρχοντα δεδομένα διατηρήθηκαν.)

### Authentication (ασφαλές, για κινητό)
- bcrypt password hashing.
- **Access token** 15′ (HMAC-signed, stateless).
- **Refresh token** 60 ημερών, αποθηκευμένο **μόνο ως hash**, με **rotation** σε κάθε
  refresh και **ανάκληση** στο logout. Rate limiting παντού.

### Versioned API (`/api/v1`)
| Endpoint | Μέθοδος | Auth | Περιγραφή |
|---|---|---|---|
| `/api/v1/auth/register` | POST | – | Εγγραφή + tokens |
| `/api/v1/auth/login` | POST | – | Σύνδεση + tokens |
| `/api/v1/auth/refresh` | POST | – | Rotation access/refresh |
| `/api/v1/auth/logout` | POST | – | Ανάκληση session |
| `/api/v1/me` | GET/PATCH | ✔ | Προφίλ / ενημέρωση (αγαπημένος κουρέας, notifyPush) |
| `/api/v1/me/bookings` | GET | ✔ | Επερχόμενα/προηγούμενα του πελάτη |
| `/api/v1/me/notifications` | GET/PATCH | ✔ | Inbox + unread + mark-read |
| `/api/v1/devices` | POST/DELETE | ✔ | Εγγραφή/αφαίρεση συσκευής push |
| `/api/v1/bookings` | POST | ✔ | Κράτηση συνδεδεμένου πελάτη (+inbox confirmation) |
| `/api/v1/catalog` | GET | – | Επιχείρηση/υπηρεσίες/κουρείς |
| `/api/availability`, `/api/availability/first`, `/api/waitlist` | GET/POST | – | Επαναχρησιμοποιούνται |

**Δοκιμάστηκαν (curl/node):** register → me → catalog → first-available → κράτηση →
**idempotent retry (reused)** → τα ραντεβού μου → **inbox** → **refresh (rotation)** →
401 χωρίς token → **logout ανακαλεί** → παλιό rotated refresh απορρίπτεται. Όλα ✅.
Type-check & production build καθαρά.

## ✅ Φάση 4–5: Expo app (`mobile/`) — ΟΛΟΚΛΗΡΩΘΗΚΕ (type-check καθαρό)
Expo SDK 52 · Expo Router 4 · React Query 5 · SecureStore. Οδηγίες: [mobile/README.md](mobile/README.md).
- **Tabs**: Αρχική / Ραντεβού / Ειδοποιήσεις (badge) / Προφίλ.
- **Auth**: εγγραφή/σύνδεση/αποσύνδεση, tokens σε SecureStore, **auto-refresh** στο API client.
- **Πλήρης ροή κράτησης**: υπηρεσία → (κουρέας) → ημέρα/ώρα (ομαδοποιημένες + «Πρώτο
  διαθέσιμο») → σύνοψη → επιβεβαίωση, με **idempotency** & χειρισμό «ώρα καλύφθηκε».
  Η επιβεβαίωση απαιτεί σύνδεση (τα στοιχεία διατηρούνται).
- **Τα ραντεβού μου** (επερχόμενα/προηγούμενα, .ics, αλλαγή via web, **in-app ακύρωση**),
  **Inbox** (read/unread, badge), **Προφίλ** (αγαπημένος κουρέας, διακόπτης ειδοποιήσεων,
  **διαγραφή λογαριασμού** που ακυρώνει μελλοντικά ραντεβού & κρατά ανώνυμο ιστορικό).
- **Δεν δοκιμάστηκε σε συσκευή/emulator εδώ** (χρειάζεται το περιβάλλον σου: `npx expo start`).
  Το backend API που καταναλώνει έχει δοκιμαστεί end-to-end.

## ✅ Φάση 6: Push + background worker — ΟΛΟΚΛΗΡΩΘΗΚΕ & δοκιμάστηκε
- **Transactional outbox**: η επιβεβαίωση κράτησης (inbox + push job) γράφεται στο
  **ίδιο transaction** με την κράτηση. Ομοίως change/cancellation events.
- **Expo push sender** (`src/lib/push.ts`): multi-device, καθαρισμός άκυρων tokens
  (DeviceNotRegistered), «ok» = αποδεκτό (ΟΧΙ «παραδόθηκε»).
- **Worker** (`src/lib/outbox-worker.ts`): σάρωση υπενθυμίσεων (παράθυρο
  `reminderLeadMinutes`), ατομικό claim (ασφαλές με πολλούς workers), **έλεγχος
  τρέχουσας κατάστασης πριν την αποστολή**, backoff/retry, idempotency (dedupeKey).
- **Ακύρωση παλιών υπενθυμίσεων** σε cancel/reschedule (website, app & admin).
- **Trigger**: `POST/GET /api/worker/run` (secret `WORKER_SECRET`) — για Vercel Cron
  ή `npm run worker` (τοπικό poller). Χωρίς συσκευή → `skipped` (το inbox δουλεύει).
- **Mobile**: εγγραφή συσκευής push (permission με εξήγηση, όχι επιθετικά), Android
  channel, deep-link με πάτημα ειδοποίησης, αφαίρεση συσκευής στο logout.
- **Δοκιμές (API)**: confirmation στο tx → inbox· worker skip χωρίς συσκευή· 401 με
  λάθος secret· cancel → cancellation + καθαρισμός reminder· διαγραφή λογαριασμού. ✅
  (Το **πραγματικό push** χρειάζεται development build + `EXPO_ACCESS_TOKEN`/EAS projectId
  — δεν στάλθηκε push σε συσκευή εδώ.)

## ✅ Φάση 7: Waitlist offer flow — ΟΛΟΚΛΗΡΩΘΗΚΕ & δοκιμάστηκε
- **Προσφορά = hold**: η προσφερόμενη θέση **κλειδώνεται** (δεν την παίρνει άλλη
  κράτηση) — στη διαθεσιμότητα **και** στη δημιουργία κράτησης — με πραγματική
  **server-side λήξη** (`expiresAt`).
- **Αποδοχή**: ατομικό flip PENDING→ACCEPTED → **μία οριστική κράτηση ακόμη και σε
  ταυτόχρονες αποδοχές** (δοκιμασμένο: 1 ok / 1 conflict).
- **Λήξη**: ο worker μαρκάρει EXPIRED & ελευθερώνει τη θέση (και live στη διαθεσιμότητα).
- **Ειδοποίηση** πελάτη (inbox + push) με ασφαλή σύνδεσμο αποδοχής. **Web σελίδα**
  `/rantevou/offer/[token]` (Αποδοχή/Απόρριψη). Στην **app**, η offer ειδοποίηση ανοίγει
  αυτή τη σελίδα. **Admin**: σελίδα «Αναμονή» με λίστα αιτημάτων + φόρμα προσφοράς θέσης.
- Η προσφορά **δεν** εμφανίζεται ποτέ ως ήδη επιβεβαιωμένο ραντεβού.
- **Δοκιμές (API)**: hold εξαιρεί τη θέση (+buffer)· accept → κράτηση· concurrency 1/1·
  expiry → EXPIRED & ελεύθερη θέση. Website build & mobile type-check καθαρά. ✅

## ⏳ Επόμενη φάση (δεν έγινε ακόμη)
8. **Store prep**: EAS build profiles (dev/preview/prod), hi-res icon/splash,
   deep links verified, Android channel, άδειες, δημόσια σελίδα διαγραφής λογαριασμού +
   **tests** (επικάλυψη, διπλό submit, ξένα ραντεβού, push denial, offline/expired, waitlist).

## Credentials/ρυθμίσεις που θα χρειαστούν
- `MOBILE_JWT_SECRET` (prod) — βλ. `.env.example`.
- `EXPO_ACCESS_TOKEN` για push (από expo.dev) — χωρίς αυτό, inbox δουλεύει, push όχι.
- Apple/Google developer accounts & push credentials για δημοσίευση (όταν δοθεί εντολή).

> Οι εκδόσεις Expo/RN θα κλειδωθούν από την επίσημη τεκμηρίωση κατά το scaffold της
> εφαρμογής (φάση 4). Καμία δημοσίευση σε stores / πραγματικές ειδοποιήσεις χωρίς εντολή.
