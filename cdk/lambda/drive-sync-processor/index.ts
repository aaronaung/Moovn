import { createClient } from "@supabase/supabase-js";
import { GoogleDriveClient } from "@/src/libs/google-drive/google-drive-client";
import R2Storage from "@/src/libs/r2/r2-storage";
import { getBucketName } from "@/src/libs/r2/r2-buckets";
import { format, isAfter, isSameDay, isValid, parse, subDays } from "date-fns";
import { Database } from "@/types/db";
import { TemplateItemMetadata } from "@/src/consts/templates";
import { GoogleDriveSourceSettings } from "@/src/consts/sources";

const supabase = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);
const r2 = new R2Storage(
  process.env.R2_ACCOUNT_ID!,
  process.env.R2_ACCESS_KEY_ID!,
  process.env.R2_SECRET_ACCESS_KEY!,
);

async function processIntegration(integrationId: string) {
  try {
    // Fetch integration details from Supabase
    const { data: integration, error } = await supabase
      .from("sources")
      .select("*")
      .eq("id", integrationId)
      .single();
    if (error) throw error;

    const settings = integration.settings as GoogleDriveSourceSettings;
    if (!settings.refresh_token) {
      throw new Error(`Integration ${integrationId} has no refresh token`);
    }

    const driveClient = new GoogleDriveClient(
      process.env.GOOGLE_CLIENT_ID!,
      process.env.GOOGLE_CLIENT_SECRET!,
      settings.refresh_token,
    );

    const { data: templateItems, error: templateItemsError } = await supabase
      .from("template_items")
      .select("*")
      .eq("metadata->>drive_source_id", integrationId);

    if (templateItemsError) throw templateItemsError;

    const uniqueFolderIds = [
      ...new Set(
        templateItems.map((item) => (item.metadata as TemplateItemMetadata).drive_folder_id),
      ),
    ];
    for (const folderId of uniqueFolderIds) {
      const files = await driveClient.listFiles(folderId);

      for (const file of files) {
        if (!file.id) {
          console.error(`File ${file.name} has no id`);
          continue;
        }
        if (!file.modifiedTime) {
          console.error(`File ${file.name} has no modified time`);
          continue;
        }

        if (file.mimeType?.startsWith("image/") || file.mimeType?.startsWith("video/")) {
          const stream = await driveClient.getFileStream(file.id!);

          const parentFolderId = file.parents?.[0];
          if (!parentFolderId) {
            console.error(`File ${file.name} has no parent folder`);
            continue;
          }

          const parentFolder = await driveClient.getFileById(parentFolderId);
          if (parentFolder.mimeType !== "application/vnd.google-apps.folder") {
            console.error(`Parent id ${parentFolderId} is not a folder`);
            continue;
          }

          const parentFolderName = parentFolder.name ?? "";
          const parsedDate = parse(parentFolderName, "yyyy-MM-dd", new Date());
          const isDateFolder = isValid(parsedDate);

          // Check if date is 2 days in the past. We don't want to process files from 2 days ago or older.
          const twoDaysAgo = subDays(new Date(), 2);
          if (!isDateFolder || !isSameDay(parsedDate, twoDaysAgo)) {
            continue;
          }

          const formattedDate = format(parsedDate, "yyyy-MM-dd");
          const r2Key = `${folderId}/${formattedDate}/${file.name}`;
          const bucketName = getBucketName("drive-sync");

          const objectMetadata = await r2.getObjectMetadata(bucketName, r2Key);
          const r2LastModified = objectMetadata.Metadata?.["last-modified"];

          // Skip if the drive file hasn't been modified since last upload
          if (r2LastModified && isAfter(file.modifiedTime, r2LastModified)) {
            console.log(`Drive file at ${r2Key} has not changed since last upload`);
            continue;
          }

          // Upload to R2
          await r2.uploadObject(bucketName, r2Key, stream as unknown as ReadableStream, {
            "drive-source-id": integrationId,
            "drive-file-id": file.id,
            "last-modified": file.modifiedTime,
          });
          console.log(`Uploaded ${r2Key} to R2 for drive source ${integrationId}`);
        }
      }
    }

    return { integrationId, status: "success" };
  } catch (error) {
    console.error(`Error processing integration ${integrationId}:`, error);
    return { integrationId, status: "error", error };
  }
}

export const handler = async (event: any) => {
  // SQS will invoke this lambda with a single message containing multiple integrations
  const message = event.Records[0];
  const { integrationIds } = JSON.parse(message.body);

  const results = await Promise.all(integrationIds.map(processIntegration));

  const successfulIntegrations = results.filter((result) => result.status === "success");
  const failedIntegrations = results.filter((result) => result.status === "error");

  console.log(`Successfully processed ${successfulIntegrations.length} integrations`);
  console.log(`Failed to process ${failedIntegrations.length} integrations`);

  if (failedIntegrations.length > 0) {
    console.error("Failed integrations:", failedIntegrations);
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "Processing completed",
      successCount: successfulIntegrations.length,
      failureCount: failedIntegrations.length,
    }),
  };
};
