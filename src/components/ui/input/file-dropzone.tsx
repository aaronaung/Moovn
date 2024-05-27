import { ReactNode } from "react";
import { DropzoneOptions, FileRejection, useDropzone } from "react-dropzone";

export default function FileDropzone({
  onDrop,
  defaultIcon,
  options,
  isDisabled = false,
}: {
  onDrop: (files: File[], rejectedFiles: FileRejection[]) => void;
  defaultIcon?: ReactNode;
  options?: DropzoneOptions;
  isDisabled?: boolean;
}) {
  const { getRootProps, getInputProps, isDragActive, acceptedFiles } =
    useDropzone({
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
              className="m-auto h-24 w-52 rounded-md"
            />
          ) : (
            acceptedFiles[0].name
          )
        ) : (
          defaultIcon
        )}
        <div className="text-md mt-4 flex leading-6 text-muted-foreground">
          <input {...getInputProps()} />
          {isDragActive ? (
            <p>Drop the files here ...</p>
          ) : (
            <p>{`Drag 'n' drop some files here, or click to select files`}</p>
          )}
        </div>
      </div>
    </div>
  );
}
