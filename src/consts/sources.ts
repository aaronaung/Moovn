export enum SourceTypes {
  Pike13 = "Pike13",
  Mindbody = "Mindbody",
  GoogleDrive = "Google Drive",
}

export enum SourceDataView {
  Daily = "Daily",
  Weekly = "Weekly",
}

export const SOURCE_HAS_NO_DATA_ID = "Source has no data";

export type MindbodySourceSettings = {
  siteId: string;
};

export type GoogleDriveSourceSettings = {
  access_token: string;
};

export type Pike13SourceSettings = {
  url: string;
};

export type SourceSettings =
  | Pike13SourceSettings
  | MindbodySourceSettings
  | GoogleDriveSourceSettings;
