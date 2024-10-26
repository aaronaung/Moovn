import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { ConfigProps } from "../bin/cdk";
import { ContentPublishingConstruct } from "./constructs/content-publishing";
import { ContentSchedulingConstruct } from "./constructs/content-scheduling";
import { ApiGatewayConstruct } from "./constructs/api-gateway";
import { DriveSyncConstruct } from "./constructs/drive-sync";

type AwsEnvStackProps = cdk.StackProps & {
  config: Readonly<ConfigProps>;
};

export class MoovnStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: AwsEnvStackProps) {
    super(scope, id, props);
    const stage = props?.config.ENVIRONMENT;

    const prependStage = (str: string) => (stage === "prod" ? str : `${stage}-${str}`);

    if (!props?.config) {
      throw new Error("No configuration provided for the stack");
    }
    if (!stage) {
      throw new Error("No stage provided for the stack");
    }

    const contentPublishing = new ContentPublishingConstruct(this, "ContentPublishing", {
      config: props.config,
      prependStage,
    });

    const contentScheduling = new ContentSchedulingConstruct(this, "ContentScheduling", {
      publishContentFunction: contentPublishing.publishContentFunction,
      prependStage,
    });

    const driveSync = new DriveSyncConstruct(this, "DriveSync", {
      config: props.config,
      prependStage,
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
