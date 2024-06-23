import { supaServerClient } from "@/src/data/clients/server";
import { getDestinationById } from "@/src/data/destinations";

export const verifyDestinationAccess = async (destinationId: string) => {
  const destination = await getDestinationById(destinationId, {
    client: supaServerClient(),
  });

  if (!destination) {
    return {
      status: 404,
      error: "Destination not found",
    };
  }
  if (!destination.long_lived_token) {
    return {
      status: 400,
      error: "Destination does not have a long-lived token",
    };
  }
  return {
    status: 200,
    data: destination,
  };
};
