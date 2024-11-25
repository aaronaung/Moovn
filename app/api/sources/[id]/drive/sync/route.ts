import { NextRequest, NextResponse } from "next/server";
import { supaServerClient } from "@/src/data/clients/server";
import { SourceTypes } from "@/src/consts/sources";

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const sourceId = params.id;
    const { force_sync = false } = await req.json();

    const supabase = supaServerClient();

    // Verify the source exists and is a Google Drive source
    const { data: source, error } = await supabase
      .from("sources")
      .select("*")
      .eq("id", sourceId)
      .eq("type", SourceTypes.GoogleDrive)
      .single();

    if (error) throw new Error(`Failed to fetch source: ${error.message}`);
    if (!source) throw new Error("Source not found or is not a Google Drive source");

    // Send request to API Gateway endpoint to trigger the sync
    const response = await fetch(`${process.env.CONTENT_SCHEDULING_API_HOST}/initiate-drive-sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.CONTENT_SCHEDULING_API_KEY!,
      },
      body: JSON.stringify({
        sourceIds: [sourceId],
        forceSync: force_sync,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to initiate drive sync: ${await response.text()}`);
    }

    return NextResponse.json({
      message: "Drive sync initiated successfully",
      source_id: sourceId,
    });
  } catch (error: any) {
    console.error("Error initiating drive sync:", error);
    return NextResponse.json(
      {
        error: "Failed to initiate drive sync",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
