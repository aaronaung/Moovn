import {
  S3Client,
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  _Object,
  CopyObjectCommand,
  HeadObjectCommand,
  HeadObjectCommandOutput,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Upload } from "@aws-sdk/lib-storage";
import { getBucketName } from "./r2-buckets";

class R2Storage {
  private client: S3Client;

  constructor(accountId: string, accessKeyId: string, secretAccessKey: string) {
    this.client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  async signUrl(bucketName: string, key: string, expiresIn: number = 3600): Promise<string> {
    const exists = await this.exists(bucketName, key);
    if (!exists) {
      return "";
    }

    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    return await getSignedUrl(this.client, command, { expiresIn });
  }

  async signUrlWithMetadata(
    bucketName: string,
    key: string,
    expiresIn: number = 3600,
  ): Promise<{ signedUrl: string; metadata: Record<string, string> } | undefined> {
    const metadata = await this.getObjectMetadata(bucketName, key);
    if (!metadata) {
      return undefined;
    }
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });
    const signedUrl = await getSignedUrl(this.client, command, { expiresIn });
    return { signedUrl, metadata: metadata.Metadata ?? {} };
  }

  async uploadObject(
    bucketName: string,
    key: string,
    body: Buffer | Blob | ReadableStream,
    metadata?: Record<string, string>,
  ): Promise<void> {
    const upload = new Upload({
      client: this.client,
      params: {
        Bucket: bucketName,
        Key: key,
        Body: body,
        ...(metadata ? { Metadata: metadata } : {}),
      },
    });
    await upload.done();
  }

  async uploadPublicObject(
    key: string,
    body: Buffer | Blob | ReadableStream,
    metadata?: Record<string, string>,
  ): Promise<string> {
    await this.uploadObject(getBucketName("public"), key, body, metadata);

    return `https://${process.env.NODE_ENV === "development" ? "dev" : ""}.assets.moovn.co/${key}`;
  }

  async deleteObject(bucketName: string, key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    await this.client.send(command);
  }

  async listObjects(bucketName: string, prefix?: string): Promise<_Object[]> {
    const command = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: prefix,
    });

    const { Contents } = await this.client.send(command);
    return Contents || [];
  }

  async moveObject(
    sourceBucket: string,
    sourceKey: string,
    destBucket: string,
    destKey: string,
  ): Promise<void> {
    // Copy the object to the new location
    const copyCommand = new CopyObjectCommand({
      CopySource: `${sourceBucket}/${sourceKey}`,
      Bucket: destBucket,
      Key: destKey,
    });

    await this.client.send(copyCommand);

    // Delete the object from the source location
    const deleteCommand = new DeleteObjectCommand({
      Bucket: sourceBucket,
      Key: sourceKey,
    });

    await this.client.send(deleteCommand);
  }

  async exists(bucketName: string, key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: bucketName,
        Key: key,
      });
      await this.client.send(command);
      return true;
    } catch (error) {
      if ((error as any).name === "NotFound") {
        return false;
      }
      throw error;
    }
  }

  async getObjectMetadata(
    bucketName: string,
    key: string,
  ): Promise<HeadObjectCommandOutput | undefined> {
    try {
      const command = new HeadObjectCommand({
        Bucket: bucketName,
        Key: key,
      });
      return await this.client.send(command);
    } catch (error) {
      if ((error as any).name === "NotFound") {
        return undefined;
      }
      throw error;
    }
  }

  async copyObject(
    sourceBucket: string,
    sourceKey: string,
    destBucket: string,
    destKey: string,
  ): Promise<void> {
    const command = new CopyObjectCommand({
      CopySource: `${sourceBucket}/${sourceKey}`,
      Bucket: destBucket,
      Key: destKey,
    });

    await this.client.send(command);
  }
}

export default R2Storage;
