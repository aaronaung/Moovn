// import { Tables } from "@/types/db";
// import { useEffect, useState } from "react";
// import { getStripeAccount } from "../data/stripe";

// type StripeRequirements = {
//   //https://docs.stripe.com/api/persons/object#person_object-requirements
//   currently_due: string[];
//   past_due: string[];
//   eventually_due: string[];
// };

// export enum StripeStatus {
//   OnboardingNotInitiated,
//   IsReady,
//   IsNotReady,
//   Unknown,
// }

// const STRIPE_STATUS_TITLES: { [key: number]: string } = {
//   [StripeStatus.OnboardingNotInitiated]: "Set up a Stripe business profile",
//   [StripeStatus.IsNotReady]:
//     "Stripe needs more information or is verifying your profile",
// };

// const STRIPE_STATUS_DESCRIPTIONS: { [key: number]: string } = {
//   [StripeStatus.OnboardingNotInitiated]:
//     "You must first set up a business profile with Stripe to receive payment from your customers 💸",
//   [StripeStatus.IsNotReady]:
//     "Your instructor profile is temporarily deactivated until Stripe can verify the required information. Click 'Continue' to see what's missing/being verified. If you think this is a mistake, please contact support.",
// };

// export const useConnectedAccountStatus = (business: Tables<"businesses">) => {
//   const [isLoading, setIsLoading] = useState(true);
//   const [status, setStatus] = useState<StripeStatus>(StripeStatus.Unknown);
//   const [statusTitle, setStatusTitle] = useState<string>("");
//   const [statusDescription, setStatusDescription] = useState<string>("");

//   const setStatusData = (status: StripeStatus) => {
//     setStatus(status);
//     setStatusTitle(STRIPE_STATUS_TITLES[status] || "");
//     setStatusDescription(STRIPE_STATUS_DESCRIPTIONS[status] || "");
//   };

//   useEffect(() => {
//     const checkIfAccountIsReady = async () => {
//       if (!business.stripe_account_id) {
//         setIsLoading(false);
//         setStatusData(StripeStatus.OnboardingNotInitiated);
//         return;
//       }

//       try {
//         const account = await getStripeAccount(business.stripe_account_id);
//         if (account.charges_enabled && account.payouts_enabled) {
//           setStatusData(StripeStatus.IsReady);
//           return;
//         }

//         setStatusData(StripeStatus.IsNotReady);
//       } catch (err) {
//         console.error(err);
//       } finally {
//         setIsLoading(false);
//       }
//     };

//     checkIfAccountIsReady();
//   }, [business]);

//   return {
//     isLoading,
//     status,
//     statusTitle,
//     statusDescription,
//   };
// };
