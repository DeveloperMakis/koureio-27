import Link from "next/link";
import { business } from "@/config/business";
import { OpenNow } from "@/components/OpenNow";

export function Footer() {
  const year = new Date().getFullYear();
  const primaryPhone = business.phones.find((p) => p.primary) ?? business.phones[0];

  return (
    <footer className="border-t border-bronze/15 bg-ink-950">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-3">
        <div>
          <p className="font-display text-xl font-semibold text-bone">{business.name}</p>
          <p className="mt-1 text-sm uppercase tracking-widest2 text-bronze">
            Barber Shop · {business.area}
          </p>
          <div className="mt-4">
            <OpenNow />
          </div>
        </div>

        <div className="text-sm text-bone-muted">
          <p className="mb-3 font-semibold text-bone">Επικοινωνία</p>
          <address className="not-italic leading-relaxed">
            {business.address.full}
            <br />
            {business.phones.map((p) => (
              <span key={p.tel} className="block">
                <a href={`tel:${p.tel}`} className="hover:text-bone">
                  {p.display}
                </a>{" "}
                <span className="text-bone-dim">({p.label})</span>
              </span>
            ))}
          </address>
        </div>

        <div className="text-sm text-bone-muted">
          <p className="mb-3 font-semibold text-bone">Σύνδεσμοι</p>
          <ul className="space-y-2">
            {business.social.instagram && (
              <li>
                <a
                  href={business.social.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-bone"
                >
                  Instagram
                </a>
              </li>
            )}
            <li>
              <a
                href={business.maps.directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-bone"
              >
                Οδηγίες στο Google Maps
              </a>
            </li>
            <li>
              <Link href="/aporrito" className="hover:text-bone">
                Πολιτική απορρήτου
              </Link>
            </li>
            <li>
              <Link href="/oroi" className="hover:text-bone">
                Όροι κρατήσεων
              </Link>
            </li>
            <li>
              <Link href="/diagrafi-logariasmou" className="hover:text-bone">
                Διαγραφή λογαριασμού
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-bronze/10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-bone-dim sm:flex-row sm:px-6">
          <p>
            © {year} {business.name}. Με επιφύλαξη παντός δικαιώματος.
          </p>
          <p className="flex items-center gap-2">
            <a href={`tel:${primaryPhone.tel}`} className="hover:text-bone">
              {primaryPhone.display}
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
