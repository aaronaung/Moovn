"use client";
import useImageWithRetry from "@/src/hooks/use-image-with-retry";
import { cn } from "@/src/utils";
import { ImgHTMLAttributes, useRef } from "react";

type ImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  fallbackSrc?: string;
  hideOnRetryTimeout?: boolean;
  retryOnError?: boolean;
};

export default function Image({
  fallbackSrc,
  hideOnRetryTimeout,
  retryOnError = false,
  ...props
}: ImageProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const { hasError, isLoading, isRetrying } = useImageWithRetry(
    imgRef,
    fallbackSrc,
    retryOnError,
  );

  if (hideOnRetryTimeout && hasError) {
    return <></>;
  }
  return (
    <>
      {(isLoading || isRetrying) && (
        <div className={cn("bg-secondary", props.className)}></div>
      )}
      <img
        {...props}
        className={cn((isLoading || isRetrying) && "hidden", props.className)}
        ref={imgRef}
      />
    </>
  );
}
