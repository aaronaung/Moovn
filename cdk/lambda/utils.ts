import * as _ from "lodash";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";

export const error = (message: string, status: number) => {
  return {
    statusCode: status,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  };
};

export const success = (body: any) => {
  const isObject = _.isObject(body);
  return {
    statusCode: 200,
    headers: isObject ? { "Content-Type": "application/json" } : { "Content-Type": "text/plain" },
    body: isObject ? JSON.stringify(body) : body,
  };
};

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
