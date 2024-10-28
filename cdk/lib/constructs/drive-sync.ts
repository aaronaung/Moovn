import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaNodeJS from "aws-cdk-lib/aws-lambda-nodejs";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as iam from "aws-cdk-lib/aws-iam";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import { ConfigProps } from "@/cdk/bin/cdk";

interface DriveSyncProps {
  config: ConfigProps;
  prependStage: (str: string) => string;
  lambdaConfig: lambda.FunctionOptions;
}

export class DriveSyncConstruct extends Construct {
  public readonly initiatorFunction: lambda.Function;

  constructor(scope: Construct, id: string, props: DriveSyncProps) {
    super(scope, id);

    // Create SQS Queue with visibility timeout matching the Lambda timeout
    const driveSyncQueue = new sqs.Queue(this, props.prependStage("drive-sync-queue"), {
      queueName: props.prependStage("drive-sync-queue"),
      visibilityTimeout: cdk.Duration.minutes(15), // Match the Lambda timeout
    });

    this.initiatorFunction = new lambdaNodeJS.NodejsFunction(
      this,
      props.prependStage("drive-sync-initiator-lambda"),
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        entry: "./lambda/drive-sync-initiator/index.ts",
        environment: {
          DRIVE_SYNC_QUEUE_URL: driveSyncQueue.queueUrl,
          SUPABASE_URL: props.config.SUPABASE_URL!,
          SUPABASE_SERVICE_ROLE_KEY: props.config.SUPABASE_SERVICE_ROLE_KEY!,
        },
        functionName: props.prependStage("drive-sync-initiator-lambda"),
      },
    );

    driveSyncQueue.grantSendMessages(this.initiatorFunction);

    // Schedule the initiator function to run at the start of every hour
    const rule = new events.Rule(this, props.prependStage("drive-sync-rule"), {
      schedule: events.Schedule.cron({ minute: "*/5" }), // Run every 5 minutes
    });
    // const rule = new events.Rule(this, props.prependStage("drive-sync-rule"), {
    //   schedule: events.Schedule.cron({ minute: "0", hour: "12,15,18,21,0,3,6,9" }), // Run every 3 hours
    // });

    rule.addTarget(new targets.LambdaFunction(this.initiatorFunction));

    const driveSyncProcessorLambda = new lambdaNodeJS.NodejsFunction(
      this,
      props.prependStage("drive-sync-processor-lambda"),
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        entry: "./lambda/drive-sync-processor/index.ts",
        environment: {
          R2_ACCOUNT_ID: props.config.R2_ACCOUNT_ID!,
          R2_ACCESS_KEY_ID: props.config.R2_ACCESS_KEY_ID!,
          R2_SECRET_ACCESS_KEY: props.config.R2_SECRET_ACCESS_KEY!,
          SUPABASE_URL: props.config.SUPABASE_URL!,
          SUPABASE_SERVICE_ROLE_KEY: props.config.SUPABASE_SERVICE_ROLE_KEY!,
          GOOGLE_CLIENT_ID: props.config.GOOGLE_CLIENT_ID!,
          GOOGLE_CLIENT_SECRET: props.config.GOOGLE_CLIENT_SECRET!,
        },
        functionName: props.prependStage("drive-sync-processor-lambda"),
        timeout: cdk.Duration.minutes(15),
        memorySize: 1024,
      },
    );

    driveSyncProcessorLambda.addEventSource(
      new SqsEventSource(driveSyncQueue, {
        batchSize: 1,
        maxBatchingWindow: cdk.Duration.seconds(0),
      }),
    );

    driveSyncQueue.grantConsumeMessages(driveSyncProcessorLambda);

    driveSyncProcessorLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"],
        resources: ["arn:aws:logs:*:*:*"],
      }),
    );
  }
}
