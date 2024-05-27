"use client";
import { env } from "@/env.mjs";
import Uppy, { UploadResult } from "@uppy/core";
import Tus, { TusOptions } from "@uppy/tus";

import { createContext, useContext, useEffect, useState } from "react";
import { generateThumbnailFromVideoFile } from "../libs/image";

type UploadOptions = TusOptions & {
  upsert?: boolean;
  onSuccess?: () => void;
  onError?: (error: any) => void;
  onProgress?: (progress: number) => void;
  onComplete?: (
    data: UploadResult<Record<string, unknown>, Record<string, unknown>>,
  ) => void;
};
type AsyncFileUploadContextValue = {
  upload: (
    task: UploadTask,
    accessToken: string,
    options?: UploadOptions,
  ) => void;
  pause: (id: string) => void;
  resume: (id: string) => void;
  cancel: (id: string) => void;
  remove: (id: string) => void;
  onProgressLazy: (id: string, onProgress?: (progress: number) => void) => void;
  onSuccessLazy: (id: string, onSuccess?: () => void) => void;
  onErrorLazy: (id: string, onError?: (error: any) => void) => void;
  onCompleteLazy: (
    id: string,
    onComplete?: (
      data: UploadResult<Record<string, unknown>, Record<string, unknown>>,
    ) => void,
  ) => void;
  tasks: { [key: string]: UppyUploadTask };
  hasTaskInProgress: boolean;
};

const AsyncFileUploadContext =
  createContext<AsyncFileUploadContextValue | null>(null);
function useAsyncFileUpload() {
  const context = useContext(AsyncFileUploadContext);
  if (!context) {
    throw new Error(
      `useAsyncFileUploadContext must be used within a AsyncFileUploadProvider`,
    );
  }
  return context;
}

const DEFAULT_TUS_UPLOAD_SETTINGS: TusOptions = {
  uploadDataDuringCreation: true,
  removeFingerprintOnSuccess: true,
  chunkSize: 2 * 1024 * 1024, // 2MB
  allowedMetaFields: [
    "bucketName",
    "objectName",
    "contentType",
    "cacheControl",
  ],
};

export type UploadTask = {
  id: string;
  targets: {
    file: File | Blob;
    bucketName: string;
    objectPath: string;
    contentType: string;
    thumbnailObjectPath?: string;
  }[];
};

type UppyUploadTask = UploadTask & {
  uppyInstance: Uppy;
  status: "uploading" | "paused";
  result?: UploadResult<Record<string, unknown>, Record<string, unknown>>;
};

