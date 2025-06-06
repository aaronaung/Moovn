import { Tables } from "@/types/db";

export const userDisplayName = (user: Partial<Tables<"users">>, withEmail: boolean = false) => {
  if (user?.first_name) {
    // Studio users don't have last name
    return `${user.first_name} ${user.last_name}` + (withEmail ? ` (${user.email})` : "");
  }
  return user?.email;
};
