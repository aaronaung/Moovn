import { NextRequest, NextResponse } from "next/server";
import { DriveClient } from "@/src/libs/sources/drive";
import { supaServerClient } from "@/src/data/clients/server";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sourceId = params.id;
    const filePath = req.nextUrl.searchParams.get("filePath");

    if (!filePath) {
      return NextResponse.json({ error: "File path is required" }, { status: 400 });
    }

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
    const { downloadLink, metadata } = await driveClient.getFileDownloadLink(filePath);

    if (!downloadLink) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    return NextResponse.json({ downloadLink, metadata });
  } catch (error) {
    console.error("Error getting Google Drive file download link:", error);
    return NextResponse.json({ error: "Failed to get file download link" }, { status: 500 });
  }
}
