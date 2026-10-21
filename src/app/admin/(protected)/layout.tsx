import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getCurrentAdminId } from "@/lib/auth";
import { AdminNav } from "@/components/admin/AdminNav";

export const dynamic = "force-dynamic";

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const adminId = await getCurrentAdminId();
  if (!adminId) redirect("/admin/login");
  const session = await getSession();

  return (
    <div className="min-h-screen bg-ink-950">
      <AdminNav email={session.email} />
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">{children}</div>
    </div>
  );
}
