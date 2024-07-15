import { SourceDataView } from "./sources";

export const BUCKETS = {
  templates: "templates",
  designs: "designs",
  stagingAreaForContentPublishing: "staging_area_for_content_publishing",
  freeDesignTemplates: "free_design_templates",
};

export const STORAGE_DIR_PATHS = {};

export const FREE_DESIGN_TEMPLATES = {
  [SourceDataView.DAILY]: ["daily_template_1"],
  [SourceDataView.WEEKLY]: ["weekly_1_template_1", "weekly_2_template_1"],
};
