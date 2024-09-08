import { NextRequest, NextResponse } from "next/server";
import r2 from "@/src/libs/r2/r2-instance";

export async function POST(request: NextRequest) {
  const { sourceBucket, sourceKey, destBucket, destKey } = await request.json();

  if (!sourceBucket || !sourceKey || !destBucket || !destKey) {
    return NextResponse.json({ message: "Invalid parameters" }, { status: 400 });
  }

  try {
    await r2.moveObject(sourceBucket, sourceKey, destBucket, destKey);
    return NextResponse.json({ message: "Object moved successfully" });
  } catch (error) {
    console.error("Error moving object:", error);
    return NextResponse.json({ message: "Error moving object" }, { status: 500 });
  }
}
