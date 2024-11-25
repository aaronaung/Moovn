import { NextRequest, NextResponse } from "next/server";
import { DriveSourceClient } from "@/src/libs/sources/drive";
import { supaServerClient } from "@/src/data/clients/server";

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
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

    const driveClient = new DriveSourceClient(supabase, source);
    const folders = await driveClient.listFolders();

    const files = await driveClient.getFileById("1IjaLJCUieLJythIzDyPP7dco_NxxJNft");

    console.log(files);

    return NextResponse.json({ folders });
  } catch (error) {
    console.error("Error listing Google Drive folders:", error);
    return NextResponse.json({ error: "Failed to list folders" }, { status: 500 });
  }
}
