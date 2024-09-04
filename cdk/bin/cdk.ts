#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { MoovnStack } from "../lib/cdk-stack";
import * as dotenv from "dotenv";
import * as path from "path";

// 1. Configure dotenv to read from our `.env` file
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// 2. Define a TS Type to type the returned envs from our function below.
export type ConfigProps = {
  ENVIRONMENT: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
};

const app = new cdk.App();
new MoovnStack(app, "moovn-prod", {
  /* If you don't specify 'env', this stack will be environment-agnostic.
   * Account/Region-dependent features and context lookups will not work,
   * but a single synthesized template can be deployed anywhere. */
  /* Uncomment the next line to specialize this stack for the AWS Account
   * and Region that are implied by the current CLI configuration. */
  // env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
  /* Uncomment the next line if you know exactly what Account and Region you
   * want to deploy the stack to. */
  // env: { account: '123456789012', region: 'us-east-1' },
  /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
  config: {
    ENVIRONMENT: "prod",
    SUPABASE_URL: process.env.PROD_SUPABASE_URL!,
    SUPABASE_SERVICE_ROLE_KEY: process.env.PROD_SUPABASE_SERVICE_ROLE_KEY!,
  },
});

new MoovnStack(app, "moovn-dev", {
  config: {
    ENVIRONMENT: "dev",
    SUPABASE_URL: process.env.DEV_SUPABASE_URL!,
    SUPABASE_SERVICE_ROLE_KEY: process.env.DEV_SUPABASE_SERVICE_ROLE_KEY!,
  },
});
