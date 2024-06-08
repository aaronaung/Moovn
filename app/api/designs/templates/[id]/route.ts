import { getTemplateData } from "@/src/libs/designs/templates";
import { NextRequest } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const templateData = await getTemplateData(params.id);
  return Response.json(templateData);
}
