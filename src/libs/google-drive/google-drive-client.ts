import { google, drive_v3 } from "googleapis";
import { Credentials, OAuth2Client } from "google-auth-library";

export class GoogleDriveClient {
  private oauth2Client: OAuth2Client;
  private driveService: drive_v3.Drive;

  constructor(
    private clientId: string,
    private clientSecret: string,
    private refreshToken: string,
  ) {
    this.oauth2Client = new google.auth.OAuth2(this.clientId, this.clientSecret);
    this.oauth2Client.setCredentials({
      refresh_token: this.refreshToken,
    });

    this.driveService = google.drive({ version: "v3", auth: this.oauth2Client });
  }

  async refreshAccessToken(): Promise<Credentials> {
    try {
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      const newAccessToken = credentials.access_token;

      if (!newAccessToken) {
        throw new Error("Failed to refresh access token");
      }

      return credentials;
    } catch (error) {
      console.error("Error refreshing access token:", error);
      throw error;
    }
  }

  async listFiles(folderId?: string): Promise<drive_v3.Schema$File[]> {
    try {
      const response = await this.driveService.files.list({
        q: folderId ? `'${folderId}' in parents` : undefined,
        fields: "files(id, name, mimeType, webViewLink)",
      });

      return response.data.files || [];
    } catch (error) {
      console.error("Error listing files:", error);
      throw error;
    }
  }

  async getFile(fileId: string): Promise<drive_v3.Schema$File> {
    try {
      const response = await this.driveService.files.get({
        fileId,
        fields: "id, name, mimeType, webViewLink",
      });

      return response.data;
    } catch (error) {
      console.error("Error getting file:", error);
      throw error;
    }
  }

  // Add more methods as needed for your specific use cases
}
