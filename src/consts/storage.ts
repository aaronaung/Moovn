import { ContentType } from "./content";
import { SourceDataView } from "./sources";

export const FREE_DESIGN_TEMPLATES: {
  [key: string]: { [key: string]: { title: string; fileName: string }[] };
} = {
  [SourceDataView.Daily]: {
    [ContentType.InstagramPost]: [
      {
        title: "Daily IG post template #1",
        fileName: "daily_template_1",
      },
    ],
    [ContentType.InstagramStory]: [
      {
        title: "Daily IG story template #1",
        fileName: "daily_template_1",
      },
    ],
  },
  [SourceDataView.Weekly]: {
    [ContentType.InstagramPost]: [
      {
        title: "Weekly IG post (day 1-3) template #1",
        fileName: "weekly_1_template_1",
      },
      {
        title: "Weekly IG post (day 4-6) template #1",
        fileName: "weekly_2_template_1",
      },
    ],
  },
};

export const BLANK_DESIGN_TEMPLATES: { [key: string]: string } = {
  [ContentType.InstagramPost]: "blank_ig_post",
  [ContentType.InstagramStory]: "blank_ig_story",
};
