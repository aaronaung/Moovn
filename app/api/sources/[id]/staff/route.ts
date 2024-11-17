import { NextRequest, NextResponse } from "next/server";
import { supaServerClient } from "@/src/data/clients/server";
import { MindbodySourceSettings, Pike13SourceSettings, SourceTypes } from "@/src/consts/sources";
import { MindbodyClient } from "@/src/libs/sources/mindbody";
import { Pike13Client } from "@/src/libs/sources/pike13";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sourceId = params.id;
    const supabase = supaServerClient();

    // Fetch source details
    const { data: source, error } = await supabase
      .from("sources")
      .select("*")
      .eq("id", sourceId)
      .single();

    if (error) throw new Error(`Failed to fetch source: ${error.message}`);
    if (!source) throw new Error("Source not found");

    if (!source.settings) throw new Error("Source settings not found");
    let staff = [];
    switch (source.type) {
      case SourceTypes.Mindbody: {
        const client = new MindbodyClient((source.settings as MindbodySourceSettings).site_id);
        const sites = await client.getSites();
        const site = sites.find(
          (s: any) => s.Id == (source.settings as MindbodySourceSettings).site_id,
        );
        if (!site) throw new Error("Site not found");

        // Get staff from Mindbody
        const classes = await client.getRawEventOcurrences(
          new Date().toISOString().split("T")[0], // today
          new Date().toISOString().split("T")[0], // today
        );

        // Extract unique staff from classes
        const uniqueStaff = new Map();
        classes.forEach((cls: any) => {
          if (cls.Staff?.Id && !uniqueStaff.has(cls.Staff.Id)) {
            uniqueStaff.set(cls.Staff.Id, {
              id: cls.Staff.Id,
              name: cls.Staff.Name,
              profile_image_url:
                cls.Staff.ImageUrl ??
                `https://ui-avatars.com/api/?name=${encodeURIComponent(cls.Staff.Name)}`,
            });
          }
        });
        staff = Array.from(uniqueStaff.values());
        break;
      }

      case SourceTypes.Pike13: {
        const client = new Pike13Client((source.settings as Pike13SourceSettings).url);
        const rawStaff = await client.getRawStaffMembers();
        staff = rawStaff.map((s: any, index: number) => ({
          id: s.id,
          name: s.name,
          profile_image_url: `https://assets.moovn.co/headshots/${(index + 1) % 10}.png`,
        }));
        break;
      }

      default:
        throw new Error(`Source type ${source.type} not supported`);
    }

    return NextResponse.json({ staff });
  } catch (error: any) {
    console.error("Error fetching staff:", error);
    return NextResponse.json(
      { error: "Failed to fetch staff", details: error.message },
      { status: 500 },
    );
  }
}
