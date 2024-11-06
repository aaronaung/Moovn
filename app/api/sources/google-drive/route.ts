import { NextResponse } from "next/server";
import { getSourcesByType } from "@/src/data/sources";
import { SourceTypes } from "@/src/consts/sources";
import { DriveSourceClient } from "@/src/libs/sources/drive";
import { supaServerClient } from "@/src/data/clients/server";

export async function GET() {
  try {
    const supabase = supaServerClient();
    const driveSources = await getSourcesByType(SourceTypes.GoogleDrive, {
      client: supabase,
    });

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
