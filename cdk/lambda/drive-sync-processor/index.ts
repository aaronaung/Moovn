import { createClient } from "@supabase/supabase-js";
import { GoogleDriveClient } from "@/src/libs/google-drive/google-drive-client";
import R2Storage from "@/src/libs/r2/r2-storage";
import { getBucketName } from "@/src/libs/r2/r2-buckets";
import { format, isAfter, isBefore, isValid, parse, subDays } from "date-fns";
import { Database, Tables } from "@/types/db";
import { TemplateItemMetadata } from "@/src/consts/templates";
import { GoogleDriveSourceSettings, SourceSyncStatus } from "@/src/consts/sources";
import { log } from "@/src/libs/logger";
import { error, success } from "../utils";
import { driveSyncR2Path } from "@/src/libs/storage";
import { ContentItemType } from "@/src/consts/content";

const supabase = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);
const r2 = new R2Storage(
  process.env.R2_ACCOUNT_ID!,
  process.env.R2_ACCESS_KEY_ID!,
  process.env.R2_SECRET_ACCESS_KEY!,
);

const ALLOWED_FILE_EXTENSIONS = ["jpg", "jpeg", "png", "mp4", "mov"];
const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024; // 500MB
const MAX_VIDEO_DURATION_MILLI = 15 * 60 * 1000; // 15 minutes

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
      throw new Error(`Source is not connected to Google Drive`);
    }

    const driveClient = new GoogleDriveClient(
      process.env.GOOGLE_CLIENT_ID!,
      process.env.GOOGLE_CLIENT_SECRET!,
      settings.refresh_token,
    );

    const { data: templateItems, error: templateItemsError } = await supabase
      .from("template_items")
      .select("*")
      .eq("type", ContentItemType.DriveFile)
      .eq("metadata->>drive_source_id", sourceId);

    if (templateItemsError) throw templateItemsError;

    const uniqueRootFolderIds = new Set<string>(
      templateItems
        .filter((templateItem) => (templateItem.metadata as TemplateItemMetadata).drive_folder_id)
        .map((templateItem) => (templateItem.metadata as TemplateItemMetadata).drive_folder_id),
    );
    const templateItemKey = (folderId: string, fileName: string) => `${folderId}/${fileName}`;

    // ${rootFolderId}/${fileName} -> templateItem
    const drivePathToTemplateItemMap = new Map<string, Tables<"template_items">>();
    templateItems.forEach((templateItem) => {
      const metadata = templateItem.metadata as TemplateItemMetadata;
      if (!metadata.drive_folder_id || !metadata.drive_file_name) {
        log.warn(`Template item has no drive folder id or file name`, {
          templateItem,
        });
        return;
      }
      const key = templateItemKey(metadata.drive_folder_id, metadata.drive_file_name);
      drivePathToTemplateItemMap.set(key, templateItem);
    });

    log.info("Starting sync for source", {
      sourceId,
      ownerId: source.owner_id,
      uniqueRootFolderIds,
      templateItems,
      drivePathToTemplateItemMap,
    });

    for (const rootFolderId of uniqueRootFolderIds) {
      log.info("Processing root folder", { rootFolderId });
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
        log.info("Found valid date subfolder", { dateSubFolderName });

        // Sync image and video files in the sub date folder.
        const files = await driveClient.listFiles(subFolder.id);
        if (files.length > 0) {
          log.info("Found files to process", {
            folderPath: `${rootFolderId}/${dateSubFolderName}`,
            fileCount: files.length,
          });
        }
        for (const file of files) {
          const {
            id,
            name,
            modifiedTime,
            trashed,
            mimeType,
            fileExtension,
            size,
            videoMediaMetadata,
            imageMediaMetadata,
          } = file;

          if (
            !id ||
            !name ||
            !modifiedTime ||
            trashed ||
            (!mimeType?.startsWith("image/") && !mimeType?.startsWith("video/"))
          ) {
            continue;
          }
          const key = templateItemKey(rootFolderId, name);
          const templateItem = drivePathToTemplateItemMap.get(key);
          if (!templateItem) {
            log.warn(`Matching template item not found for drive file`, {
              templateItemKey: key,
              rootFolderId,
              dateSubFolderName,
              file,
            });
            continue;
          }

          if (!ALLOWED_FILE_EXTENSIONS.includes(fileExtension ?? "")) {
            syncErrors.push({
              template_item_id: templateItem?.id,
              drive_file_path: `${rootFolderId}/${dateSubFolderName}/${file.name}`,
              error: `File extension ${fileExtension} not allowed. Must be one of the following:${ALLOWED_FILE_EXTENSIONS.join(
                ", ",
              )}`,
            });
          }
          if (parseInt(size ?? "0") > MAX_FILE_SIZE_BYTES) {
            syncErrors.push({
              template_item_id: templateItem?.id,
              drive_file_path: `${rootFolderId}/${dateSubFolderName}/${file.name}`,
              error: `File size ${size} bytes is greater than the maximum allowed size of ${MAX_FILE_SIZE_BYTES} bytes`,
            });
          }
          if (
            mimeType?.startsWith("video/") &&
            parseInt(videoMediaMetadata?.durationMillis ?? "0") > MAX_VIDEO_DURATION_MILLI
          ) {
            syncErrors.push({
              template_item_id: templateItem?.id,
              drive_file_path: `${rootFolderId}/${dateSubFolderName}/${file.name}`,
              error: `Video duration ${videoMediaMetadata?.durationMillis} seconds is greater than the maximum allowed duration of ${MAX_VIDEO_DURATION_MILLI} seconds`,
            });
          }
          if (
            mimeType?.startsWith("video/") &&
            videoMediaMetadata?.width &&
            videoMediaMetadata?.height
          ) {
            const aspectRatio = videoMediaMetadata.width / videoMediaMetadata.height;
            if (aspectRatio < 0.01 || aspectRatio > 10) {
              syncErrors.push({
                template_item_id: templateItem?.id,
                drive_file_path: `${rootFolderId}/${dateSubFolderName}/${file.name}`,
                error: `Video aspect ratio ${aspectRatio.toFixed(
                  2,
                )} is outside allowed range of 0.01:1 to 10:1`,
              });
            }
          }
          if (
            mimeType?.startsWith("image/") &&
            imageMediaMetadata?.width &&
            imageMediaMetadata?.height
          ) {
            const aspectRatio = imageMediaMetadata.width / imageMediaMetadata.height;
            if (aspectRatio < 0.8 || aspectRatio > 1.91) {
              syncErrors.push({
                template_item_id: templateItem?.id,
                drive_file_path: `${rootFolderId}/${dateSubFolderName}/${file.name}`,
                error: `Image aspect ratio ${aspectRatio.toFixed(
                  2,
                )} is outside allowed range of 4:5 (0.8:1) to 1.91:1`,
              });
            }
          }

          const formattedDate = format(parsedDate, "yyyy-MM-dd");
          const r2Key = driveSyncR2Path(source.owner_id, rootFolderId, formattedDate, name);
          const bucketName = getBucketName("drive-sync");
          const objectMetadata = await r2.getObjectMetadata(bucketName, r2Key);
          const r2LastModified = objectMetadata?.Metadata?.["drive_last_modified"];

          // Skip if the drive file hasn't been modified since last upload; unless forceSync is true.
          if (
            r2LastModified &&
            !isAfter(new Date(modifiedTime), new Date(r2LastModified)) &&
            !forceSync
          ) {
            log.info(`Drive file has not changed since last upload`, {
              driveFile: file,
              r2ObjectMetadata: objectMetadata,
            });
            continue;
          }

          // Upload to R2
          log.info("Syncing Drive file to R2", {
            templateItem,
            driveFilePath: `${rootFolderId}/${dateSubFolderName}/${file.name}`,
            bucketName,
            r2Key,
          });
          let fileSyncError: string | undefined;
          try {
            const stream = await driveClient.getFileStream(id);
            await r2.uploadObject(bucketName, r2Key, stream as unknown as ReadableStream, {
              source_id: sourceId,
              template_item_id: templateItem.id,
              drive_file_id: id,
              drive_last_modified: modifiedTime,
              drive_mime_type: mimeType,
            });
            log.info("File sync completed", { r2Key });
          } catch (err: any) {
            log.error("File sync failed", {
              error: err.message,
              r2Key,
              fileId: id,
            });
            fileSyncError = err.message;
          } finally {
            if (fileSyncError) {
              syncErrors.push({
                template_item_id: templateItem.id,
                drive_file_path: `${rootFolderId}/${dateSubFolderName}/${file.name}`,
                r2_path: r2Key,
                error: `Error syncing Drive file to R2: ${fileSyncError}`,
              });
            }
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

    log.info("Source sync completed", {
      sourceId,
      duration: Date.now() - startTime,
      errorCount: syncErrors.length,
    });

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

    log.error(`Error syncing source ${sourceId}:`, {
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

  log.info("Sync completion summary", {
    successful: successfulSources.length,
    failed: failedSources.length,
  });

  if (failedSources.length > 0) {
    log.error("Failed sources:", { failedSources });
  }

  return success("Sync completed");
};