function AsyncFileUploadProvider({ ...props }) {
  const [uploadTasks, setUploadTasks] = useState<{
    [key: string]: UppyUploadTask;
  }>({});

  useEffect(() => {
    return () => {
      Object.values(uploadTasks).forEach((task) => {
        task.uppyInstance.close();
      });
    };
  }, []);

  const setTaskStatus = (
    id: string,
    status: "uploading" | "paused",
    result?: UploadResult<Record<string, unknown>, Record<string, unknown>>,
  ) => {
    setUploadTasks((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        status,
        result,
      },
    }));
  };

  const onProgressLazy = (
    id: string,
    onProgress?: (progress: number) => void,
  ) => {
    if (!!uploadTasks[id]) {
      uploadTasks[id].uppyInstance.on("progress", (progress) => {
        onProgress?.(progress);
      });
    }
  };

  const onSuccessLazy = (id: string, onSuccess?: () => void) => {
    if (!!uploadTasks[id]) {
      uploadTasks[id].uppyInstance.on("upload-success", () => {
        onSuccess?.();
      });
    }
  };

  const onErrorLazy = (id: string, onError?: (error: any) => void) => {
    if (!!uploadTasks[id]) {
      uploadTasks[id].uppyInstance.on("upload-error", (file, err) => {
        onError?.(err);
      });
    }
  };

  const onCompleteLazy = (
    id: string,
    onComplete?: (
      data: UploadResult<Record<string, unknown>, Record<string, unknown>>,
    ) => void,
  ) => {
    console.log("attaching on complete", id, uploadTasks[id]);
    if (!!uploadTasks[id]) {
      uploadTasks[id].uppyInstance.on("complete", (result) => {
        remove(id);
        onComplete?.(result);
      });
    }
  };

  /**
   * Remove removes a task from the upload queue and cancels the upload if it is in progress.
   */
  const remove = (id: string) => {
    setUploadTasks((prev) => {
      const next = { ...prev };

      if (!!next[id]) {
        next[id].uppyInstance.close();
        delete next[id];
      }

      return next;
    });
  };

  /**
   * Upload starts the upload of a staged task.
   */
  const upload = async (
    task: UploadTask,
    accessToken: string,
    options?: UploadOptions,
  ) => {
    const uppyInstance = new Uppy({
      id: task.id,
    });

    uppyInstance.use(Tus, {
      endpoint: `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/upload/resumable`,
      headers: {
        authorization: `Bearer ${accessToken}`,
        "x-upsert": options?.upsert ? "true" : "false",
      },
      ...DEFAULT_TUS_UPLOAD_SETTINGS,
      ...options,
    });

    if (options?.onProgress) {
      uppyInstance.on("progress", options.onProgress);
    }
    if (options?.onSuccess) {
      uppyInstance.on("upload-success", options.onSuccess);
    }
    if (options?.onError) {
      uppyInstance.on("upload-error", options.onError);
    }

    uppyInstance.on("complete", (data) => {
      // We should still handle this event to remove the task from the queue.
      // If the caller attaches another onComplete handler lazily, we'll have two onComplete handlers.
      // And that's fine because this default handler only attempts to remove the task from the queue.
      remove(task.id);
      options?.onComplete?.(data);
    });

    setUploadTasks((prev) => ({
      ...prev,
      [task.id]: {
        ...task,
        uppyInstance,
        status: "uploading" as const,
      },
    }));

    // Prepare upload targets.
    const targets = task.targets.map((t) => ({
      name: t.objectPath,
      data: t.file,
      size: t.file.size,
      meta: {
        bucketName: t.bucketName,
        objectName: t.objectPath,
        contentType: t.contentType,
      },
    }));
    const thumbnailGenResults = await Promise.all(
      task.targets
        .filter((t) => Boolean(t.thumbnailObjectPath))
        .map((t) =>
          generateThumbnailFromVideoFile(
            t.bucketName,
            t.thumbnailObjectPath!,
            t.file as File,
          ),
        ),
    );
    for (const result of thumbnailGenResults) {
      if (result.thumbnail !== null) {
        targets.push({
          name: result.objectPath,
          data: result.thumbnail,
          size: result.thumbnail.size,
          meta: {
            bucketName: result.bucket,
            objectName: result.objectPath,
            contentType: "image/jpeg",
          },
        });
      }
    }

    // Add targets to Uppy and start upload.
    uppyInstance.addFiles(targets);
    uppyInstance.upload();
  };

  const pause = (id: string) => {
    const task = uploadTasks[id];
    if (task) {
      task.uppyInstance.pauseAll();
      setTaskStatus(id, "paused");
    }
  };

  const resume = (id: string) => {
    const task = uploadTasks[id];
    if (task) {
      task.uppyInstance.resumeAll();
      setTaskStatus(id, "uploading");
    }
  };

  const cancel = (id: string) => {
    const task = uploadTasks[id];
    if (task) {
      task.uppyInstance.cancelAll();
      remove(id);
    }
  };

  return (
    <AsyncFileUploadContext.Provider
      value={{
        remove,
        upload,
        pause,
        resume,
        cancel,
        onProgressLazy,
        onSuccessLazy,
        onErrorLazy,
        onCompleteLazy,
        tasks: uploadTasks,
        hasTaskInProgress: Object.values(uploadTasks).some(
          (task) => task.status === "uploading",
        ),
      }}
      {...props}
    />
  );
}

export { AsyncFileUploadProvider, useAsyncFileUpload };
export default AsyncFileUploadContext;
