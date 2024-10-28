import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { ConfigProps } from "../bin/cdk";
import { ContentPublishingConstruct } from "./constructs/content-publishing";
import { ContentSchedulingConstruct } from "./constructs/content-scheduling";
import { ApiGatewayConstruct } from "./constructs/api-gateway";
import { DriveSyncConstruct } from "./constructs/drive-sync";
import * as path from "path";
import * as fs from "fs";

type AwsEnvStackProps = cdk.StackProps & {
  config: Readonly<ConfigProps>;
};

export class MoovnStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: AwsEnvStackProps) {
    super(scope, id, props);
    const stage = props?.config.ENVIRONMENT;

    const prependStage = (str: string) => `${stage}-${str}`;

    if (!props?.config) {
      throw new Error("No configuration provided for the stack");
    }
    if (!stage) {
      throw new Error("No stage provided for the stack");
    }

    const lambdaConfig: cdk.aws_lambda_nodejs.NodejsFunctionProps = {
      bundling: {
        externalModules: [
          "aws-sdk", // Don't bundle aws-sdk as it's available in the Lambda runtime
          "src",
        ],
        nodeModules: [
          "@aws-sdk/client-s3",
          "@aws-sdk/client-sqs",
          "@aws-sdk/lib-storage",
          "googleapis",
          "date-fns",
          "date-fns-tz",
          "lodash",
        ],
        commandHooks: {
          beforeBundling(inputDir: string, outputDir: string): string[] {
            // Check if the directory exists before copying
            const libsPath = path.join(inputDir, "src");
            if (fs.existsSync(libsPath)) {
              return [`cp -r ${libsPath} ${path.join(outputDir, "src")}`];
            }
            return [];
          },
          beforeInstall() {
            return [];
          },
          afterBundling(inputDir: string, outputDir: string): string[] {
            return [];
          },
        },
      },
    };

    const contentPublishing = new ContentPublishingConstruct(this, "ContentPublishing", {
      config: props.config,
      prependStage,
      lambdaConfig, // Pass the config to the construct
    });

    const contentScheduling = new ContentSchedulingConstruct(this, "ContentScheduling", {
      publishContentFunction: contentPublishing.publishContentFunction,
      prependStage,
      lambdaConfig, // Pass the config to the construct
    });

    const driveSync = new DriveSyncConstruct(this, "DriveSync", {
      config: props.config,
      prependStage,
      lambdaConfig, // Pass the config to the construct
    });

    new ApiGatewayConstruct(this, "ApiGateway", {
      publishContentFunction: contentPublishing.publishContentFunction,
      scheduleContentFunction: contentScheduling.scheduleContentFunction,
      deleteScheduleFunction: contentScheduling.deleteScheduleFunction,
      driveSyncInitiatorFunction: driveSync.initiatorFunction,
      stage,
      prependStage,
    });
  }
}
