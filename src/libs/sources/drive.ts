import { env } from "@/env.mjs";
import { GoogleDriveSourceSettings, SourceTypes } from "@/src/consts/sources";
import { SupabaseOptions } from "@/src/data/clients/types";
import { GoogleDriveClient } from "@/src/libs/google-drive/google-drive-client";
import { Json, Tables } from "@/types/db";
import { drive_v3 } from "googleapis";
import { Readable } from "stream";

export class DriveClient {
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

  async getFileDownloadLink(
    filePath: string,
  ): Promise<{ downloadLink: string | null; metadata: drive_v3.Schema$File | null }> {
    try {
      await this.refreshTokenIfExpired();

      const pathParts = filePath.split("/");
      const fileName = pathParts.pop(); // Get the file name
      let currentFolderId = "root"; // Start from the root folder

      // Traverse the folder structure
      for (const folderName of pathParts) {
        const folder = await this.findFolder(currentFolderId, folderName);
        if (!folder) {
          console.error(`Folder not found: ${folderName}`);
          return { downloadLink: null, metadata: null };
        }
        currentFolderId = folder.id!;
      }

      // Define the MIME types for images and videos
      const imageMimeTypes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/bmp",
        "image/webp",
        "image/svg+xml",
      ];
      const videoMimeTypes = [
        "video/mp4",
        "video/mpeg",
        "video/ogg",
        "video/webm",
        "video/quicktime",
      ];
      const allowedMimeTypes = [...imageMimeTypes, ...videoMimeTypes];

      // Construct the query
      const query = `name = '${fileName}' and '${currentFolderId}' in parents and trashed = false and (${allowedMimeTypes
        .map((mime) => `mimeType = '${mime}'`)
        .join(" or ")})`;

      // Use the getFile method to search in the specific folder
      const files = await this.googleDriveClient.getFile(
        query,
        "id, name, webContentLink, webViewLink, mimeType",
      );

      if (files && files.length > 0) {
        return {
          downloadLink: files[0].webContentLink || null,
          metadata: files[0],
        };
      } else {
        return { downloadLink: null, metadata: null };
      }
    } catch (error) {
      console.error("Error getting file download link:", error);
      throw error;
    }
  }

  private async findFolder(
    parentId: string,
    folderName: string,
  ): Promise<drive_v3.Schema$File | null> {
    const query = `name = '${folderName}' and '${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    const folders = await this.googleDriveClient.getFile(query, "id, name");
    return folders.length > 0 ? folders[0] : null;
  }

  async getFileStream(
    filePath: string,
  ): Promise<{ stream: Readable; metadata: drive_v3.Schema$File | null }> {
    try {
      await this.refreshTokenIfExpired();

      const { metadata } = await this.getFileDownloadLink(filePath);

      if (!metadata || !metadata.id) {
        throw new Error("File not found");
      }

      const stream = await this.googleDriveClient.getFileStream(metadata.id);

      return { stream, metadata };
    } catch (error) {
      console.error("Error getting file stream:", error);
      throw error;
    }
  }
}
