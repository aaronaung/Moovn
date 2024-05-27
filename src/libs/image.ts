export const generateThumbnailFromVideoFile = (
  bucket: string,
  objectPath: string,
  file: File,
): Promise<{ bucket: string; objectPath: string; thumbnail: Blob | null }> => {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject("Thumbnail generation timed out");
    }, 10000);
    const video = document.createElement("video");
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    const blobUrl = URL.createObjectURL(file);

    video.addEventListener("canplaythrough", async () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      if (ctx === null) {
        clearTimeout(timeout);
        return resolve({ bucket, objectPath, thumbnail: null });
      }

      // Set video's current time to 0.1 seconds, to ensure the video has loaded and
      // first frame is drawn.
      video.currentTime = 0.1;

      // Wait for the video to seek to the specified time
      video.addEventListener("seeked", () => {
        // Draw the frame on the canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert canvas to blob
        canvas.toBlob((blob) => {
          // Clean up
          URL.revokeObjectURL(blobUrl); // Revoke the object URL
          video.pause(); // Pause the video
          video.removeAttribute("src"); // Remove the video source
          video.load(); // Reset the video element
          clearTimeout(timeout);
          resolve({ bucket, objectPath, thumbnail: blob }); // Resolve with the thumbnail blob
        }, "image/jpeg");
      });
    });

    video.src = blobUrl;
    video.load();
    video.play();
    video.pause();
  });
};
