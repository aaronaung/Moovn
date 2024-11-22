"use client";

import { useEffect } from "react";
import { useSupaQuery } from "@/src/hooks/use-supabase";
import { getSourcesByTypes } from "@/src/data/sources";
import { SourceTypes } from "@/src/consts/sources";
import { db } from "@/src/libs/indexeddb/indexeddb";
import pLimit from "p-limit";

const CONCURRENT_FETCHES = 15;

type StaffMember = {
  id: string;
  name: string;
  profile_image_url: string;
};

export default function StaffImagesPrefetch() {
  const { data: sources } = useSupaQuery(getSourcesByTypes, {
    arg: [SourceTypes.Pike13, SourceTypes.Mindbody],
    queryKey: ["getSourcesByTypes", "staff-images"],
  });

  useEffect(() => {
    async function prefetchStaffImages() {
      if (!sources) return;

      // Create a concurrency limiter
      const limit = pLimit(CONCURRENT_FETCHES);

      for (const source of sources) {
        try {
          // Fetch staff data from your API
          const response = await fetch(`/api/sources/${source.id}/staff`);
          if (!response.ok) continue;

          const { staff } = await response.json();

          console.log(`Found ${staff.length} staff members for source: ${source.id}`, { staff });

          // Create a batch of promises for all staff members that need caching
          const cachingPromises = staff
            .filter((member: StaffMember) => member.profile_image_url)
            .map((member: StaffMember) => {
              return limit(async () => {
                const key = member.profile_image_url;
                try {
                  // Check if we already have this image cached
                  const existingImage = await db.staffImages.get(key);
                  if (existingImage) return;

                  // Fetch and cache the image
                  const imageBlob = await (
                    await fetch(`/api/sources/download-image`, {
                      method: "POST",
                      body: JSON.stringify({ url: member.profile_image_url }),
                      headers: {
                        "Content-Type": "application/json",
                      },
                    })
                  ).arrayBuffer();

                  await db.staffImages.put({
                    key,
                    blob: imageBlob,
                    lastUpdated: new Date(),
                  });

                  console.log(`Cached image for staff member: ${member.name}`);
                } catch (error) {
                  console.error(`Failed to cache image for staff member: ${member.name}`, error);
                }
              });
            });

          // Wait for all caching operations to complete
          await Promise.all(cachingPromises);
        } catch (error) {
          console.error(`Failed to fetch staff for source: ${source.id}`, error);
        }
      }
    }

    prefetchStaffImages();
  }, [sources]);

  return null;
}
