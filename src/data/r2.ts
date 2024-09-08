import { _Object } from "@aws-sdk/client-s3";
import { BucketName, getBucketName } from "../libs/r2/r2-buckets";

const BASE_URL = "/api/r2";

export async function signUrl(bucketName: BucketName, key: string): Promise<string> {
  // First, check if the object exists
  const exists = await objectExists(bucketName, key);
  if (!exists) {
    return ""; // Return an empty string if the object doesn't exist
  }

  // If the object exists, proceed with signing the URL
  const response = await fetch(
    `${BASE_URL}/sign-url?bucket=${encodeURIComponent(
      getBucketName(bucketName),
    )}&key=${encodeURIComponent(key)}`,
    {
      method: "GET",
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to sign URL: ${response.statusText}`);
  }

  const data = await response.json();
  return data.signedUrl;
}

export async function uploadObject(
  bucketName: BucketName,
  key: string,
  file: File | Blob,
): Promise<void> {
  const response = await fetch(
    `${BASE_URL}/upload-object?bucket=${encodeURIComponent(
      getBucketName(bucketName),
    )}&key=${encodeURIComponent(key)}`,
    {
      method: "POST",
      body: file,
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to upload object: ${response.statusText}`);
  }
}

export async function deleteObject(bucketName: BucketName, key: string): Promise<void> {
  const response = await fetch(
    `${BASE_URL}/delete-object?bucket=${encodeURIComponent(
      getBucketName(bucketName),
    )}&key=${encodeURIComponent(key)}`,
    {
      method: "DELETE",
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to delete object: ${response.statusText}`);
  }
}

export async function listObjects(bucketName: BucketName, prefix?: string): Promise<_Object[]> {
  const params = new URLSearchParams({ bucket: getBucketName(bucketName) });
  if (prefix) {
    params.append("prefix", prefix);
  }

  const response = await fetch(`${BASE_URL}/list-objects?${params}`, {
    method: "GET",
  });

  if (!response.ok) {
    throw new Error(`Failed to list objects: ${response.statusText}`);
  }

  const data = await response.json();
  return data.objects;
}

export async function moveObject(
  sourceBucket: BucketName,
  sourceKey: string,
  destBucket: BucketName,
  destKey: string,
): Promise<void> {
  const response = await fetch(`${BASE_URL}/move-object`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sourceBucket: getBucketName(sourceBucket),
      sourceKey,
      destBucket: getBucketName(destBucket),
      destKey,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to move object: ${response.statusText}`);
  }
}

export async function objectExists(bucketName: BucketName, key: string): Promise<boolean> {
  const response = await fetch(
    `${BASE_URL}/object-exists?bucket=${encodeURIComponent(
      getBucketName(bucketName),
    )}&key=${encodeURIComponent(key)}`,
    {
      method: "GET",
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to check object existence: ${response.statusText}`);
  }

  const data = await response.json();
  return data.exists;
}

export async function copyObject(
  sourceBucket: BucketName,
  sourceKey: string,
  destBucket: BucketName,
  destKey: string,
): Promise<void> {
  const response = await fetch(`${BASE_URL}/copy-object`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sourceBucket: getBucketName(sourceBucket),
      sourceKey,
      destBucket: getBucketName(destBucket),
      destKey,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to copy object: ${response.statusText}`);
  }
}
