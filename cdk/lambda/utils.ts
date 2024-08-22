import _ from "lodash";

export const error = (message: string, status: number) => {
  return {
    statusCode: status,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  };
};

export const success = (body: any) => {
  const isObject = _.isObject(body);
  return {
    statusCode: 200,
    headers: isObject ? { "Content-Type": "application/json" } : { "Content-Type": "text/plain" },
    body: isObject ? JSON.stringify(body) : body,
  };
};
