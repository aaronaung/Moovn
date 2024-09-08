import { NextRequest, NextResponse } from "next/server";
import r2 from "@/src/libs/r2/r2-instance";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const bucketName = searchParams.get("bucket");
  const key = searchParams.get("key");

  if (!bucketName || !key) {
    return NextResponse.json({ message: "Invalid bucket or key" }, { status: 400 });
  }

  try {
    const exists = await r2.exists(bucketName, key);
    return NextResponse.json({ exists });
  } catch (error) {
    console.error("Error checking object existence:", error);
    return NextResponse.json({ message: "Error checking object existence" }, { status: 500 });
  }
}
