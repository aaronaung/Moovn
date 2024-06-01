import { Button } from "@/src/components/ui/button";
import { Loader2 } from "lucide-react";

import { useAuthUser } from "@/src/contexts/auth";
import FileDropzone from "../ui/input/file-dropzone";
import { useCallback, useState } from "react";
import { FileRejection } from "react-dropzone";
import { toast } from "../ui/use-toast";
import { useAsyncFileUpload } from "@/src/contexts/async-file-upload";
import { BUCKETS } from "@/src/consts/storage";

type OverwriteDesignFormProps = {
  designId: string;
  onSubmitted: () => void;
};

export default function OverwriteDesignForm({
  designId,
  onSubmitted,
}: OverwriteDesignFormProps) {
  const { user, session } = useAuthUser();
  const [psdFile, setPsdFile] = useState<File | null>(null);
  const [jpegFile, setJpegFile] = useState<File | null>(null);
  const asyncUploader = useAsyncFileUpload();

  const onPsdFileDrop = useCallback(
    async (accepted: File[], rejections: FileRejection[]) => {
      if (rejections.length > 0) {
        toast({
          variant: "destructive",
          title: "File doesn't meet requirements",
          description: "Please make sure the file is a PSD file.",
        });
        return;
      }

      setPsdFile(accepted[0]);
    },
    [],
  );

  const onJpegFileDrop = useCallback(
    async (accepted: File[], rejections: FileRejection[]) => {
      if (rejections.length > 0) {
        toast({
          variant: "destructive",
          title: "File doesn't meet requirements",
          description: "Please make sure the file is a JPEG file.",
        });
        return;
      }

      setJpegFile(accepted[0]);
    },
    [],
  );

  const handleSubmit = async () => {
    if (!psdFile || !jpegFile) {
      toast({
        variant: "destructive",
        title: "Missing file(s)",
        description:
          "Both psd and jpeg files are required to overwrite a design.",
      });
      return;
    }
    if (!user || !session?.access_token) {
      toast({
        variant: "destructive",
        title: "Session error",
        description: "Please try again or contact support.",
      });
      return;
    }

    asyncUploader.upload(
      {
        id: designId,
        targets: [
          {
            file: psdFile,
            bucketName: BUCKETS.designs,
            contentType: `image/vnd.adobe.photoshop`,
            objectPath: `${user.id}/${designId}.psd`,
          },
          {
            file: jpegFile,
            bucketName: BUCKETS.designs,
            contentType: `image/jpeg`,
            objectPath: `${user.id}/${designId}.jpeg`,
          },
        ],
      },
      session?.access_token,
      {
        upsert: true,
        onComplete: async (data) => {
          if (data.failed.length > 0) {
            toast({
              variant: "destructive",
              title: "Failed to upload files.",
              description: "Please try again or contact support.",
            });
            return;
          }

          onSubmitted();
        },
      },
    );
  };

  return (
    <div className="flex flex-col gap-y-3">
      <div>
        <p className="mt-1 text-sm font-medium">PSD file</p>
        <FileDropzone
          onDrop={onPsdFileDrop}
          options={{
            accept: { "image/vnd.adobe.photoshop": [".psd"] },
            multiple: false,
          }}
        />
      </div>
      <div>
        <p className="mt-1 text-sm font-medium">JPEG file</p>
        <FileDropzone
          onDrop={onJpegFileDrop}
          options={{
            accept: { "image/jpeg": [".jpeg"] },
            multiple: false,
          }}
        />
      </div>
      <Button
        className="float-right mt-6"
        onClick={handleSubmit}
        disabled={asyncUploader.hasTaskInProgress}
      >
        {asyncUploader.hasTaskInProgress ? (
          <Loader2 className="animate-spin" />
        ) : (
          "Save"
        )}
      </Button>
    </div>
  );
}
