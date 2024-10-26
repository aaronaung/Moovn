import { createClient } from "@supabase/supabase-js";
import { GoogleDriveClient } from "../libs/google-drive-client";
import R2Storage from "../libs/r2/r2-storage";
import { getBucketName } from "../libs/r2/r2-buckets";

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
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

    const driveClient = new GoogleDriveClient(
      process.env.GOOGLE_CLIENT_ID!,
      process.env.GOOGLE_CLIENT_SECRET!,
      integration.settings.refresh_token,
    );

    const { data: templateItems, error: templateItemsError } = await supabase
      .from("template_items")
      .select("*")
      .eq("metadata->>drive_source_id", integrationId);

    if (templateItemsError) throw templateItemsError;

    const uniqueFolderIds = [
      ...new Set(templateItems.map((item) => item.metadata.drive_folder_id)),
    ];
    for (const folderId of uniqueFolderIds) {
      const files = await driveClient.listFiles(folderId);

      for (const file of files) {
        if (file.mimeType?.startsWith("image/") || file.mimeType?.startsWith("video/")) {
          const stream = await driveClient.getFileStream(file.id!);

          const parentFolderId = file.parents?.[0];

          const parentFolder = await driveClient.getFolder(parentFolderId);
          const parentFolderName = parentFolder.name;

          const filePath = `${parentFolderName}/${file.name}`;

          const r2Key = `${integration.id}/${filePath}`;
          const bucketName = getBucketName("drive-sync");

          // See if the file exists in R2
          const r2Exists = await r2.exists(bucketName, r2Key);
          if (r2Exists) {
            console.log(`File ${filePath} already exists in R2 for integration ${integrationId}`);
            continue;
          }

          // Upload to R2
          await r2.uploadObject(bucketName, r2Key, stream as unknown as ReadableStream);

          console.log(`Uploaded ${filePath} to R2 for integration ${integrationId}`);
        }
      }
    }

    // List all files in the Drive

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
