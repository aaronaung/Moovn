import { NextRequest } from "next/server";
import { verifyDestinationAccess } from "../../../util";

export async function GET(req: NextRequest, { params }: { params: { id: string; mediaId: string } }) {
  const verifyResult = await verifyDestinationAccess(params.id);
  if (verifyResult.status !== 200) {
    return {
      status: verifyResult.status,
      body: { message: verifyResult.error },
    };
  }

  const fbClient = new FacebookGraphAPIClient({
    accessToken: 
}
