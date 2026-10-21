# Deploy στο Coolify — `barbershop.install.gr`

Το project είναι **deploy-ready** (Next standalone + `Dockerfile` + SQLite σε volume).
Το Coolify κάνει deploy από **Git repo**, οπότε ο κώδικας πρέπει πρώτα να μπει σε
GitHub/GitLab (δες §1).

## 1) Κώδικας σε Git
```bash
git init && git add -A && git commit -m "Initial"
# Δημιούργησε repo (π.χ. με GitHub CLI):
gh repo create koureio-27 --private --source=. --push
# ή χειροκίνητα: φτιάξε repo στο GitHub και:
#   git remote add origin <URL> && git branch -M main && git push -u origin main
```
> `.gitignore` εξαιρεί `node_modules`, `.env`, `*.db`, `mobile/node_modules` κ.λπ.
> ΔΕΝ ανεβαίνουν μυστικά ή βάση με στοιχεία πελατών.

## 2) DNS
Βάλε A record: **`barbershop.install.gr` → IP του Coolify server**.

## 3) Coolify → νέα εφαρμογή
- Login στο `http://172.16.100.141:8000`.
- **New Resource → Application → Public/Private Repository** (το repo του §1).
- **Build Pack: Dockerfile** (υπάρχει στη ρίζα).
- **Port:** `3000`.
- **Domain:** `https://barbershop.install.gr` (το Coolify βγάζει αυτόματα Let's Encrypt SSL).

## 4) Persistent storage (SQLite)
Πρόσθεσε **Volume**: mount path **`/data`** (εκεί ζει η βάση `prod.db`).

## 5) Environment variables
```
DATABASE_URL=file:/data/prod.db
SESSION_SECRET=<τυχαίο 32+ χαρακτήρες>
MOBILE_JWT_SECRET=<τυχαίο 32+>
WORKER_SECRET=<τυχαίο 32+>
NEXT_PUBLIC_SITE_URL=https://barbershop.install.gr
# Πρώτος διαχειριστής (δημιουργείται στο πρώτο boot):
ADMIN_EMAIL=you@example.gr
ADMIN_PASSWORD=<ισχυρός κωδικός 8+>
# Προαιρετικά (ειδοποιήσεις):
# EXPO_ACCESS_TOKEN=...   SMS_PROVIDER=twilio  TWILIO_ACCOUNT_SID=...  TWILIO_AUTH_TOKEN=...  SMS_FROM=...
```
> Δημιουργία τυχαίου secret: `openssl rand -base64 32`.

## 6) Deploy
Πάτα **Deploy**. Στο boot ο container: `prisma db push` → `prod-setup` (υπηρεσίες
ανενεργές + κουρέας/ωράριο + admin από τα env) → ξεκινά ο server.

## 7) Worker (ειδοποιήσεις/υπενθυμίσεις)
Στην εφαρμογή στο Coolify → **Scheduled Tasks** → νέα εργασία κάθε λεπτό:
```
curl -s -X POST "https://barbershop.install.gr/api/worker/run" -H "x-worker-secret: $WORKER_SECRET"
```
(ή cron container που καλεί το ίδιο URL).

## 8) Μετά το deploy
1. Μπες στο `https://barbershop.install.gr/admin` (ADMIN_EMAIL/PASSWORD).
2. Ενεργοποίησε υπηρεσίες + πραγματικές τιμές στο `/admin/services`.
3. (Προαιρετικά) ανέβασε φωτογραφίες στο `public/photos/` και κάνε redeploy.

## 9) Mobile app
Στο `mobile/app.json` (`extra.apiBaseUrl`) ή `mobile/eas.json` βάλε
`https://barbershop.install.gr`, μετά build με EAS.

---
### Εναλλακτικά: deploy μέσω Coolify API
Αν μου δώσεις **Coolify API token** (Settings → API Tokens) και το repo URL,
μπορώ να δημιουργήσω την εφαρμογή + env + deploy μέσω API, χωρίς login από εμένα.
