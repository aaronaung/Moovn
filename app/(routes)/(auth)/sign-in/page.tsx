import { Metadata } from "next";
import { redirect } from "next/navigation";

import { getAuthUser } from "@/src/data/users";
import { supaServerComponentClient } from "@/src/data/clients/server";
import { SignInForm } from "@/src/components/forms/sign-in-form";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your account",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: { return_path?: string };
}) {
  const user = await getAuthUser({ client: supaServerComponentClient() });
  if (user) {
    redirect(searchParams.return_path || "/app/student/explore");
  }

  return <SignInForm returnPath={searchParams.return_path} />;
}
