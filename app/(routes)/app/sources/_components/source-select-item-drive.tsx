"use client";
import { GoogleDriveIcon } from "@/src/components/ui/icons/google";

import { Tables } from "@/types/db";

export default function SourceSelectItemDrive({ source }: { source: Tables<"sources"> }) {
  return (
    <div>
      <GoogleDriveIcon className="mr-1.5 w-[48px]" />
    </div>
  );
}
