import { NextRequest, NextResponse } from "next/server";
import r2 from "@/src/libs/r2/r2-instance";

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");
  const bucketName = searchParams.get("bucket");

  if (!key || !bucketName) {
    return NextResponse.json({ message: "Invalid key or bucket" }, { status: 400 });
  }

  try {
    const body = await request.arrayBuffer();
    await r2.uploadObject(bucketName, key, Buffer.from(body));
    return NextResponse.json({ message: "Object uploaded successfully" });
  } catch (error) {
    console.error("Error uploading object:", error);
    return NextResponse.json({ message: "Error uploading object" }, { status: 500 });
  }
}
