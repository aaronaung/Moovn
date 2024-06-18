import { NextRequest } from "next/server";
import { initializeCanvas, readPsd } from "ag-psd";
import { supaServerClient } from "@/src/data/clients/server";
import { BUCKETS } from "@/src/consts/storage";
import { createCanvas, Image } from "canvas";
import { PsAsyncJobError } from "@adobe/photoshop-apis/dist/PsAsyncJob";
import { SourceDataView, SourceTypes } from "@/src/consts/sources";
import { Pike13Client, Pike13SourceSettings } from "@/src/libs/sources/pike13";
import { env } from "@/env.mjs";
import { generateDesign } from "@/src/libs/designs/photoshop";
import { GenerateDesignRequestSchema } from "./dto";
import { Json } from "@/types/db";
import _ from "lodash";
import { ScheduleData } from "@/src/libs/sources/common";
import { MD5 as hash } from "object-hash";
import { signUrl } from "@/src/libs/storage";
import { saveDesignJob } from "@/src/data/designs";
import { getTemplateById, saveTemplate } from "@/src/data/templates";
import { v4 as uuid } from "uuid";

function createCanvasFromData(data: any) {
  const image = new Image();
  image.src = Buffer.from(data);
  const canvas = createCanvas(image.width, image.height);
  canvas.getContext("2d").drawImage(image, 0, 0);
  return canvas;
}
initializeCanvas(createCanvas as any, createCanvasFromData as any);

export async function POST(request: NextRequest) {
  const { templateId } = GenerateDesignRequestSchema.parse(await request.json());
  const sbClient = supaServerClient();

  try {
    const template = await getTemplateById(templateId, {
      client: sbClient,
    });
    if (!template) {
      return new Response(`Template ${templateId} not found`, {
        status: 404,
      });
    }

    let scheduleData: ScheduleData;
    switch (template.source?.type) {
      case SourceTypes.PIKE13:
        const pike13 = new Pike13Client({
          clientId: env.PIKE13_CLIENT_ID,
          businessUrl: (template.source?.settings as Pike13SourceSettings)?.url,
        });

        scheduleData = await pike13.getScheduleDataForView(template.source_data_view as SourceDataView);
        break;
      default:
        throw new Error(`Unsupported source type: ${template.source?.type}`);
    }

    // Each design job is associated with a unique hash of the schedule data and template id.
    // This way, we can check if the schedule data has changed for a given design template, and if we need to regenerate the design.
    const computedLatestDesignHash = hash({
      scheduleData,
      templateId,
    });
    if (computedLatestDesignHash === template.latest_design_hash) {
      return Response.json({
        result: `Schedule data hasn't changed for template ${templateId} - no need to generate design.`,
      });
    }
    const jobId = uuid();

    const outputPsdPath = `${template.owner_id}/${templateId}/${jobId}.psd`;
    const outputJpegPath = `${template.owner_id}/${templateId}/${jobId}.jpeg`;
    const templateUrl = await signUrl({
      bucket: BUCKETS.templates,
      objectPath: `${template.owner_id}/${templateId}.psd`,
      client: sbClient,
    });
    const outputPsdUrl = await signUrl({
      bucket: BUCKETS.designs,
      objectPath: outputPsdPath,
      isUpload: true,
      client: sbClient,
    });
    const outputJpegUrl = await signUrl({
      bucket: BUCKETS.designs,
      objectPath: outputJpegPath,
      isUpload: true,
      client: sbClient,
    });

    const templateFile = await (await fetch(templateUrl)).blob();
    const psd = readPsd(await templateFile.arrayBuffer());
    let generateResp;
    try {
      generateResp = await generateDesign({
        scheduleData,
        inputUrl: templateUrl,
        inputPsd: psd,
        outputUrlPsd: outputPsdUrl,
        outputUrlJpeg: outputJpegUrl,
      });

      const latestPsdPath = `${template.owner_id}/${templateId}/latest.psd`;
      const latestJpegPath = `${template.owner_id}/${templateId}/latest.jpeg`;

      await sbClient.storage.from(BUCKETS.designs).remove([latestPsdPath, latestJpegPath]);
      await sbClient.storage.from(BUCKETS.designs).copy(outputJpegPath, latestJpegPath);
      await sbClient.storage.from(BUCKETS.designs).copy(outputPsdPath, latestPsdPath);
    } catch (err: any) {
      console.error("error", err);

      if (err instanceof PsAsyncJobError) {
        // NOTE: We're not storing the schedule hash here because the design generation failed.
        // This way, we can retry the design generation later. The issue could be code error or
        // invalid template.
        await saveDesignJob(
          {
            id: jobId,
            template_id: template.id,
            raw_result: {
              error: err,
              status: 400,
            } as unknown as Json,
          },
          { client: sbClient },
        );
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
    await Promise.all([
      saveDesignJob(
        {
          id: jobId,
          template_id: template.id,
          raw_result: generateResp as unknown as Json,
        },
        { client: sbClient },
      ),
      saveTemplate(
        {
          // NOTE: if this call fails, all future generate calls will fail, because we will have already generated the design,
          // and createUploadSignUrl will fail with "resource already exists" error. This shouldn't happen in most cases.
          // But we're still waiting for supabase to support upsert option for uploadSignedUrl.
          // If this happens we need to manually update the templates.latest_design_hash to the design hash value in storage.
          ..._.omit(template, "source"),
          latest_design_hash: computedLatestDesignHash,
        },
        { client: sbClient },
      ),
    ]);

    return Response.json({
      id: jobId,
      result: generateResp?.result,
    });
  } catch (err: any) {
    console.error(`GenerateErr for template ${templateId}:`, err);
    if (err.body && _.isObject(err.body)) {
      return Response.json(err.body, { status: 500 });
    }
    return new Response(JSON.stringify(err.body) ?? err.message, {
      status: 500,
    });
  }
}
