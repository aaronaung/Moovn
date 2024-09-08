import { ContentType } from "./content";
import { SourceDataView } from "./sources";

export const FREE_DESIGN_TEMPLATES: { [key: string]: { [key: string]: string[] } } = {
  [SourceDataView.Daily]: {
    [ContentType.InstagramPost]: ["daily_template_1"],
    [ContentType.InstagramStory]: ["daily_template_1"],
  },
  [SourceDataView.Weekly]: {
    [ContentType.InstagramPost]: ["weekly_1_template_1", "weekly_2_template_1"],
  },
};
