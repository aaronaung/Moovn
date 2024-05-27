export enum ProductType {
  Class = "class",
  Review = "review",
  Service = "service", // currently not used
}

export type StripeProductMetadata = {
  internal_id: string;
  type: ProductType;
};
