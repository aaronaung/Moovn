"use client";

import { useCurrentBusinessContext } from "@/src/contexts/current-business";
import {
  StripeStatus,
  useConnectedAccountStatus,
} from "@/src/hooks/use-connected-account-status";
import { Button } from "../ui/button";
import { Spinner } from "./loading-spinner";
import { Header2 } from "./header";
import { useState } from "react";
import { Alert } from "../ui/alert";

export default function StripeBusinessAccountGuard({
  children,
}: {
  children?: any;
}) {
  const [fetchingOnboardingUrl, setFetchingOnboardingUrl] = useState(false);
  const { currentBusiness } = useCurrentBusinessContext();

  const {
    status: accountStatus,
    statusTitle: accountStatusTitle,
    statusDescription: accountStatusDescription,
    isLoading: isCheckingIfPaymentReady,
  } = useConnectedAccountStatus(currentBusiness);
  if (isCheckingIfPaymentReady) {
    return <Spinner />;
  }
  if (accountStatus === StripeStatus.Unknown) {
    return (
      <Alert variant="destructive">
        Something went wrong while checking your Stripe profile status. Please
        reload the page and try again. If the issue persists, please contact
        support.
      </Alert>
    );
  }

  if (accountStatus !== StripeStatus.IsReady) {
    return (
      <div className="flex flex-col items-center">
        <Header2 title={accountStatusTitle} />
        <p className="mt-1 max-w-[680px] text-center text-sm text-muted-foreground">
          {accountStatusDescription}
        </p>
        <Button
          className="mt-4 rounded-full"
          disabled={fetchingOnboardingUrl}
          onClick={async () => {
            setFetchingOnboardingUrl(true);
            const resp = await fetch(
              `/api/stripe/onboard?businessId=${currentBusiness.id}&onSuccessReturnUrl=${window.location.href}`,
            );
            const json = await resp.json();

            window.location.href = json.url;
          }}
        >
          {fetchingOnboardingUrl ? (
            <Spinner className="text-secondary"></Spinner>
          ) : StripeStatus.OnboardingNotInitiated ? (
            "Start now"
          ) : (
            "Continue"
          )}
        </Button>
      </div>
    );
  }
  return children;
}
