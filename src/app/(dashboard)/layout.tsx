import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/config";
import { Topbar } from "@/components/layout/topbar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-background">
      <Topbar />
      <main className="relative z-10 mx-auto max-w-[1400px] px-6 pt-8 pb-10">
        {children}
      </main>
    </div>
  );
}
