import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
// Import Lambda L2 construct
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import { ConfigProps } from "../bin/cdk";
import {
  Effect,
  Policy,
  PolicyDocument,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from "aws-cdk-lib/aws-iam";

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

    const cloudWatchLogPolicy = new PolicyStatement({
      actions: ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"],
      resources: ["*"],
    });

    /** ------------- Create the content publishing function ------------- */
    const publishContentFunction = new lambda.Function(this, "PublishContentFunction", {
      runtime: lambda.Runtime.NODEJS_20_X, // Choose any supported Node.js runtime
      code: lambda.Code.fromAsset("lambda/publish-content"), // Points to the lambda directory
      handler: "index.handler", // Points to the function file in the lambda directory
      environment: {
        SUPABASE_URL: props?.config.SUPABASE_URL!,
        SUPABASE_SERVICE_ROLE_KEY: props?.config.SUPABASE_SERVICE_ROLE_KEY!,
      },
    });
    publishContentFunction.addToRolePolicy(cloudWatchLogPolicy);

    /** ------------- Create delete schedule function ------------- */
    const deleteScheduleFunction = new lambda.Function(this, "DeleteScheduleFunction", {
      runtime: lambda.Runtime.NODEJS_20_X, // Choose any supported Node.js runtime
      code: lambda.Code.fromAsset("lambda/delete-schedule"), // Points to the lambda directory
      handler: "index.handler", // Points to the function file in the lambda directory
    });
    deleteScheduleFunction.addToRolePolicy(cloudWatchLogPolicy);
    deleteScheduleFunction.addToRolePolicy(
      new PolicyStatement({
        actions: ["scheduler:DeleteSchedule"],
        resources: ["*"],
      }),
    );

    /** --------------- Create the scheduler function -------------- */
    // Define the IAM role for the scheduler to invoke our Lambda functions with
    const schedulerRole = new Role(this, "SchedulerRole", {
      assumedBy: new ServicePrincipal("scheduler.amazonaws.com"),
    });
    // Create the policy that will allow the role to invoke our functions
    const invokeLambdaPolicy = new Policy(this, "invokeLambdaPolicy", {
      document: new PolicyDocument({
        statements: [
          new PolicyStatement({
            actions: ["lambda:InvokeFunction"],
            resources: [publishContentFunction.functionArn],
            effect: Effect.ALLOW,
          }),
        ],
      }),
    });
    // Attach the policy to the role
    schedulerRole.attachInlinePolicy(invokeLambdaPolicy);
    // Define the scheduler function
    const schedulePublishContentFunction = new lambda.Function(
      this,
      "SchedulePublishContentFunction",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        code: lambda.Code.fromAsset("lambda/schedule-publish-content"),
        handler: "index.handler",
        environment: {
          TARGET_FUNCTION_ARN: publishContentFunction.functionArn,
          // Pass the role ARN to the scheduler function, so it can assume it to invoke the target function.
          SCHEDULER_ROLE_ARN: schedulerRole.roleArn,
        },
      },
    );
    schedulePublishContentFunction.addToRolePolicy(cloudWatchLogPolicy);
    schedulePublishContentFunction.addToRolePolicy(
      new PolicyStatement({
        actions: ["scheduler:CreateSchedule"],
        resources: ["*"],
      }),
    );
    schedulePublishContentFunction.addToRolePolicy(
      new PolicyStatement({
        actions: ["iam:PassRole"],
        resources: ["*"],
      }),
    );

    /** --------------- Set up API routes ---------------- */
    const apiKey = new apigateway.ApiKey(this, "content-scheduling-api", {
      apiKeyName: "content-scheduling-api-key",
      enabled: true,
    });
    const apiUsagePlan = new apigateway.UsagePlan(this, "content-scheduling-usage-plan", {
      name: "content-scheduling-usage-plan",
    });
    apiUsagePlan.addApiKey(apiKey);
    const apiConfig = {
      apiKeyRequired: true,
      requestParameters: {
        "method.request.header.x-api-key": true,
      },
    };
    const contentSchedulingApi = new apigateway.LambdaRestApi(this, "ContentSchedulingApi", {
      proxy: false,
      handler: new lambda.Function(this, "DefaultFunction", {
        code: lambda.Code.fromInline(`
exports.handler = function(event) { 
  return { statusCode: 404, body: 'Not found' };
}`),
        handler: "index.handler",
        runtime: lambda.Runtime.NODEJS_20_X,
      }),
      cloudWatchRole: true,
    });
    apiUsagePlan.addApiStage({
      stage: contentSchedulingApi.deploymentStage,
    });

    // Define the '/publish-content' route.
    const publishContentLambdaInt = new apigateway.LambdaIntegration(publishContentFunction);
    const publishContentResource = contentSchedulingApi.root.addResource("publish-content");
    publishContentResource.addMethod("POST", publishContentLambdaInt, apiConfig);

    // Define the '/schedule-publish-content' route
    const scheduleLambdaInt = new apigateway.LambdaIntegration(schedulePublishContentFunction);
    const schedulePublishContentResource = contentSchedulingApi.root.addResource(
      "schedule-publish-content",
    );
    schedulePublishContentResource.addMethod("POST", scheduleLambdaInt, apiConfig);

    // Define the '/delete-schedule' resource with a POST method
    const deleteScheduleLambdaInt = new apigateway.LambdaIntegration(deleteScheduleFunction);
    const deleteScheduleResource = contentSchedulingApi.root.addResource("delete-schedule");
    deleteScheduleResource.addMethod("POST", deleteScheduleLambdaInt, apiConfig);
  }
}
