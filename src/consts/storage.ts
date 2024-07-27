import { SourceDataView } from "./sources";

export const BUCKETS = {
  designTemplates: "templates",
  designOverwrites: "designs",
  emailAssets: "email_assets",
  stagingAreaForContentPublishing: "staging_area_for_content_publishing",
  freeDesignTemplates: "free_design_templates",
};

export const STORAGE_DIR_PATHS = {};

export const FREE_DESIGN_TEMPLATES = {
  [SourceDataView.Daily]: ["daily_template_1"],
  [SourceDataView.Weekly]: ["weekly_1_template_1", "weekly_2_template_1"],
};
