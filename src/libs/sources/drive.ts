import { env } from "@/env.mjs";
import { GoogleDriveSourceSettings, SourceTypes } from "@/src/consts/sources";
import { SupabaseOptions } from "@/src/data/clients/types";
import { GoogleDriveClient } from "@/src/libs/google-drive/google-drive-client";
import { Json, Tables } from "@/types/db";
import { drive_v3 } from "googleapis";

export class DriveSourceClient {
  private googleDriveClient: GoogleDriveClient;
  private source: Tables<"sources">;
  private supabase: SupabaseOptions["client"];

  constructor(supabase: SupabaseOptions["client"], source: Tables<"sources">) {
    if (source.type !== SourceTypes.GoogleDrive) {
      throw new Error("Invalid source type for DriveClient");
    }
    this.source = source;
    this.supabase = supabase;

    const settings = source.settings as GoogleDriveSourceSettings;
    if (!settings.refresh_token) {
      throw new Error("Refresh token not found in source settings");
    }
    this.googleDriveClient = new GoogleDriveClient(
      env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      env.GOOGLE_CLIENT_SECRET!,
      settings.refresh_token,
    );
  }

  async refreshTokenIfExpired(): Promise<GoogleDriveSourceSettings> {
    const settings = this.source.settings as GoogleDriveSourceSettings;
    if (!settings.access_token || this.isTokenExpired(settings.expiry_date)) {
      const newCredentials = await this.googleDriveClient.refreshAccessToken();

      // Update the source settings with the new access token and expiry
      const updatedSettings: GoogleDriveSourceSettings = {
        ...settings,
        access_token: newCredentials.access_token!,
        expiry_date: newCredentials.expiry_date || Date.now() + 3600 * 1000, // Default to 1 hour if expiry_date is not provided
      };

      const { error } = await this.supabase
        .from("sources")
        .update({ settings: updatedSettings as Json })
        .eq("id", this.source.id);

      if (error) {
        throw new Error(`Failed to update access token: ${error.message}`);
      }

      // Update the local source object
      this.source.settings = updatedSettings as Json;
      return updatedSettings;
    }
    return settings;
  }

  private isTokenExpired(expiryTimestamp?: number | null): boolean {
    if (!expiryTimestamp) return true;
    return Date.now() >= expiryTimestamp;
  }

  // Add more methods as needed for Google Drive specific operations
  async listFiles(folderId?: string) {
    await this.refreshTokenIfExpired();
    return this.googleDriveClient.listFiles(folderId);
  }

  async listFolders(): Promise<drive_v3.Schema$File[]> {
    await this.refreshTokenIfExpired();
    const files = await this.googleDriveClient.listFiles("root");
    return files.filter((file) => file.mimeType === "application/vnd.google-apps.folder");
  }

  async getFileById(fileId: string): Promise<drive_v3.Schema$File> {
    await this.refreshTokenIfExpired();
    return this.googleDriveClient.getFileById(fileId);
  }
}
