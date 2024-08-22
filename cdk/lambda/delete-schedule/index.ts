import * as AWS from "aws-sdk";
import { error, success } from "../utils";

const scheduler = new AWS.Scheduler();
export const handler = async (event: any) => {
  try {
    const { name } = JSON.parse(event.body);
    await scheduler
      .deleteSchedule({
        Name: name,
      })
      .promise();

    return success(`Schedule  ${name} deleted successfully`);
  } catch (err: any) {
    return error(err.message, 500);
  }
};
