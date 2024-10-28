import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaNodeJS from "aws-cdk-lib/aws-lambda-nodejs";
import * as iam from "aws-cdk-lib/aws-iam";
import { ConfigProps } from "../../bin/cdk";

interface ContentPublishingConstructProps {
  config: ConfigProps;
  prependStage: (str: string) => string;
  lambdaConfig: lambda.FunctionOptions;
}

export class ContentPublishingConstruct extends Construct {
  public readonly publishContentFunction: lambda.Function;

  constructor(scope: Construct, id: string, props: ContentPublishingConstructProps) {
    super(scope, id);

    this.publishContentFunction = new lambdaNodeJS.NodejsFunction(
      this,
      props.prependStage("publish-content"),
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        entry: "./lambda/publish-content/index.ts",
        environment: {
          ENVIRONMENT: props.config.ENVIRONMENT!,
          SUPABASE_URL: props.config.SUPABASE_URL!,
          SUPABASE_SERVICE_ROLE_KEY: props.config.SUPABASE_SERVICE_ROLE_KEY!,
          R2_ACCOUNT_ID: props.config.R2_ACCOUNT_ID!,
          R2_ACCESS_KEY_ID: props.config.R2_ACCESS_KEY_ID!,
          R2_SECRET_ACCESS_KEY: props.config.R2_SECRET_ACCESS_KEY!,
        },
        functionName: props.prependStage("publish-content"),
        timeout: cdk.Duration.seconds(120),
        ...props.lambdaConfig, // Add the shared config
      },
    );
    this.publishContentFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"],
        resources: ["*"],
      }),
    );
  }
}
