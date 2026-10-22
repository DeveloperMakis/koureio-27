import { getPhotos, photoUrl } from "@/lib/site-photos";
import { PhotoUploader } from "@/components/admin/PhotoUploader";

export const dynamic = "force-dynamic";

export default async function AdminPhotosPage() {
  const [hero, contact, gallery] = await Promise.all([getPhotos("hero"), getPhotos("contact"), getPhotos("gallery")]);
  const toImg = (rows: { id: string }[]) => rows.map((r) => ({ id: r.id, url: photoUrl(r.id) }));

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-bone">Φωτογραφίες</h1>
      <p className="mt-1 text-sm text-bone-muted">
        Ανέβασε φωτογραφίες του καταστήματος. Εμφανίζονται αμέσως στο site. (Για το gallery, αν έχεις συνδέσει
        Instagram, προτεραιότητα έχουν οι φωτογραφίες του Instagram.)
      </p>

      <div className="mt-6 space-y-5">
        <PhotoUploader
          slot="contact"
          label="Πρόσοψη (ενότητα «Επικοινωνία»)"
          hint="Η εξωτερική όψη του καταστήματος."
          current={toImg(contact)}
        />
        <PhotoUploader
          slot="hero"
          label="Κεντρική εικόνα (αρχική σελίδα)"
          hint="Η μεγάλη φωτογραφία στην κορυφή της αρχικής."
          current={toImg(hero)}
        />
        <PhotoUploader
          slot="gallery"
          label="Gallery (πολλές φωτογραφίες)"
          hint="Κουρέματα, χώρος, λεπτομέρειες. Μπορείς να ανεβάσεις πολλές."
          multiple
          current={toImg(gallery)}
        />
      </div>
    </div>
  );
}
