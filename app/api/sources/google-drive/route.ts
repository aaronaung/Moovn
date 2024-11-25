import { NextResponse } from "next/server";
import { getSourcesByType } from "@/src/data/sources";
import { SourceTypes } from "@/src/consts/sources";
import { DriveSourceClient } from "@/src/libs/sources/drive";
import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/db";
import { env } from "@/env.mjs";

export async function GET() {
  try {
    const supabase = createClient<Database>(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
    );
    const driveSources = await getSourcesByType(SourceTypes.GoogleDrive, {
      client: supabase,
    });
    console.log({ driveSources });

    if (!driveSources || driveSources.length === 0) {
      return NextResponse.json({ sources: [] });
    }

    const driveSourcesWithAccessToken = await Promise.all(
      driveSources.map(async (source) => {
        const client = new DriveSourceClient(supabase, source);

        await client.refreshTokenIfExpired();
        const { access_token } = source.settings as { access_token: string };
        return { ...source, access_token };
      }),
    );

    return NextResponse.json({ sources: driveSourcesWithAccessToken });
  } catch (error) {
    console.error("Error fetching Google Drive sources:", error);
    return NextResponse.json({ error: "Failed to fetch Google Drive sources" }, { status: 500 });
  }
}
