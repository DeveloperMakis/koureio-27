#!/bin/sh
set -e

echo "→ Prisma db push (δημιουργία/συγχρονισμός σχήματος στη SQLite στο volume)"
node node_modules/prisma/build/index.js db push --skip-generate

echo "→ Αρχικό setup (υπηρεσίες/κουρέας/ωράριο + admin αν δοθούν ADMIN_EMAIL/ADMIN_PASSWORD)"
node scripts/prod-setup.mjs || echo "prod-setup skipped/failed (συνεχίζουμε)"

echo "→ Εκκίνηση Next server"
exec node server.js
