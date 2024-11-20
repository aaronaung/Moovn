import { ContentType } from "./content";
import { SourceDataView } from "./sources";

export type TemplateItemMetadata = DriveTemplateItemMetadata;
export type DriveTemplateItemMetadata = {
  drive_source_id: string;
  drive_folder_id: string;
  drive_folder_name: string;
  drive_file_name: string;
};

export enum TemplateCreationRequestStatus {
  InProgress = "in_progress",
  Done = "done",
}

export const FREE_DESIGN_TEMPLATES: {
  [key: string]: { [key: string]: { title: string; fileName: string; version: number }[] };
} = {
  [SourceDataView.Daily]: {
    [ContentType.InstagramPost]: [
      {
        title: "Daily Small IG post",
        fileName: "daily_sm_1",
        version: 1,
      },
      {
        title: "Daily Medium IG post",
        fileName: "daily_md_1",
        version: 1,
      },
    ],
    [ContentType.InstagramStory]: [
      {
        title: "Daily IG story #1",
        fileName: "daily_story_1",
        version: 1,
      },
    ],
  },
  [SourceDataView.Weekly]: {
    [ContentType.InstagramPost]: [
      {
        title: "Weekly Small IG post (day 1-3)",
        fileName: "weekly_sm_1_p1",
        version: 1,
      },
      {
        title: "Weekly Small IG post (day 4-6)",
        fileName: "weekly_sm_1_p2",
        version: 1,
      },
      {
        title: "Weekly Medium IG post (day 1-3)",
        fileName: "weekly_md_1_p1",
        version: 1,
      },
      {
        title: "Weekly Medium IG post (day 4-6)",
        fileName: "weekly_md_1_p2",
        version: 1,
      },
    ],
  },
};

export const BLANK_DESIGN_TEMPLATES: { [key: string]: string } = {
  [ContentType.InstagramPost]: "blank_ig_post",
  [ContentType.InstagramStory]: "blank_ig_story",
};
