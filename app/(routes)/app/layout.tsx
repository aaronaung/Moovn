import AuthProvider from "@/src/providers/auth-provider";
import { supaServerComponentClient } from "@/src/data/clients/server";
import { redirect } from "next/navigation";
import dynamic from "next/dynamic";
import { getAuthUser } from "@/src/data/users";

const Dashboard = dynamic(() => import("./_components/dashboard-layout"), {
  ssr: false,
});

export const metadata = {
  title: "Moovn | App",
  description: "Moovn is the best place to teach and learn dance.",
};
// Everything under /app is auth protected in middleware.ts.
export default async function Layout({ children }: { children: React.ReactNode }) {
  const user = await getAuthUser({
    client: supaServerComponentClient(),
  });
  if (!user) {
    redirect("/sign-in?return_path=/app/sources");
  }

  return (
    <AuthProvider redirectOnUnauthed>
      <Dashboard user={user ?? undefined}>{children}</Dashboard>
    </AuthProvider>
  );
}
