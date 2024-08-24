import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";

export const invokeLambda = async (functionName: string, payload: any) => {
  const client = new LambdaClient({ region: "us-west1" });

  const command = new InvokeCommand({
    FunctionName: functionName,
    Payload: JSON.stringify(payload),
    InvocationType: "RequestResponse", // Use "Event" for asynchronous invocation
  });

  try {
    const { Payload } = await client.send(command);
    return JSON.parse(Buffer.from(Payload as Uint8Array).toString());
  } catch (error) {
    console.error("Error invoking Lambda:", error);
    throw error;
  }
};
