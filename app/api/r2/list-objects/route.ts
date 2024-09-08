import { NextRequest, NextResponse } from "next/server";
import r2 from "@/src/libs/r2/r2-instance";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const bucketName = searchParams.get("bucket");
  const prefix = searchParams.get("prefix") || undefined;

  if (!bucketName) {
    return NextResponse.json({ message: "Invalid bucket" }, { status: 400 });
  }

  try {
    const objects = await r2.listObjects(bucketName, prefix);
    return NextResponse.json({ objects });
  } catch (error) {
    console.error("Error listing objects:", error);
    return NextResponse.json({ message: "Error listing objects" }, { status: 500 });
  }
}
