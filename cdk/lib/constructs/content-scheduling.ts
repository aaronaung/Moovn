import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaNodeJS from "aws-cdk-lib/aws-lambda-nodejs";
import * as iam from "aws-cdk-lib/aws-iam";

export interface ContentSchedulingProps {
  publishContentFunction: lambda.Function;
  prependStage: (str: string) => string;
}

export class ContentSchedulingConstruct extends Construct {
  public readonly scheduleContentFunction: lambda.Function;
  public readonly deleteScheduleFunction: lambda.Function;

  constructor(scope: Construct, id: string, props: ContentSchedulingProps) {
    super(scope, id);

    const cloudWatchLogPolicy = new iam.PolicyStatement({
      actions: ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"],
      resources: ["*"],
    });

    const schedulerRole = new iam.Role(this, props.prependStage("scheduler-role"), {
      roleName: props.prependStage("scheduler-role"),
      assumedBy: new iam.ServicePrincipal("scheduler.amazonaws.com"),
    });

    const invokeLambdaPolicy = new iam.Policy(this, props.prependStage("invoke-lambda-policy"), {
      policyName: props.prependStage("invoke-lambda-policy"),
      statements: [
        new iam.PolicyStatement({
          actions: ["lambda:InvokeFunction"],
          resources: [props.publishContentFunction.functionArn],
          effect: iam.Effect.ALLOW,
        }),
      ],
    });

    schedulerRole.attachInlinePolicy(invokeLambdaPolicy);

    this.scheduleContentFunction = new lambdaNodeJS.NodejsFunction(
      this,
      props.prependStage("schedule-content"),
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        entry: "./lambda/schedule-content/index.ts",
        environment: {
          TARGET_FUNCTION_ARN: props.publishContentFunction.functionArn,
          SCHEDULER_ROLE_ARN: schedulerRole.roleArn,
        },
        functionName: props.prependStage("schedule-content"),
        timeout: cdk.Duration.seconds(60),
      },
    );

    this.scheduleContentFunction.addToRolePolicy(cloudWatchLogPolicy);
    this.scheduleContentFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["scheduler:CreateSchedule", "scheduler:UpdateSchedule", "scheduler:GetSchedule"],
        resources: ["*"],
      }),
    );

    this.scheduleContentFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["iam:PassRole"],
        resources: ["*"],
      }),
    );

    this.deleteScheduleFunction = new lambdaNodeJS.NodejsFunction(
      this,
      props.prependStage("delete-schedule"),
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        entry: "./lambda/delete-schedule/index.ts",
        functionName: props.prependStage("delete-schedule"),
      },
    );
    this.deleteScheduleFunction.addToRolePolicy(cloudWatchLogPolicy);
    this.deleteScheduleFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["scheduler:DeleteSchedule"],
        resources: ["*"],
      }),
    );
  }
}
