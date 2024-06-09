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
  SourceTypes,
} from "@/src/consts/sources";
import { Pike13Client, Pike13SourceSettings } from "@/src/libs/sources/pike13";
import { env } from "@/env.mjs";
import { generateDesign } from "@/src/libs/designs/photoshop";
import { GenerateDesignRequestSchema } from "./dto";
import { Json } from "@/types/db";
import _ from "lodash";
import {
  getTemplateData,
  TemplateNotFoundErr,
} from "@/src/libs/designs/templates";

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

  try {
    const {
      template,
      signedUrl: inputSignedUrl,
      psd,
    } = await getTemplateData(templateId);

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

    switch (template.source?.type) {
      case SourceTypes.PIKE13:
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
            inputPsd: psd,
            outputUrlPsd: outputSignedUrlPsd,
            outputUrlJpeg: outputSignedUrlJpeg,
          });
        } catch (err: any) {
          console.error("error", err);

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
    console.error("error", err);
    if (err instanceof TemplateNotFoundErr) {
      return Response.json(err, { status: 404 });
    }

    if (err.body && _.isObject(err.body)) {
      return Response.json(err.body, { status: 500 });
    }
    return new Response(JSON.stringify(err.body) ?? err.message, {
      status: 500,
    });
  }
}
