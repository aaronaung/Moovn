import { ProductType } from "../products";

export type StripeCheckoutMetadata = {
  stripe_product_id: string;
  quantity: string; // All stripe metadata are stored as strings
  user_id: string;
  product_type: ProductType;
};
