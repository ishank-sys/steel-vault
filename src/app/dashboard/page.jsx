import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import Dashboard from "../components/HomeComponent/Dashboard";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/");
  }
  const type = String(session.user?.userType || '').toLowerCase();
  if (type.includes('client')) {
    // Keep clients inside dashboard so they see the sidebar
    redirect('/dashboard/home/dashboard');
  }
  if (type.includes('admin')) {
    // Admins land on the main dashboard for now
    return <Dashboard />;
  }
  if (type.includes('employee')) {
    return <Dashboard />;
  }
  // Unknown role: fallback to employee dashboard
  return <Dashboard />;
}
