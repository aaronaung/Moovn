import { NextRequest, NextResponse } from "next/server";
import { DriveClient } from "@/src/libs/sources/drive";
import { supaServerClient } from "@/src/data/clients/server";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sourceId = params.id;
    const supabase = supaServerClient();
    // Fetch the source from the database
    const { data: source, error } = await supabase
      .from("sources")
      .select("*")
      .eq("id", sourceId)
      .single();

    if (error) throw new Error(`Failed to fetch source: ${error.message}`);
    if (!source) throw new Error("Source not found");

    const driveClient = new DriveClient(supabase, source);
    const folders = await driveClient.listFolders();

    return NextResponse.json({ folders });
  } catch (error) {
    console.error("Error listing Google Drive folders:", error);
    return NextResponse.json({ error: "Failed to list folders" }, { status: 500 });
  }
}
