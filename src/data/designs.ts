import { PsJobResponse } from "@adobe/photoshop-apis";
import { SupabaseOptions } from "./clients/types";
import { throwOrData } from "./util";
import { GenerateDesignRequest } from "@/app/api/designs/generate/dto";
import { Tables } from "@/types/db";

export const getDesignsForTemplate = async (
  template: string,
  { client }: SupabaseOptions,
) => {
  return throwOrData(
    client
      .from("design_jobs")
      .select("*, template:templates(*)")
      .eq("template_id", template)
      .order("created_at", { ascending: false })
      .limit(3),
  );
};

export const generateDesign = async (
  req: GenerateDesignRequest,
): Promise<{ id: string; result: PsJobResponse }> => {
  const resp = await fetch("/api/designs/generate", {
    method: "POST",
    body: JSON.stringify(req),
  });

  return resp.json();
};

export const saveDesignJob = async (
  job: Partial<Tables<"design_jobs">>,
  { client }: SupabaseOptions,
) => {
  return throwOrData(
    client.from("design_jobs").upsert(job as Tables<"design_jobs">),
  );
};
