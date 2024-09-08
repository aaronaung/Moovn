import { NextRequest, NextResponse } from "next/server";
import r2 from "@/src/libs/r2/r2-instance";

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");
  const bucketName = searchParams.get("bucket");

  if (!key || !bucketName) {
    return NextResponse.json({ message: "Invalid key or bucket" }, { status: 400 });
  }

  try {
    await r2.deleteObject(bucketName, key);
    return NextResponse.json({ message: "Object deleted successfully" });
  } catch (error) {
    console.error("Error deleting object:", error);
    return NextResponse.json({ message: "Error deleting object" }, { status: 500 });
  }
}
