import * as _ from "lodash";
import * as AWS from "aws-sdk";
import { success, error } from "../utils";
import { UpdateScheduleInput } from "aws-sdk/clients/scheduler";

// IMPORTANT NOTE: Changing this lambda may require you to recreate all upcoming schedules in EventBridge.
// Especially if you change the structure of the request body sent to the publish-content lambda
// or the way schedules are created/updated. The already created schedules will NOT be updated automatically.
const scheduler = new AWS.Scheduler();
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
            const payload: UpdateScheduleInput = {
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
              // Check if schedule exists, this will throw an error if it doesn't exist.
              await scheduler.getSchedule({ Name: scheduleName }).promise();

              // If it exists, update it.
              await scheduler.updateSchedule(payload).promise();
              resolve(true);
            } catch (err: any) {
              if (err.code === "ResourceNotFoundException") {
                try {
                  // If it doesn't exist, create it.
                  await scheduler.createSchedule(payload).promise();
                  resolve(true);
                } catch (err) {
                  reject(err);
                }
              }
              reject(err);
            }
          }),
      ),
    );

    return success("Schedule(s) created or updated successfully");
  } catch (err: any) {
    return error(err.message, 500);
  }
};
