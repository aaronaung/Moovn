import { NextRequest, NextResponse } from "next/server";
import r2 from "@/src/libs/r2/r2-instance";

export async function POST(request: NextRequest) {
  const { sourceBucket, sourceKey, destBucket, destKey } = await request.json();

  if (!sourceBucket || !sourceKey || !destBucket || !destKey) {
    return NextResponse.json({ message: "Invalid parameters" }, { status: 400 });
  }

  try {
    await r2.copyObject(sourceBucket, sourceKey, destBucket, destKey);
    return NextResponse.json({ message: "Object copied successfully" });
  } catch (error) {
    console.error("Error copying object:", error);
    return NextResponse.json({ message: "Error copying object" }, { status: 500 });
  }
}
