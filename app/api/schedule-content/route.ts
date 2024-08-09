import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { supaServerComponentClient } from "@/src/data/clients/server";

export async function GET(request: NextRequest) {
  const resp = await supaServerComponentClient().functions.invoke("test", {
    body: {
      name: "blah blah bloo",
    },
    method: "POST",
  });

  return NextResponse.json(resp);
}
