import { SchedulerClient, DeleteScheduleCommand } from "@aws-sdk/client-scheduler";
import { error, success } from "../utils";

const scheduler = new SchedulerClient({});
export const handler = async (event: any) => {
  try {
    const { name } = JSON.parse(event.body);
    await scheduler.send(
      new DeleteScheduleCommand({
        Name: name,
      }),
    );

    return success(`Schedule  ${name} deleted successfully`);
  } catch (err: any) {
    return error(err.message, 500);
  }
};
