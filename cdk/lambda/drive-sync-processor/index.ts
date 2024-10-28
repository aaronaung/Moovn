import { createClient } from "@supabase/supabase-js";
import { GoogleDriveClient } from "@/src/libs/google-drive/google-drive-client";
import R2Storage from "@/src/libs/r2/r2-storage";
import { getBucketName } from "@/src/libs/r2/r2-buckets";
import { format, isAfter, isBefore, isValid, parse, subDays } from "date-fns";
import { Database } from "@/types/db";
import { TemplateItemMetadata } from "@/src/consts/templates";
import { GoogleDriveSourceSettings } from "@/src/consts/sources";
import * as logger from "lambda-log";
import { error, success } from "../utils";

const supabase = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);
const r2 = new R2Storage(
  process.env.R2_ACCOUNT_ID!,
  process.env.R2_ACCESS_KEY_ID!,
  process.env.R2_SECRET_ACCESS_KEY!,
);

async function syncSource(sourceId: string) {
  try {
    logger.info(`Starting sync for source ${sourceId}`);

    // Fetch source details from Supabase
    const { data: source, error } = await supabase
      .from("sources")
      .select("*")
      .eq("id", sourceId)
      .single();
    if (error) throw error;

    const settings = source.settings as GoogleDriveSourceSettings;
    if (!settings.refresh_token) {
      throw new Error(`Source ${sourceId} has no refresh token`);
    }

    const driveClient = new GoogleDriveClient(
      process.env.GOOGLE_CLIENT_ID!,
      process.env.GOOGLE_CLIENT_SECRET!,
      settings.refresh_token,
    );

    const { data: templateItems, error: templateItemsError } = await supabase
      .from("template_items")
      .select("*")
      .eq("metadata->>drive_source_id", sourceId);

    if (templateItemsError) throw templateItemsError;
    logger.options.meta.sourceId = sourceId;
    logger.options.meta.ownerId = source.owner_id;
    logger.options.meta.templateItems = templateItems;

    const uniqueRootFolderIds = [
      ...new Set(
        templateItems.map((item) => (item.metadata as TemplateItemMetadata).drive_folder_id),
      ),
    ];

    for (const rootFolderId of uniqueRootFolderIds) {
      logger.info(`Syncing root folder ${rootFolderId}`);
      const subFolders = await driveClient.listFiles(rootFolderId);

      for (const subFolder of subFolders) {
        // Look for sub date folders.
        if (
          !subFolder.id ||
          !subFolder.name ||
          subFolder.mimeType !== "application/vnd.google-apps.folder"
        ) {
          continue;
        }
        const folderName = subFolder.name;
        const parsedDate = parse(folderName, "yyyy-MM-dd", new Date());
        const isDateFolder = isValid(parsedDate);

        // We don't want to process files from 2 days ago or older.
        const twoDaysAgo = subDays(new Date(), 2);
        if (!isDateFolder || isBefore(parsedDate, twoDaysAgo)) {
          continue;
        }
        logger.info(`${rootFolderId}: Found valid date subfolder`, { folderName });

        // Sync image and video files in the sub date folder.
        const files = await driveClient.listFiles(subFolder.id);
        logger.info(`${rootFolderId}: Found files in date subfolder`, { count: files.length });
        for (const file of files) {
          if (
            !file.id ||
            !file.modifiedTime ||
            (!file.mimeType?.startsWith("image/") && !file.mimeType?.startsWith("video/"))
          ) {
            continue;
          }

          const formattedDate = format(parsedDate, "yyyy-MM-dd");
          const r2Key = `${source.owner_id}/${rootFolderId}/${formattedDate}/${file.name}`;
          const bucketName = getBucketName("drive-sync");
          const objectMetadata = await r2.getObjectMetadata(bucketName, r2Key);
          const r2LastModified = objectMetadata?.Metadata?.["lastModified"];

          // Skip if the drive file hasn't been modified since last upload
          if (r2LastModified && !isAfter(new Date(file.modifiedTime), new Date(r2LastModified))) {
            logger.info(
              `${rootFolderId}/${folderName}: Drive file has not changed since last upload`,
              {
                driveFile: file,
                r2ObjectMetadata: objectMetadata,
              },
            );
            continue;
          }

          // Upload to R2
          logger.info(`${rootFolderId}/${folderName}: Syncing Drive file to R2`, {
            driveFilePath: `${rootFolderId}/${folderName}/${file.name}`,
            r2Key,
          });
          const stream = await driveClient.getFileStream(file.id);
          await r2.uploadObject(bucketName, r2Key, stream as unknown as ReadableStream, {
            driveSourceId: sourceId,
            driveFileId: file.id,
            lastModified: file.modifiedTime,
          });
          logger.info(`${rootFolderId}/${folderName}: Synced Drive file to R2`, {
            driveFilePath: `${rootFolderId}/${folderName}/${file.name}`,
            r2Key,
          });
        }
      }
    }

    logger.info(`Completed sync for source ${sourceId}`);
    return success(`Source ${sourceId} synced successfully`);
  } catch (err: any) {
    logger.error(`Error syncing source ${sourceId}:`, {
      err,
    });
    return error(err.message, 500);
  } finally {
    logger.options.meta = {};
  }
}

export const handler = async (event: any) => {
  // SQS will invoke this lambda with a single message containing multiple sources
  const message = event.Records[0];
  const { sourceIds } = JSON.parse(message.body);

  const results = await Promise.all(sourceIds.map(syncSource));

  const successfulSources = results.filter((result) => result.status === "success");
  const failedSources = results.filter((result) => result.status === "error");

  logger.info(`Successfully synced ${successfulSources.length} drive sources`);
  logger.info(`Failed to synced ${failedSources.length} drive sources`);

  if (failedSources.length > 0) {
    logger.error("Failed sources:", failedSources);
  }
  return success(`Sync completed`);
};
