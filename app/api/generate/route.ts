import { NextRequest } from "next/server";
import { initializeCanvas } from "ag-psd";
import { supaServerClient } from "@/src/data/clients/server";
import { BUCKETS } from "@/src/consts/storage";
import { v4 as uuid } from "uuid";
import { createCanvas, Image } from "canvas";
import { PsAsyncJobError } from "@adobe/photoshop-apis/dist/PsAsyncJob";
import { Sources } from "@/src/consts/sources";
import { Pike13Client, Pike13SourceSettings } from "@/src/libs/sources/pike13";
import { env } from "@/env.mjs";
import { generateDesign } from "@/src/libs/design-gen/photoshop";

function createCanvasFromData(data: any) {
  const image = new Image();
  image.src = Buffer.from(data);
  const canvas = createCanvas(image.width, image.height);
  canvas.getContext("2d").drawImage(image, 0, 0);
  return canvas;
}
initializeCanvas(createCanvas as any, createCanvasFromData as any);

export async function POST(request: NextRequest) {
  const { templateId } = await request.json();

  const { data: template } = await supaServerClient()
    .from("templates")
    .select("*, source:sources(*)")
    .eq("id", templateId)
    .single();

  if (!template) {
    return new Response("Template not found.", { status: 404 });
  }

  try {
    const templatePath = `${template.owner_id}/${template.id}.psd`;
    const { data: inputSignedUrlData, error: signInputUrlErr } =
      await supaServerClient()
        .storage.from(BUCKETS.templates)
        .createSignedUrl(templatePath, 24 * 3600);
    const inputSignedUrl = inputSignedUrlData?.signedUrl;
    if (!inputSignedUrl) {
      throw new Error(
        `[InputSignedUrl Err] ${templatePath}: ${signInputUrlErr}`,
      );
    }

    const jobId = uuid();
    const generatedContentPath = `${template.owner_id}/${jobId}`;
    const { data: outputSignedUrlData, error: signOutputUrlErr } =
      await supaServerClient()
        .storage.from(BUCKETS.generatedContent)
        .createSignedUploadUrl(`${generatedContentPath}.jpeg`);
    const outputSignedUrlJpeg = outputSignedUrlData?.signedUrl;
    if (!outputSignedUrlJpeg) {
      throw new Error(`[OutputSignedUrlJpeg Err]: ${signOutputUrlErr}`);
    }
    const { data: outputSignedUrlPsdData, error: signPsdOutputUrlErr } =
      await supaServerClient()
        .storage.from(BUCKETS.generatedContent)
        .createSignedUploadUrl(`${generatedContentPath}.psd`);
    const outputSignedUrlPsd = outputSignedUrlPsdData?.signedUrl;
    if (!outputSignedUrlPsd) {
      throw new Error(`[OutputSignedUrlPsd Err]: ${signPsdOutputUrlErr}`);
    }

    const { data: psdFileData } = await supaServerClient()
      .storage.from(BUCKETS.templates)
      .download(templatePath);
    if (!psdFileData) {
      throw new Error("PSD file download has no data.");
    }

    try {
      switch (template.source?.type) {
        case Sources.PIKE13:
          const pike13 = new Pike13Client({
            clientId: env.PIKE13_CLIENT_ID,
            businessUrl: (template.source?.settings as Pike13SourceSettings)
              ?.url,
          });

          const scheduleData = await pike13.getDailySchedule(new Date());
          const generateResp = await generateDesign({
            scheduleData,
            inputUrl: inputSignedUrl,
            outputUrlPsd: outputSignedUrlPsd,
            outputUrlJpeg: outputSignedUrlJpeg,
          });

          await supaServerClient()
            .from("design_jobs")
            .upsert({
              id: jobId,
              template_id: template.id,
              raw_result: JSON.stringify(generateResp),
            });

          return Response.json(generateResp);
        default:
          throw new Error(`Unsupported source type: ${template.source?.type}`);
      }
    } catch (err: any) {
      console.error(err);
      if (err instanceof PsAsyncJobError) {
        await supaServerClient()
          .from("design_jobs")
          .upsert({
            id: jobId,
            template_id: template.id,
            raw_result: JSON.stringify({
              error: err,
              status: 400,
            }),
          });
        return Response.json(err, { status: 400 });
      }
      await supaServerClient()
        .from("design_jobs")
        .upsert({
          id: jobId,
          template_id: template.id,
          raw_result: JSON.stringify({
            error: err.body,
            status: err.status,
          }),
        });
      return Response.json(err.body, { status: err.status });
    }
  } catch (err: any) {
    console.error(err);
    return new Response(err.body ?? err.message, { status: 500 });
  }
}
