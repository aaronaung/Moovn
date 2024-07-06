// import { Tables } from "@/types/db";
// import { toast } from "../components/ui/use-toast";
// import { createStripeCheckoutSession } from "../data/stripe";
// import { useRouter } from "next/navigation";
// import { useState } from "react";

// export const useBuyStripeProduct = ({
//   user,
//   business,
// }: {
//   user?: Tables<"users"> | null;
//   business?: Tables<"businesses"> | null;
// }) => {
//   const router = useRouter();
//   const [isBuying, setIsBuying] = useState(false);

//   const buy = async ({
//     stripeProductId,
//     quantity,
//     returnUrl,
//     onError,
//   }: {
//     stripeProductId: string;
//     quantity: number;
//     returnUrl: string;
//     onError: (error: string) => void;
//   }) => {
//     setIsBuying(true);
//     if (!user || !business) {
//       onError("You must be logged in to purchase a class.");
//       return;
//     }

//     if (!business.stripe_account_id) {
//       toast({
//         variant: "destructive",
//         title: "Error",
//         description: `We've disabled purchases from this instructor. Please contact us for more details.`,
//       });
//       return;
//     }

//     const checkoutSession = await createStripeCheckoutSession({
//       returnUrl,
//       quantity,
//       businessStripeAccountId: business.stripe_account_id,
//       productId: stripeProductId,
//       userId: user.id,
//     });

//     if (!checkoutSession.url) {
//       onError("Failed to create checkout session.");
//       return;
//     }
//     // We don't need to set buying to false here because we're navigating away.
//     router.push(checkoutSession.url);
//   };

//   return {
//     buy,
//     isBuying,
//   };
// };
