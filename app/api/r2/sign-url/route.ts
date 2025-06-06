import { NextRequest, NextResponse } from "next/server";
import r2 from "@/src/libs/r2/r2-instance";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");
  const bucketName = searchParams.get("bucket");
  const includeMetadata = searchParams.get("includeMetadata") === "true";

  if (!key || !bucketName) {
    return NextResponse.json({ message: "Invalid key or bucket" }, { status: 400 });
  }

  try {
    if (includeMetadata) {
      const signedUrlWithMetadata = await r2.signUrlWithMetadata(bucketName, key);
      return NextResponse.json(signedUrlWithMetadata ?? { signedUrl: null, metadata: {} });
    }
    const signedUrl = await r2.signUrl(bucketName, key);
    return NextResponse.json({ signedUrl });
  } catch (error) {
    console.error("Error signing URL:", error);
    return NextResponse.json({ message: "Error signing URL" }, { status: 500 });
  }
}
