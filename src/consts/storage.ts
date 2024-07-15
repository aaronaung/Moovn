import { SourceDataView } from "./sources";

export const BUCKETS = {
  templates: "templates",
  designs: "designs",
  stagingAreaForContentPublishing: "staging_area_for_content_publishing",
  freeDesignTemplates: "free_design_templates",
};

export const STORAGE_DIR_PATHS = {};

export const FREE_DESIGN_TEMPLATES = {
  [SourceDataView.DAILY]: ["daily-template-1"],
  [SourceDataView.WEEKLY]: ["weekly-1-template-1", "weekly-2-template-1"],
};
