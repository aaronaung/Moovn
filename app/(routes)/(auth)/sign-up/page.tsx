import { Metadata } from "next";
import { redirect } from "next/navigation";

import { getAuthUser } from "@/src/data/users";
import { supaServerComponentClient } from "@/src/data/clients/server";
import { SignUpForm } from "@/src/components/forms/sign-up-form";

export const metadata: Metadata = {
  title: "Sign up",
  description: "Sign up to your account",
};

export default async function SignUpPage(props: {
  searchParams: Promise<{ return_path?: string }>;
}) {
  const searchParams = await props.searchParams;
  const user = await getAuthUser({ client: await supaServerComponentClient() });
  if (user) {
    redirect(searchParams.return_path || "/app/sources");
  }

  return <SignUpForm returnPath={searchParams.return_path} />;
}
