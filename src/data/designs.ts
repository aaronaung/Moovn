import { SupabaseOptions } from "./clients/types";
import { throwOrData } from "./util";
import { GenerateDesignRequest } from "@/app/api/designs/generate/dto";

export const getDesignsForTemplate = (
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

export const generateDesign = async (req: GenerateDesignRequest) => {
  const resp = await fetch("/api/designs/generate", {
    method: "POST",
    body: JSON.stringify(req),
  });

  return resp.json();
};
