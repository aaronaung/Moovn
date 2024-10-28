import { SourceTypes } from "@/src/consts/sources";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/db";
import * as logger from "lambda-log";
import { error, success } from "../utils";

const sqs = new SQSClient({});
const supabase = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const BATCH_SIZE = 10;

async function* getSourceBatches(sourceIds?: string[]) {
  if (sourceIds && sourceIds.length > 0) {
    for (let i = 0; i < sourceIds.length; i += BATCH_SIZE) {
      yield sourceIds.slice(i, i + BATCH_SIZE).map((id) => ({ id }));
    }
  } else {
    let lastId: string | null = null;
    while (true) {
      const query = supabase
        .from("sources")
        .select("id")
        .eq("type", SourceTypes.GoogleDrive)
        .order("id")
        .limit(BATCH_SIZE);

      if (lastId) {
        query.gt("id", lastId);
      }

      const { data: source, error } = await query;

      if (error) throw error;
      if (source.length === 0) break;

      yield source;
      lastId = source[source.length - 1].id;
    }
  }
}

export const handler = async (event: any) => {
  try {
    let sourceIds: string[] | undefined;

    // Check if the event is from API Gateway
    if (event.httpMethod === "POST" && event.body) {
      const body = JSON.parse(event.body);
      sourceIds = body.sourceIds;
    }

    for await (const batch of getSourceBatches(sourceIds)) {
      const sourceIds = batch.map((source) => source.id);
      await sqs.send(
        new SendMessageCommand({
          QueueUrl: process.env.DRIVE_SYNC_QUEUE_URL,
          MessageBody: JSON.stringify({ sourceIds }),
        }),
      );
      logger.info(`Sent batch of ${batch.length} sources to SQS for drive sync`, {
        sourceIds,
      });
    }

    return success("Drive sync initiated successfully");
  } catch (err: any) {
    logger.error("Error in initiator function:", {
      err,
    });
    return error("Error during drive sync initiation", 500);
  }
};
