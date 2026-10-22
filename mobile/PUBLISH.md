# Δημοσίευση εφαρμογής «ΤΟ ΚΟΥΡΕΙΟΝ 27» (Android + iOS)

Η εφαρμογή (Expo/React Native) είναι **έτοιμη** και συνδεδεμένη με το live backend
(`https://barbershop.install.gr`). Αυτός ο οδηγός σε πάει από το μηδέν μέχρι το
Google Play και το App Store.

> Τι χρειάζεται από εσένα (δεν μπορώ να το κάνω εγώ): λογαριασμοί developer, το
> build (γίνεται με το δικό σου login) και μερικά γραφικά. Όλα τα υπόλοιπα (κώδικας,
> ρυθμίσεις, κείμενα) είναι έτοιμα παρακάτω.

---

## 0) Κόστος & λογαριασμοί (μία φορά)
| Τι | Κόστος | Πού |
|---|---|---|
| Expo account | Δωρεάν | expo.dev |
| Google Play Developer | **25$ εφάπαξ** | play.google.com/console |
| Apple Developer Program | **99$/έτος** | developer.apple.com |

> Το iOS build γίνεται στο **cloud του EAS** — **δεν χρειάζεσαι Mac**.

---

## 1) Γραφικά που πρέπει να ετοιμάσεις
- **App icon 1024×1024 px** (PNG, χωρίς διαφάνεια). ⚠️ Το τρέχον λογότυπο είναι
  150×150 — πολύ μικρό. Στείλε μου το **λογότυπο σε υψηλή ανάλυση** και το στρώνω
  στα σωστά μεγέθη (`assets/icon.png`, `assets/adaptive-icon.png`, `assets/splash.png`).
- **Screenshots κινητού** (τουλάχιστον 2–3 ανά πλατφόρμα). Πώς: τρέξε την εφαρμογή
  (βλ. §2) και τράβα screenshots από τις οθόνες Αρχική / Ραντεβού / Κράτηση.
- **Google Play feature graphic 1024×500 px** (ένα banner — μπορώ να σου το φτιάξω
  όταν έχω το λογότυπο υψηλής ανάλυσης).

---

## 2) Δοκιμή πριν το store (δωρεάν, 5 λεπτά)
Σε υπολογιστή με Node:
```bash
cd mobile
npm install
npx expo start
```
Σκάναρε το QR με την εφαρμογή **Expo Go** (Play Store/App Store) στο κινητό σου.
Η εφαρμογή τρέχει πάνω στο πραγματικό backend. (Τα push notifications δουλεύουν
πλήρως μόνο στο κανονικό build, όχι στο Expo Go.)

---

## 3) Εγκατάσταση EAS
```bash
npm install -g eas-cli
eas login            # με τον Expo λογαριασμό σου
cd mobile
eas init             # συνδέει το project με τον λογαριασμό σου (δημιουργεί projectId)
```

---

## 4) Build

### Android (για δοκιμή σε οποιοδήποτε κινητό — APK)
```bash
eas build -p android --profile preview
```
Σου δίνει ένα link για **APK** που το στέλνεις σε όποιον θες.

### Android (για το Google Play — AAB)
```bash
eas build -p android --profile production
```

### iOS (για το App Store — στο cloud, χωρίς Mac)
```bash
eas build -p ios --profile production
```
Θα σου ζητήσει τα στοιχεία του Apple Developer λογαριασμού (το EAS διαχειρίζεται
αυτόματα τα certificates/provisioning).

---

## 5) Αποστολή στα stores
```bash
# Google Play (πρώτη φορά: φτιάξε την εφαρμογή στο Play Console + ανέβασε 1 AAB χειροκίνητα)
eas submit -p android --profile production

# App Store
eas submit -p ios --profile production
```
Μετά συμπληρώνεις το store listing (κείμενα §7), screenshots, και πατάς **Submit for review**
(έγκριση ~1–3 ημέρες).

---

## 6) Push notifications (ειδοποιήσεις)
- Ο κώδικας είναι ήδη έτοιμος (Expo push + inbox).
- **Android:** δουλεύει μέσω Expo/FCM — το EAS το ρυθμίζει στο build.
- **iOS:** χρειάζεται ένα **APNs key** από τον Apple Developer λογαριασμό· το EAS σε
  καθοδηγεί (`eas credentials`).
- Προαιρετικά, για πιο αξιόπιστη αποστολή, βάλε ένα **EXPO_ACCESS_TOKEN** στο backend
  (Coolify env) — πες μου και το προσθέτω.

---

## 7) Έτοιμα κείμενα για τα stores

**Όνομα:** ΤΟ ΚΟΥΡΕΙΟΝ 27
**Υπότιτλος / Short description (≤80 χαρ.):**
Κλείσε ραντεβού στο κουρείο σου, εύκολα και γρήγορα.

**Περιγραφή (Ελληνικά):**
Η επίσημη εφαρμογή του «ΤΟ ΚΟΥΡΕΙΟΝ 27» στον Κορυδαλλό. Κλείσε το ραντεβού σου σε
λίγα δευτερόλεπτα, δες τα επερχόμενα ραντεβού σου, λάβε υπενθυμίσεις και ειδοποιήσεις
για προσφορές.
• Γρήγορη κράτηση: υπηρεσία, ημέρα και ώρα σε λίγα βήματα.
• Τα ραντεβού σου πάντα μαζί σου — αλλαγή ή ακύρωση με ένα άγγιγμα.
• Υπενθυμίσεις πριν το ραντεβού, ώστε να μην το ξεχάσεις.
• Ειδοποιήσεις για προσφορές και νέα του καταστήματος.
Πληρωμή στο κατάστημα. Δεν χρειάζεται κάρτα.

**Description (English):**
The official app of "TO KOUREION 27" barbershop in Korydallos, Athens. Book your
appointment in seconds, view your upcoming visits, get reminders and offers.
• Fast booking in a few taps.
• Manage, reschedule or cancel your appointments.
• Reminders before your appointment.
• Notifications for offers and shop news.
Pay in store. No card required.

**Keywords:** κουρείο, barber, ραντεβού, κούρεμα, Κορυδαλλός, barbershop, booking
**Κατηγορία:** Lifestyle (ή Beauty)
**Πολιτική απορρήτου (URL):** https://barbershop.install.gr/aporrito
**Διαγραφή λογαριασμού (URL, απαιτείται από Apple/Google):** https://barbershop.install.gr/diagrafi-logariasmou
**Email επικοινωνίας:** (βάλε το email σου)

---

## 8) Checklist πριν το submit
- [ ] App icon 1024×1024 (στείλε μου το λογότυπο HD)
- [ ] 2–3 screenshots ανά πλατφόρμα
- [ ] Google Play feature graphic 1024×500
- [ ] Λογαριασμοί developer ενεργοί
- [ ] Δοκιμή με APK (§4) ότι όλα δουλεύουν στο live backend
- [ ] (iOS) APNs key για push
