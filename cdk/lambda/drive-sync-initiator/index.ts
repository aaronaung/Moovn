import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { createClient } from "@supabase/supabase-js";

const sqs = new SQSClient({});
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const BATCH_SIZE = 10;

async function* getIntegrationsBatches(sourceIds?: string[]) {
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
        .eq("type", "google_drive")
        .order("id")
        .limit(BATCH_SIZE);

      if (lastId) {
        query.gt("id", lastId);
      }

      const { data: integrations, error } = await query;

      if (error) throw error;
      if (integrations.length === 0) break;

      yield integrations;
      lastId = integrations[integrations.length - 1].id;
    }
  }
}

async function sendIntegrationBatchToSQS(batch: { id: string }[]) {
  const integrationIds = batch.map((integration) => integration.id);

  await sqs.send(
    new SendMessageCommand({
      QueueUrl: process.env.DRIVE_SYNC_QUEUE_URL,
      MessageBody: JSON.stringify({ integrationIds }),
    }),
  );
}

export const handler = async (event: any) => {
  try {
    let sourceIds: string[] | undefined;

    // Check if the event is from API Gateway
    if (event.httpMethod === "POST" && event.body) {
      const body = JSON.parse(event.body);
      sourceIds = body.sourceIds;
    }

    for await (const batch of getIntegrationsBatches(sourceIds)) {
      await sendIntegrationBatchToSQS(batch);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Drive sync initiated successfully" }),
    };
  } catch (error) {
    console.error("Error in initiator function:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Error during drive sync initiation" }),
    };
  }
};
