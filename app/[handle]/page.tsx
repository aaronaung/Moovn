import { notFound } from "next/navigation";
import { getUserByHandle } from "@/src/data/users";
import { supaServerClient } from "@/src/data/clients/server";
import { StudioLandingPage } from "./_components/studio-landing-page";
import { InstructorLandingPage } from "./_components/instructor-landing-page";
import { getScheduleSources } from "@/src/data/sources";

interface HandlePageProps {
  params: Promise<{ handle: string }>;
}

export default async function HandlePage({ params }: HandlePageProps) {
  const { handle } = await params;

  const client = supaServerClient();
  const user = await getUserByHandle(handle, { client });

  console.log("Handle Page Debug:", {
    handle,
    user: user ? { id: user.id, handle: user.handle, type: user.type } : null,
  });

  if (!user) {
    notFound();
  }

  // Handle different user types
  if (user.type === "instructor") {
    return <InstructorLandingPage handle={handle} />;
  }

  if (user.type === "studio") {
    // Get the user's sources to fetch schedule data
    const sources = await getScheduleSources({ client });
    const userSources = sources.filter((source) => source.owner_id === user.id);

    console.log("Sources Debug:", {
      totalSources: sources.length,
      userSources: userSources.length,
      userSourceIds: userSources.map((s) => s.id),
    });

    return <StudioLandingPage studio={user} sources={userSources} />;
  }

  // Fallback for unknown user types
  notFound();
}
