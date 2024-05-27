import AuthProvider from "@/src/providers/auth-provider";
import { getLoggedInUserBusinesses } from "@/src/data/businesses";
import { supaServerComponentClient } from "@/src/data/clients/server";
import { redirect } from "next/navigation";
import dynamic from "next/dynamic";

const Dashboard = dynamic(() => import("./_components/dashboard-layout"), {
  ssr: false,
});

export const metadata = {
  title: "Moovn | App",
  description: "Moovn is the best place to teach and learn dance.",
};
// Everything under /app is auth protected in middleware.ts.
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, businesses } = await getLoggedInUserBusinesses({
    client: supaServerComponentClient(),
  });
  if (!user) {
    redirect("/sign-in?return_path=/app/student/classes");
  }

  return (
    <AuthProvider redirectOnUnauthed>
      <Dashboard user={user ?? undefined} businesses={businesses}>
        {children}
      </Dashboard>
    </AuthProvider>
  );
}
