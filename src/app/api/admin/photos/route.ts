import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getCurrentAdminId } from "@/lib/auth";
import { saveUploadedPhoto, deletePhoto, SLOTS, type Slot } from "@/lib/site-photos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function revalidateSite() {
  revalidatePath("/");
  revalidatePath("/rantevou");
  revalidatePath("/admin/photos");
}

/** Ανέβασμα φωτογραφίας (multipart: slot + file). Admin only. */
export async function POST(req: NextRequest) {
  if (!(await getCurrentAdminId())) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "Μη έγκυρο αίτημα." }, { status: 400 });
  }
  const slot = String(form.get("slot") ?? "") as Slot;
  const file = form.get("file");
  if (!SLOTS.includes(slot)) return NextResponse.json({ ok: false, error: "Άγνωστη θέση." }, { status: 400 });
  if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "Δεν βρέθηκε αρχείο." }, { status: 400 });

  const res = await saveUploadedPhoto(slot, file);
  if (!res.ok) return NextResponse.json({ ok: false, error: res.error }, { status: 400 });
  revalidateSite();
  return NextResponse.json({ ok: true });
}

/** Διαγραφή φωτογραφίας. Admin only. */
export async function DELETE(req: NextRequest) {
  if (!(await getCurrentAdminId())) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id") ?? "";
  if (!id) return NextResponse.json({ ok: false, error: "Λείπει id." }, { status: 400 });
  await deletePhoto(id);
  revalidateSite();
  return NextResponse.json({ ok: true });
}
