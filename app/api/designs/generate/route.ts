import { NextRequest } from "next/server";
import { initializeCanvas } from "ag-psd";
import { supaServerClient } from "@/src/data/clients/server";
import { BUCKETS } from "@/src/consts/storage";
import { v4 as uuid } from "uuid";
import { createCanvas, Image } from "canvas";
import { PsAsyncJobError } from "@adobe/photoshop-apis/dist/PsAsyncJob";
import {
  SOURCE_HAS_NO_DATA_ID,
  SourceDataView,
  Sources,
} from "@/src/consts/sources";
import { Pike13Client, Pike13SourceSettings } from "@/src/libs/sources/pike13";
import { env } from "@/env.mjs";
import { generateDesign } from "@/src/libs/design-gen/photoshop";
import { GenerateDesignRequestSchema } from "./dto";
import { Json } from "@/types/db";
import _ from "lodash";

function createCanvasFromData(data: any) {
  const image = new Image();
  image.src = Buffer.from(data);
  const canvas = createCanvas(image.width, image.height);
  canvas.getContext("2d").drawImage(image, 0, 0);
  return canvas;
}
initializeCanvas(createCanvas as any, createCanvasFromData as any);

export async function POST(request: NextRequest) {
  const { templateId } = GenerateDesignRequestSchema.parse(
    await request.json(),
  );

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

    // TODO: This should be a hash of the schedule data, and we should check if the
    // design already exists at this hashed id, because we don't need to regenerate
    // the design if the schedule data hasn't changed.
    const jobId = uuid();

    const generatedContentPath = `${template.owner_id}/${jobId}`;
    const { data: outputSignedUrlData, error: signOutputUrlErr } =
      await supaServerClient()
        .storage.from(BUCKETS.designs)
        .createSignedUploadUrl(`${generatedContentPath}.jpeg`);
    const outputSignedUrlJpeg = outputSignedUrlData?.signedUrl;
    if (!outputSignedUrlJpeg) {
      throw new Error(`[OutputSignedUrlJpeg Err]: ${signOutputUrlErr}`);
    }
    const { data: outputSignedUrlPsdData, error: signPsdOutputUrlErr } =
      await supaServerClient()
        .storage.from(BUCKETS.designs)
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

    switch (template.source?.type) {
      case Sources.PIKE13:
        const pike13 = new Pike13Client({
          clientId: env.PIKE13_CLIENT_ID,
          businessUrl: (template.source?.settings as Pike13SourceSettings)?.url,
        });

        const scheduleData = await pike13.getScheduleDataForView(
          template.source_data_view as SourceDataView,
        );
        if (scheduleData.schedules.length === 0) {
          return Response.json({ id: SOURCE_HAS_NO_DATA_ID });
        }

        let generateResp;
        try {
          generateResp = await generateDesign({
            scheduleData,
            inputUrl: inputSignedUrl,
            outputUrlPsd: outputSignedUrlPsd,
            outputUrlJpeg: outputSignedUrlJpeg,
          });
        } catch (err: any) {
          if (err instanceof PsAsyncJobError) {
            await supaServerClient()
              .from("design_jobs")
              .upsert({
                id: jobId,
                template_id: template.id,
                raw_result: {
                  error: err,
                  status: 400,
                } as unknown as Json,
              });
            return Response.json(err, { status: 400 });
          }
          // If it's not a PsAsyncJobError, then it's likely an unexpected code/server error on our end.
          console.error(JSON.stringify(err, null, 2));
          if (err.body && _.isObject(err.body)) {
            return Response.json(err.body, { status: 500 });
          }
          return new Response(err.body ?? err.message, {
            status: 500,
          });
        }

        await supaServerClient()
          .from("design_jobs")
          .upsert({
            id: jobId,
            template_id: template.id,
            raw_result: generateResp as unknown as Json,
          });
        return Response.json({ id: jobId, result: generateResp?.result });
      default:
        throw new Error(`Unsupported source type: ${template.source?.type}`);
    }
  } catch (err: any) {
    console.error(JSON.stringify(err, null, 2));
    if (err.body && _.isObject(err.body)) {
      return Response.json(err.body, { status: 500 });
    }
    return new Response(JSON.stringify(err.body) ?? err.message, {
      status: 500,
    });
  }
}
