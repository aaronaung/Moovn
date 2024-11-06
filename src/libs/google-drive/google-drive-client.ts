import { google, drive_v3 } from "googleapis";
import { Credentials, OAuth2Client } from "google-auth-library";
import { Readable } from "stream";

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

  async listFiles(folderId?: string, fields?: string): Promise<drive_v3.Schema$File[]> {
    try {
      const response = await this.driveService.files.list({
        q: folderId ? `'${folderId}' in parents` : undefined,
        fields: fields || "files(*)",
      });

      return response.data.files || [];
    } catch (error) {
      console.error("Error listing files:", error);
      throw error;
    }
  }

  async getFile(query: string, fields: string): Promise<drive_v3.Schema$File[]> {
    try {
      const response = await this.driveService.files.list({
        q: query,
        fields: `files(${fields})`,
        pageSize: 1000, // Adjust this value based on your needs
      });

      return response.data.files || [];
    } catch (error) {
      console.error("Error getting file:", error);
      throw error;
    }
  }

  async getFileById(fileId: string, fields?: string): Promise<drive_v3.Schema$File> {
    const response = await this.driveService.files.get({
      fileId: fileId,
      ...(fields ? { fields } : {}),
    });
    return response.data;
  }

  async getFileStream(fileId: string): Promise<Readable> {
    const response = await this.driveService.files.get(
      {
        fileId: fileId,
        alt: "media",
      },
      {
        responseType: "stream",
      },
    );
    return response.data as Readable;
  }

  // Add more methods as needed for your specific use cases
}
