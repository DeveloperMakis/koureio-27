# ΤΟ ΚΟΥΡΕΙΟΝ 27 — Mobile app (Expo / React Native)

Εφαρμογή Android & iPhone που χρησιμοποιεί το **ίδιο backend** με το website
(κοινή βάση, κοινή λογική κρατήσεων) μέσω HTTPS API (`/api/v1`).

## Στοίβα
Expo SDK 52 · React Native 0.76 · Expo Router 4 · React Query 5 · expo-secure-store.

## Εκκίνηση (development)
```bash
# 1) Ξεκίνα το backend (από τη ρίζα του project)
cd ..
npm run dev            # http://localhost:3000

# 2) Ρύθμισε το API base URL ώστε να το βλέπει η συσκευή/emulator
#    (localhost ΔΕΝ δουλεύει σε πραγματικό κινητό)
#    Άλλαξε το "extra.apiBaseUrl" στο mobile/app.json:
#      - Πραγματικό κινητό (Expo Go, ίδιο WiFi):  http://<IP-του-PC>:3000   π.χ. http://192.168.1.10:3000
#      - Android emulator:                         http://10.0.2.2:3000
#      - iOS simulator:                            http://localhost:3000

# 3) Εγκατάσταση & εκκίνηση της εφαρμογής
cd mobile
npm install
npx expo start
# Σκάναρε το QR με Expo Go (Android/iOS) ή πάτα a (Android) / i (iOS)
```

> Αν δεις προειδοποιήσεις έκδοσης: `npx expo install --fix` (ευθυγραμμίζει τις
> εκδόσεις των expo-* πακέτων με το SDK).

## Τι περιλαμβάνει (φάση 4)
- **Tabs**: Αρχική · Ραντεβού · Ειδοποιήσεις (με badge) · Προφίλ.
- **Auth**: εγγραφή/σύνδεση/αποσύνδεση, tokens σε **SecureStore**, auto-refresh.
- **Κράτηση**: υπηρεσία → (κουρέας) → ημέρα/ώρα (ομαδοποιημένες + «Πρώτο
  διαθέσιμο») → σύνοψη → επιβεβαίωση, με idempotency & χειρισμό «ώρα καλύφθηκε».
- **Τα ραντεβού μου**: επερχόμενα/προηγούμενα, ημερολόγιο (.ics), αλλαγή (web),
  ακύρωση (in-app).
- **Inbox**: ειδοποιήσεις, αναγνωσμένα/μη, badge.
- **Προφίλ**: στοιχεία, αγαπημένος κουρέας, διακόπτης ειδοποιήσεων, όροι/απόρρητο,
  **διαγραφή λογαριασμού** (ακυρώνει μελλοντικά ραντεβού, κρατά ανώνυμο ιστορικό).

## Δεν έγινε ακόμη (επόμενες φάσεις)
Push αποστολή + background worker/outbox (φάση 6), πλήρης waitlist offer flow
(φάση 7), build profiles EAS / store assets hi-res (φάση 8), in-app reschedule UI,
tests σε συσκευή. Το **push** χρειάζεται development build (όχι Expo Go) + Expo
credentials — δεν στέλνει πραγματικές ειδοποιήσεις χωρίς αυτά.

## Branding
Icon/splash/χρώματα από το λογότυπο του καταστήματος (μαύρο + χρυσό). Για τα stores
χρειάζεται **hi-res** icon (1024×1024) & splash — τα τρέχοντα είναι placeholder από
το υπάρχον λογότυπο.
