// Define the bucket names
const BUCKET_NAMES = [
  "templates",
  "design-overwrites",
  "scheduled-content",
  "free-design-templates",
  "drive-sync",
] as const;

export type BucketName = (typeof BUCKET_NAMES)[number];

// Determine the environment
const isDev = process.env.ENVIRONMENT === "dev" || process.env.NODE_ENV === "development";

// Create the R2Buckets object
const R2Buckets = BUCKET_NAMES.reduce(
  (acc, bucketName) => {
    const fullBucketName =
      isDev && bucketName !== "free-design-templates" ? `dev-${bucketName}` : bucketName;
    return { ...acc, [bucketName]: fullBucketName };
  },
  {} as Record<BucketName, string>,
);

// Add a method to get the full bucket name
const getBucketName = (bucket: BucketName): string => R2Buckets[bucket];

export { R2Buckets, getBucketName };
