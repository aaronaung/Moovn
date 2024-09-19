import { FileIcon } from "lucide-react";
import { ReactNode } from "react";
import { DropzoneOptions, FileRejection, useDropzone } from "react-dropzone";

export default function FileDropzone({
  onDrop,
  defaultIcon,
  options,
  isDisabled = false,
  label,
}: {
  onDrop: (files: File[], rejectedFiles: FileRejection[]) => void;
  defaultIcon?: ReactNode;
  options?: DropzoneOptions;
  isDisabled?: boolean;
  label?: string;
}) {
  const { getRootProps, getInputProps, isDragActive, acceptedFiles } = useDropzone({
    onDrop,
    disabled: isDisabled,
    ...options,
  });

  return (
    <div
      {...getRootProps()}
      className="mt-2 flex cursor-pointer justify-center rounded-lg border border-dashed border-foreground/25 px-6 py-10"
    >
      <div className="text-center">
        {acceptedFiles.length > 0 ? (
          acceptedFiles[0].type.includes("image") ? (
            <img
              src={URL.createObjectURL(acceptedFiles[0])}
              alt="Preview"
              className="m-auto h-28 rounded-md bg-cover"
            />
          ) : (
            acceptedFiles[0].name
          )
        ) : (
          defaultIcon
        )}
        <div className="text-md flex leading-6 text-muted-foreground">
          <input {...getInputProps()} />
          <FileIcon className="mr-2" />
          {isDragActive ? (
            <p>Drop the files here ...</p>
          ) : (
            <p>{label || `Drag 'n' drop some files here, or click to select files`}</p>
          )}
        </div>
      </div>
    </div>
  );
}
