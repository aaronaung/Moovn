import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  _Object,
  CopyObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

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
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    return await getSignedUrl(this.client, command, { expiresIn });
  }

  async uploadObject(
    bucketName: string,
    key: string,
    body: Buffer | Blob | ReadableStream,
  ): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: body,
    });

    await this.client.send(command);
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
