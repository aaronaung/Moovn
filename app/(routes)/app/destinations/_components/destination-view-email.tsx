import BusinessClientsTable from "@/src/components/tables/business-clients";
import { Tables } from "@/types/db";

// Todo: this will come from source somehow.
const sampleEmails = [
  {
    name: "Aaron Aung",
    email: "aaronaung.95@gmail.com",
  },
  {
    name: "John Doe",
    email: "john.doe@gmail.com",
  },
  {
    name: "Jane Doe",
    email: "jane.doe@gmail.com",
  },
  {
    name: "Bob",
    email: "bob@gmail.com",
  },
];

export default function EmailDestinationView({
  destination,
}: {
  destination: Tables<"destinations">;
}) {
  return <BusinessClientsTable data={sampleEmails} />;
}
