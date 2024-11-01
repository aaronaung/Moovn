import { SourceTypes } from "@/src/consts/sources";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/db";
import * as logger from "lambda-log";
import { error, success } from "../utils";
import { subDays } from "date-fns";

const sqs = new SQSClient({});
const supabase = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export const handler = async (event: any) => {
  try {
    let sourceIds: string[] | undefined;
    let forceSync: boolean = false;

    // Check if the event is from API Gateway
    if (event.httpMethod === "POST" && event.body) {
      const body = JSON.parse(event.body);
      sourceIds = body.sourceIds;
      forceSync = body.forceSync;
    }

    const { data: sources, error: queryError } = await supabase
      .from("sources")
      .select("id")
      .eq("type", SourceTypes.GoogleDrive)
      .order("id");

    if (queryError) throw queryError;

    // Process sources in batches of 10
    for (let i = 0; i < sources.length; i += 10) {
      const batch = sources.slice(i, i + 10);
      const batchSourceIds = batch.map((source) => source.id);

      await sqs.send(
        new SendMessageCommand({
          QueueUrl: process.env.DRIVE_SYNC_QUEUE_URL,
          MessageBody: JSON.stringify({ sourceIds: batchSourceIds, forceSync }),
        }),
      );

      logger.info(`Sent batch of sources to SQS for drive sync`, {
        sourceIds: batchSourceIds,
        batchNumber: Math.floor(i / 10) + 1,
        totalBatches: Math.ceil(sources.length / 10),
      });
    }

    // Delete expired source syncs
    logger.info("Deleting source syncs older than 7 days");
    const sevenDaysAgo = subDays(new Date(), 7);
    const { error } = await supabase
      .from("source_syncs")
      .delete()
      .lt("created_at", sevenDaysAgo.toISOString());
    if (error) {
      logger.error("Failed to clean up old source syncs", { error });
    } else {
      logger.info("Successfully cleaned up old source syncs");
    }

    return success("Drive sync initiated successfully");
  } catch (err: any) {
    logger.error("Error in initiator function:", {
      err,
    });
    return error("Error during drive sync initiation", 500);
  }
};
