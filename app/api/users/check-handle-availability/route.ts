import { NextRequest, NextResponse } from "next/server";
import { supaServerClient } from "@/src/data/clients/server";

export async function POST(request: NextRequest) {
  try {
    const { handle } = await request.json();

    if (!handle || typeof handle !== "string") {
      return NextResponse.json(
        { error: "Handle is required and must be a string" },
        { status: 400 },
      );
    }

    // Basic handle validation
    if (!/^[a-zA-Z0-9_]+$/.test(handle)) {
      return NextResponse.json(
        { error: "Handle can only contain letters, numbers, and underscores" },
        { status: 400 },
      );
    }

    const client = supaServerClient();

    // Check if handle exists in the database
    const { data, error } = await client
      .from("users")
      .select("id")
      .eq("handle", handle)
      .maybeSingle();

    if (error) {
      console.error("Error checking handle availability:", error);
      return NextResponse.json({ error: "Failed to check handle availability" }, { status: 500 });
    }

    // Return true if handle is available (no existing user found)
    const isAvailable = !data;
    console.log("isAvailable", data);

    return NextResponse.json({
      available: isAvailable,
      handle: handle,
    });
  } catch (error) {
    console.error("Error in check-handle-availability API:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
