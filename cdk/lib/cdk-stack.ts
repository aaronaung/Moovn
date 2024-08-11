import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
// Import Lambda L2 construct
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import { ConfigProps } from "../bin/cdk";

// 1. New type for the props adding in our configuration
type AwsEnvStackProps = cdk.StackProps & {
  config: Readonly<ConfigProps>;
};

export class CdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: AwsEnvStackProps) {
    super(scope, id, props);

    if (!props?.config) {
      if (!props?.config.SUPABASE_SERVICE_ROLE_KEY || !props?.config.SUPABASE_URL) {
        throw new Error("Missing supabase configuration");
      }
      throw new Error("No configuration provided for the stack");
    }

    // Define the Lambda function resource
    const publishContentFunction = new lambda.Function(this, "PublishContentFunction", {
      runtime: lambda.Runtime.NODEJS_20_X, // Choose any supported Node.js runtime
      code: lambda.Code.fromAsset("lambda"), // Points to the lambda directory
      handler: "publish-content.handler", // Points to the function file in the lambda directory
      environment: {
        SUPABASE_URL: props?.config.SUPABASE_URL!,
        SUPABASE_SERVICE_ROLE_KEY: props?.config.SUPABASE_SERVICE_ROLE_KEY!,
      },
    });

    // Define the API Gateway resource
    const api = new apigateway.LambdaRestApi(this, "PublishContentApi", {
      handler: publishContentFunction,
      proxy: false,
    });
    const apiKey = new apigateway.ApiKey(this, "PublishContentApiKey", {
      apiKeyName: "publish-content-api-key",
      enabled: true,
    });
    const plan = api.addUsagePlan("PublishContentUsagePlan", {
      name: "publish-content-usage-plan",
      throttle: {
        rateLimit: 1000,
        burstLimit: 200,
      },
    });
    plan.addApiKey(apiKey);
    plan.addApiStage({
      stage: api.deploymentStage,
    });

    // Set up API GW and Lambda integration
    const apiGwAndLambdaIntegration = new apigateway.LambdaIntegration(publishContentFunction);

    // Define the '/publish-content' resource with a GET method
    const publishContentResource = api.root.addResource("publish-content");
    publishContentResource.addMethod("POST", apiGwAndLambdaIntegration, {
      apiKeyRequired: true,
      requestParameters: {
        "method.request.header.x-api-key": true,
      },
    });
  }
}
