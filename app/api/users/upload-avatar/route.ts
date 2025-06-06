import { NextRequest, NextResponse } from "next/server";
import { supaServerComponentClient } from "@/src/data/clients/server";
import r2 from "@/src/libs/r2/r2-instance";
import { v4 as uuidv4 } from "uuid";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png"];

export async function POST(request: NextRequest) {
  try {
    const client = await supaServerComponentClient();
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("avatar") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only JPEG and PNG are allowed." },
        { status: 400 },
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size too large. Maximum size is 5MB." },
        { status: 400 },
      );
    }

    // Generate unique filename
    const fileExtension = file.name.split(".").pop() || "jpg";
    const fileName = `${uuidv4()}.${fileExtension}`;
    const objectKey = `avatars/${user.id}/${fileName}`;

    // Upload to R2
    const buffer = Buffer.from(await file.arrayBuffer());
    const avatarUrl = await r2.uploadPublicObject(objectKey, buffer);

    // Update the user's avatar URL in Supabase
    await client.from("users").update({ avatar_url: avatarUrl }).eq("id", user.id);

    return NextResponse.json({
      avatar_url: avatarUrl,
      message: "Avatar uploaded successfully",
    });
  } catch (error) {
    console.error("Error uploading avatar:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
