import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

import Navbar from "../components/navbar";
import Footer from "../components/footer";
import Sidebar from "../components/sidebar";

export default async function DashboardLayout({ children }) {
  // 🔐 Protect dashboard pages
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/"); // redirect to login/home if not logged in
  }

  return (
    <div className="flex flex-col h-screen w-full">
      <Navbar isLoggedIn={true} adminOnly={false} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar initialUserType={session?.user?.userType || null} />
        <main className="flex-1 bg-white overflow-hidden">
          <div className="h-full w-full overflow-auto p-4">{children}</div>
        </main>
      </div>
      <Footer />
    </div>
  );
}
