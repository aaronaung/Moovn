import { Tables } from "@/types/db";

export default function InstagramDestinationView({
  destination,
}: {
  destination: Tables<"destinations">;
}) {
  if (!destination.long_lived_token) {
    // For now, this is for Instagram only
    return (
      <p className="mb-2 text-sm text-muted-foreground">
        This destination is not connected. Please connect it to start publishing.
      </p>
    );
  }
  return <></>;
}
