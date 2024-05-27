import { Metadata } from "next";
import { redirect } from "next/navigation";

import { getAuthUser } from "@/src/data/users";
import { supaServerComponentClient } from "@/src/data/clients/server";
import { SignUpForm } from "@/src/components/forms/sign-up-form";

export const metadata: Metadata = {
  title: "Sign up",
  description: "Sign up to your account",
};

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: { return_path?: string };
}) {
  const user = await getAuthUser({ client: supaServerComponentClient() });
  if (user) {
    redirect(searchParams.return_path || "/app/student/explore");
  }

  return <SignUpForm returnPath={searchParams.return_path} />;
}
