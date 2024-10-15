"use client";
import { env } from "@/env.mjs";
import { Button } from "@/src/components/ui/button";
import { GoogleDriveIcon } from "@/src/components/ui/icons/google";

import { GoogleDriveSourceSettings } from "@/src/consts/sources";
import { Tables } from "@/types/db";

const GOOGLE_DRIVE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";

export default function SourceSelectItemGoogleDrive({ source }: { source: Tables<"sources"> }) {
  const handleConnect = async () => {
    const state = btoa(JSON.stringify({ sourceId: source.id }));
    const scope = encodeURIComponent("https://www.googleapis.com/auth/drive.readonly");
    const authUrl = `${GOOGLE_DRIVE_AUTH_URL}?
client_id=${env.NEXT_PUBLIC_GOOGLE_CLIENT_ID}&
redirect_uri=${window.location.origin}/api/auth/google-drive/callback&
response_type=code&
scope=${scope}&
access_type=offline&
prompt=consent&
state=${state}`;

    window.location.href = authUrl;
  };

  if ((source.settings as GoogleDriveSourceSettings)?.access_token) {
    return (
      <div className="flex flex-col items-center justify-center gap-y-2">
        <div className="flex items-center justify-center">
          <GoogleDriveIcon className="w-[24px]" />
          <p className="ml-1.5 text-lg font-semibold text-secondary">Google Drive</p>
        </div>
        <Button className="w-full" variant="outline" onClick={handleConnect}>
          Reconnect
        </Button>
      </div>
    );
  }

  return (
    <div>
      <Button className="w-full" variant="outline" onClick={handleConnect}>
        <GoogleDriveIcon className="mr-1.5 w-[24px]" />
        Connect to Google Drive
      </Button>
    </div>
  );
}
