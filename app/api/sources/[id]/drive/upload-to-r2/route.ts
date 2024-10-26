import { NextRequest, NextResponse } from "next/server";
import { DriveClient } from "@/src/libs/sources/drive";
import { supaServerClient } from "@/src/data/clients/server";
import r2Instance from "@/src/libs/r2/r2-instance";
import { getBucketName } from "@/src/libs/r2/r2-buckets";
import { Readable } from "stream";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sourceId = params.id;
    const { filePath, r2Key } = await req.json();

    if (!filePath || !r2Key) {
      return NextResponse.json({ error: "File path and R2 key are required" }, { status: 400 });
    }

    const supabase = supaServerClient();
    const { data: source, error } = await supabase
      .from("sources")
      .select("*")
      .eq("id", sourceId)
      .single();

    if (error) throw new Error(`Failed to fetch source: ${error.message}`);
    if (!source) throw new Error("Source not found");

    const driveClient = new DriveClient(supabase, source);
    const { stream, metadata } = await driveClient.getFileStream(filePath);

    // Upload to R2
    const bucketName = getBucketName("scheduled-content");
    await r2Instance.uploadObject(bucketName, r2Key, stream as unknown as ReadableStream);

    // Generate a signed URL for the uploaded file
    const signedUrl = await r2Instance.signUrl(bucketName, r2Key, 3600); // 1 hour expiration

    return NextResponse.json({ signedUrl, metadata });
  } catch (error) {
    console.error("Error uploading Google Drive file to R2:", error);
    return NextResponse.json({ error: "Failed to upload file to R2" }, { status: 500 });
  }
}
