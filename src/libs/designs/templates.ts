import { BUCKETS } from "@/src/consts/storage";
import { supaServerClient } from "@/src/data/clients/server";
import { readPsd } from "ag-psd";

export class TemplateNotFoundErr extends Error {
  constructor(templateId: string) {
    super(`Template not found: ${templateId}`);
    this.name = "TemplateNotFoundErr";
  }
}

export const getTemplateData = async (templateId: string) => {
  const { data: template } = await supaServerClient()
    .from("templates")
    .select("*, source:sources(*)")
    .eq("id", templateId)
    .single();

  if (!template) {
    throw new TemplateNotFoundErr(templateId);
  }

  const templatePath = `${template.owner_id}/${template.id}.psd`;
  const { data: templateSignedUrlData, error: signInputUrlErr } =
    await supaServerClient()
      .storage.from(BUCKETS.templates)
      .createSignedUrl(templatePath, 24 * 3600);
  const templateSignedUrl = templateSignedUrlData?.signedUrl;

  if (!templateSignedUrl) {
    throw new Error(`[InputSignedUrl Err] ${templatePath}: ${signInputUrlErr}`);
  }

  const templateFile = await (await fetch(templateSignedUrl)).blob();
  const psd = readPsd(await templateFile.arrayBuffer());

  return {
    template,
    signedUrl: templateSignedUrl,
    psd,
  };
};
