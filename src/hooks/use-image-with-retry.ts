import { useEffect, useState, useRef, MutableRefObject } from "react";

const MAX_RETRIES = 3;
const DEFAULT_TIMEOUT = 1000;

export const IMAGE_STATUS = {
  LOADING: "loading",
  RETRYING: "retrying",
  LOADED: "loaded",
  ERROR: "error",
};

const useImageWithRetry = (
  imageRef: MutableRefObject<HTMLImageElement | null>,
  fallbackSrc?: string,
  retryOnError = false,
) => {
  const [imageStatus, setImageStatus] = useState(IMAGE_STATUS.LOADING);
  const retries = useRef(0);

  const isRetrying = imageStatus === IMAGE_STATUS.RETRYING;
  const isLoaded = imageStatus === IMAGE_STATUS.LOADED;
  const isLoading =
    imageStatus === IMAGE_STATUS.LOADING ||
    imageStatus === IMAGE_STATUS.RETRYING;
  const hasError = imageStatus === IMAGE_STATUS.ERROR;

  const fetchImageUrl = async (url: string) => {
    const resp = await fetch(url, { method: "GET" });

    if (resp.ok) {
      setImageStatus(IMAGE_STATUS.LOADED);
      return;
    } else {
      if (retries.current >= MAX_RETRIES || !retryOnError) {
        if (fallbackSrc && imageRef.current) {
          imageRef.current.src = fallbackSrc;
        }
        setImageStatus(IMAGE_STATUS.ERROR);
        return;
      } else {
        retries.current = retries.current + 1;
        setImageStatus(IMAGE_STATUS.RETRYING);
        setTimeout(() => {
          fetchImageUrl(url);
        }, DEFAULT_TIMEOUT);
      }
    }
  };

  const isImageAlreadyLoaded = (image: HTMLImageElement) => {
    return (
      (image && image.complete && image.naturalWidth > 0) ||
      new URL(image.src).protocol === "blob:"
    ); // skip blob images;
  };

  useEffect(() => {
    if (!imageRef.current) {
      return;
    }
    const image = imageRef.current;
    if (isImageAlreadyLoaded(image)) {
      setImageStatus(IMAGE_STATUS.LOADED);
      return;
    }

    fetchImageUrl(image.src);
  }, []);

  return {
    isLoaded,
    isLoading,
    isRetrying,
    hasError,
  };
};

export default useImageWithRetry;
