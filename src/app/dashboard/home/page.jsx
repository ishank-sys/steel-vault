import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export default async function DashboardHomeRedirect() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/");

  const type = String(session.user?.userType || '').toLowerCase();
  // Admin and employees use the same dashboard for now
  if (type.includes('client')) {
    redirect('/clients/view-files');
  }

  // default: employee/admin dashboard
  redirect('/dashboard/home/dashboard');
}
