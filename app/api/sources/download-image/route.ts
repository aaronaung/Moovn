import { NextRequest } from "next/server";
import { z } from "zod";

const DownloadImageSchema = z.object({
  url: z.string().url({ message: "Must be a valid url." }),
});
export type DownloadImageRequest = z.infer<typeof DownloadImageSchema>;

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { url } = DownloadImageSchema.parse(await req.json());

  const arrayBuffer = await (await fetch(url)).arrayBuffer();

  return new Response(arrayBuffer, {
    headers: {
      "Content-Type": "image/jpeg",
    },
  });
}
