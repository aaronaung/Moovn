import * as _ from "lodash";
import {
  SchedulerClient,
  UpdateScheduleCommand,
  CreateScheduleCommand,
  GetScheduleCommand,
  UpdateScheduleCommandInput,
} from "@aws-sdk/client-scheduler";
import { success, error } from "../utils";

const scheduler = new SchedulerClient({});

export const handler = async (event: any) => {
  try {
    const schedules = JSON.parse(event.body);
    if (!process.env.TARGET_FUNCTION_ARN || !process.env.SCHEDULER_ROLE_ARN) {
      throw new Error("Missing environment variables TARGET_FUNCTION_ARN or SCHEDULER_ROLE_ARN");
    }
    if (!_.isArray(schedules)) {
      throw new Error("Request body should be an array of schedules");
    }
    for (const schedule of schedules) {
      const { contentId, contentPath, scheduleName, scheduleExpression } = schedule;
      if (!contentId) {
        throw new Error(`Missing contentId in schedule: ${JSON.stringify(schedule)}`);
      }
      if (!contentPath) {
        throw new Error(`Missing contentPath in schedule: ${JSON.stringify(schedule)}`);
      }
      if (!scheduleName) {
        throw new Error(`Missing scheduleName in schedule: ${JSON.stringify(schedule)}`);
      }
      if (!scheduleExpression) {
        throw new Error(`Missing scheduleExpression in schedule: ${JSON.stringify(schedule)}`);
      }
    }

    await Promise.all(
      schedules.map(
        ({
          contentId,
          contentPath,
          scheduleName,
          scheduleExpression,
          scheduleExpressionTimezone,
        }) =>
          new Promise(async (resolve, reject) => {
            const scheduleInput: UpdateScheduleCommandInput = {
              Name: scheduleName,
              ScheduleExpressionTimezone: scheduleExpressionTimezone || "UTC",
              ScheduleExpression: scheduleExpression,
              State: "ENABLED",
              FlexibleTimeWindow: {
                Mode: "OFF",
              },
              Target: {
                Arn: process.env.TARGET_FUNCTION_ARN!,
                RoleArn: process.env.SCHEDULER_ROLE_ARN!,
                Input: JSON.stringify({ contentId, contentPath }),
              },
            };

            try {
              // Check if schedule exists
              await scheduler.send(new GetScheduleCommand({ Name: scheduleName }));

              // If it exists, update it
              await scheduler.send(new UpdateScheduleCommand(scheduleInput));
              resolve(true);
            } catch (err: any) {
              if (err.name === "ResourceNotFoundException") {
                try {
                  // If it doesn't exist, create it
                  await scheduler.send(new CreateScheduleCommand(scheduleInput));
                  resolve(true);
                } catch (createErr) {
                  reject(createErr);
                }
              } else {
                reject(err);
              }
            }
          }),
      ),
    );

    return success("Schedule(s) created or updated successfully");
  } catch (err: any) {
    return error(err.message, 500);
  }
};
