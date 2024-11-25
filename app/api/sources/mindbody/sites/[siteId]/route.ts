import { NextRequest, NextResponse } from "next/server";
import { MindbodyClient } from "@/src/libs/sources/mindbody";

export async function GET(request: NextRequest, props: { params: Promise<{ siteId: string }> }) {
  const params = await props.params;
  try {
    const mindbodyClient = new MindbodyClient(params.siteId);
    const siteData = await mindbodyClient.getSiteData();

    return NextResponse.json(siteData);
  } catch (error) {
    console.error("Error retrieving site data:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
