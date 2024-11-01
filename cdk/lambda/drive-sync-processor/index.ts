import { createClient } from "@supabase/supabase-js";
import { GoogleDriveClient } from "@/src/libs/google-drive/google-drive-client";
import R2Storage from "@/src/libs/r2/r2-storage";
import { getBucketName } from "@/src/libs/r2/r2-buckets";
import { format, isAfter, isBefore, isValid, parse, subDays } from "date-fns";
import { Database, Tables } from "@/types/db";
import { TemplateItemMetadata } from "@/src/consts/templates";
import { GoogleDriveSourceSettings, SourceSyncStatus } from "@/src/consts/sources";
import * as logger from "lambda-log";
import { error, success } from "../utils";
import { driveSyncR2Path } from "@/src/libs/storage";

const supabase = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);
const r2 = new R2Storage(
  process.env.R2_ACCOUNT_ID!,
  process.env.R2_ACCESS_KEY_ID!,
  process.env.R2_SECRET_ACCESS_KEY!,
);

async function syncSource(sourceId: string, forceSync: boolean) {
  const syncErrors = [];
  const startTime = Date.now();
  const { data: sourceSync, error: sourceSyncError } = await supabase
    .from("source_syncs")
    .insert({
      source_id: sourceId,
      status: SourceSyncStatus.InProgress,
    })
    .select("id")
    .single();
  if (sourceSyncError) throw sourceSyncError;
  const sourceSyncId = sourceSync.id;

  try {
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

    const uniqueRootFolderIds = new Set<string>(
      templateItems.map(
        (templateItem) => (templateItem.metadata as TemplateItemMetadata).drive_folder_id,
      ),
    );
    const templateItemKey = (folderId: string, fileName: string) => `${folderId}/${fileName}`;
    const templateItemMap = new Map<string, Tables<"template_items">>(
      templateItems.map((templateItem) => {
        const metadata = templateItem.metadata as TemplateItemMetadata;
        return [templateItemKey(metadata.drive_folder_id, metadata.drive_file_name), templateItem];
      }),
    ); // ${rootFolderId}/${fileName} -> templateItem

    logger.info(`Starting sync for source ${sourceId}`, {
      sourceId,
      ownerId: source.owner_id,
      uniqueRootFolderIds,
      templateItemMap,
    });

    for (const rootFolderId of uniqueRootFolderIds) {
      logger.info(`Syncing root folder ${rootFolderId}`);
      logger.options.meta.rootFolderId = rootFolderId;
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
        const dateSubFolderName = subFolder.name;
        const parsedDate = parse(dateSubFolderName, "yyyy-MM-dd", new Date());
        const isDateFolder = isValid(parsedDate);

        // We don't want to process files from 3 days ago or older.
        const twoDaysAgo = subDays(new Date(), 3);
        if (!isDateFolder || isBefore(parsedDate, twoDaysAgo)) {
          continue;
        }
        logger.info(`Found valid date subfolder`, { dateSubFolderName });

        // Sync image and video files in the sub date folder.
        const files = await driveClient.listFiles(subFolder.id);
        logger.info(`Found files in date subfolder`, { fileNames: files.map((file) => file.name) });
        for (const file of files) {
          if (
            !file.id ||
            !file.name ||
            !file.modifiedTime ||
            (!file.mimeType?.startsWith("image/") && !file.mimeType?.startsWith("video/"))
          ) {
            continue;
          }

          const key = templateItemKey(rootFolderId, file.name);
          const templateItem = templateItemMap.get(key);
          if (!templateItem) {
            logger.warn(`Matching template item not found for drive file`, {
              templateItemKey: key,
              templateItemMap,
              rootFolderId,
              dateSubFolderName,
              file,
            });
            continue;
          }

          const formattedDate = format(parsedDate, "yyyy-MM-dd");
          const r2Key = driveSyncR2Path(source.owner_id, rootFolderId, formattedDate, file.name);
          const bucketName = getBucketName("drive-sync");
          const objectMetadata = await r2.getObjectMetadata(bucketName, r2Key);
          const r2LastModified = objectMetadata?.Metadata?.["drive_last_modified"];

          // Skip if the drive file hasn't been modified since last upload; unless forceSync is true.
          if (
            r2LastModified &&
            !isAfter(new Date(file.modifiedTime), new Date(r2LastModified)) &&
            !forceSync
          ) {
            logger.info(`Drive file has not changed since last upload`, {
              driveFile: file,
              r2ObjectMetadata: objectMetadata,
            });
            continue;
          }

          // Upload to R2
          logger.options.meta = {
            templateItem,
            driveFilePath: `${rootFolderId}/${dateSubFolderName}/${file.name}`,
            bucketName,
            r2Key,
          };

          logger.info(`Syncing Drive file to R2`);
          let fileSyncError: string | undefined;
          try {
            const stream = await driveClient.getFileStream(file.id);
            await r2.uploadObject(bucketName, r2Key, stream as unknown as ReadableStream, {
              source_id: sourceId,
              template_item_id: templateItem.id,
              drive_file_id: file.id,
              drive_last_modified: file.modifiedTime,
              drive_mime_type: file.mimeType,
            });
            logger.info(`Synced Drive file to R2`);
          } catch (err: any) {
            logger.error(`Error syncing Drive file to R2`, {
              err,
            });
            fileSyncError = err.message;
          } finally {
            if (fileSyncError) {
              syncErrors.push({
                template_item_id: templateItem.id,
                drive_file_path: `${rootFolderId}/${dateSubFolderName}/${file.name}`,
                r2_path: r2Key,
                error: fileSyncError,
              });
            }
            await supabase
              .from("template_items")
              .update({
                metadata: {
                  ...(templateItem.metadata as TemplateItemMetadata),
                  mime_type: file.mimeType,
                  last_source_sync_id: sourceSyncId,
                },
              })
              .eq("id", templateItem.id);
          }
        }
      }
    }
    const hasErrors = syncErrors.length > 0;
    const durationMs = Date.now() - startTime;
    await supabase
      .from("source_syncs")
      .update({
        errors: hasErrors ? syncErrors : null,
        status: hasErrors ? SourceSyncStatus.Failed : SourceSyncStatus.Success,
        duration_ms: durationMs,
      })
      .eq("id", sourceSyncId);

    logger.info(`Completed sync for source ${sourceId}`);
    return success(`Source ${sourceId} synced successfully`);
  } catch (err: any) {
    const durationMs = Date.now() - startTime;
    await supabase
      .from("source_syncs")
      .update({
        errors: [{ error: err.message }],
        status: SourceSyncStatus.Failed,
        duration_ms: durationMs,
      })
      .eq("id", sourceSyncId);
    logger.error(`Error syncing source ${sourceId}:`, {
      err,
    });
    return error(err.message, 500);
  }
}

export const handler = async (event: any) => {
  // SQS will invoke this lambda with a single message containing multiple sources
  const message = event.Records[0];
  const { sourceIds, forceSync } = JSON.parse(message.body);

  const results = await Promise.all(
    sourceIds.map((sourceId: string) => syncSource(sourceId, forceSync)),
  );

  const successfulSources = results.filter((result) => result.statusCode === 200);
  const failedSources = results.filter((result) => result.statusCode !== 200);

  logger.info(`Successfully synced ${successfulSources.length} drive sources`);
  logger.info(`Failed to synced ${failedSources.length} drive sources`);

  if (failedSources.length > 0) {
    logger.error("Failed sources:", failedSources);
  }
  return success(`Sync completed`);
};
