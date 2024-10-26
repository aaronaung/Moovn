import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaNodeJS from "aws-cdk-lib/aws-lambda-nodejs";

export interface ApiGatewayProps {
  publishContentFunction: lambda.Function;
  scheduleContentFunction: lambda.Function;
  deleteScheduleFunction: lambda.Function;
  driveSyncInitiatorFunction: lambda.Function;
  stage: string;
  prependStage: (str: string) => string;
}

export class ApiGatewayConstruct extends Construct {
  constructor(scope: Construct, id: string, props: ApiGatewayProps) {
    super(scope, id);

    const apiKey = new apigateway.ApiKey(this, props.prependStage(`content-scheduling-api-key`), {
      apiKeyName: props.prependStage(`content-scheduling-api-key`),
      enabled: true,
    });

    const apiUsagePlan = new apigateway.UsagePlan(
      this,
      props.prependStage(`content-scheduling-usage-plan`),
      {
        name: props.prependStage(`content-scheduling-usage-plan`),
      },
    );
    apiUsagePlan.addApiKey(apiKey);

    const apiConfig: apigateway.MethodOptions = {
      apiKeyRequired: true,
      requestParameters: {
        "method.request.header.x-api-key": true,
      },
    };

    const contentSchedulingApi = new apigateway.LambdaRestApi(
      this,
      props.prependStage("content-scheduling-api"),
      {
        restApiName: props.prependStage("content-scheduling-api"),
        proxy: false,
        handler: new lambdaNodeJS.NodejsFunction(
          this,
          props.prependStage("content-scheduling-api-default-fn"),
          {
            code: lambda.Code.fromInline(`
exports.handler = function(event) { 
  return { statusCode: 404, body: 'Not found' };
}`),
            handler: "index.handler",
            runtime: lambda.Runtime.NODEJS_20_X,
            functionName: props.prependStage("content-scheduling-api-default-fn"),
          },
        ),
        cloudWatchRole: true,
        deployOptions: {
          stageName: props.stage,
        },
      },
    );

    apiUsagePlan.addApiStage({
      stage: contentSchedulingApi.deploymentStage,
    });

    // Define the '/publish-content' route.
    const publishContentLambdaInt = new apigateway.LambdaIntegration(props.publishContentFunction);
    const publishContentResource = contentSchedulingApi.root.addResource("publish-content");
    publishContentResource.addMethod("POST", publishContentLambdaInt, apiConfig);

    // Define the '/schedule-content' route
    const scheduleLambdaInt = new apigateway.LambdaIntegration(props.scheduleContentFunction);
    const scheduleContentResource = contentSchedulingApi.root.addResource("schedule-content");
    scheduleContentResource.addMethod("POST", scheduleLambdaInt, apiConfig);

    // Define the '/delete-schedule' resource with a POST method
    const deleteScheduleLambdaInt = new apigateway.LambdaIntegration(props.deleteScheduleFunction);
    const deleteScheduleResource = contentSchedulingApi.root.addResource("delete-schedule");
    deleteScheduleResource.addMethod("POST", deleteScheduleLambdaInt, apiConfig);

    // Define the '/initiate-drive-sync' route
    const driveSyncInitiatorLambdaInt = new apigateway.LambdaIntegration(props.driveSyncInitiatorFunction);
    const initiateDriveSyncResource = contentSchedulingApi.root.addResource("initiate-drive-sync");
    initiateDriveSyncResource.addMethod("POST", driveSyncInitiatorLambdaInt, apiConfig);
  }
}
