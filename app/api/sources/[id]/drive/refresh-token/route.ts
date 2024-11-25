import { NextRequest, NextResponse } from "next/server";
import { GoogleDriveClient } from "@/src/libs/google-drive/google-drive-client";
import { supaServerClient } from "@/src/data/clients/server";
import { GoogleDriveSourceSettings } from "@/src/consts/sources";

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const supabase = supaServerClient();
  try {
    const sourceId = params.id;

    // Fetch the source settings from the database
    const { data, error } = await supabase
      .from("sources")
      .select("settings")
      .eq("id", sourceId)
      .single();

    if (error) throw new Error(`Failed to fetch source settings: ${error.message}`);
    if (!data?.settings) throw new Error("Source settings not found");

    const { refresh_token } = data.settings as GoogleDriveSourceSettings;

    if (!refresh_token) {
      throw new Error("Refresh token not found in source settings");
    }

    const googleDriveClient = new GoogleDriveClient(
      process.env.GOOGLE_CLIENT_ID!,
      process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token,
    );

    const newCredentials = await googleDriveClient.refreshAccessToken();

    // Update the access token in the database
    const { error: updateError } = await supabase
      .from("sources")
      .update({ settings: { ...(data.settings as any), ...newCredentials } })
      .eq("id", sourceId);

    if (updateError) {
      throw new Error(`Failed to update access token in database: ${updateError.message}`);
    }

    return NextResponse.json({ access_token: newCredentials.access_token });
  } catch (error) {
    console.error("Error refreshing Google Drive access token:", error);
    return NextResponse.json({ error: "Failed to refresh access token" }, { status: 500 });
  }
}
