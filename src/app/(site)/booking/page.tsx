import type { Metadata } from "next";
import { BookingScreen } from "@/components/booking/BookingScreen";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Κλείσε ραντεβού",
  description: "Κλείσε online ραντεβού στο ΤΟ ΚΟΥΡΕΙΟΝ 27, Κορυδαλλός. Υπηρεσία, ημέρα και ώρα σε λίγα βήματα.",
  alternates: { canonical: "/booking" },
};

export default function BookingAliasPage({ searchParams }: { searchParams: { service?: string } }) {
  return <BookingScreen initialServiceSlug={searchParams.service} />;
}
