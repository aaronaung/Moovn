"use client";
import { SubscriptionRules } from "@/src/consts/stripe";
import { Slider } from "@/src/components/ui/slider";
import { useState } from "react";
import InputText from "@/src/components/ui/input/text";
import { round } from "lodash";
import { useSearchParams } from "next/navigation";
import { SubscriptionPlan } from "@/src/consts/stripe";
import Link from "next/link";

const PLATFORM_ADMIN_FLAG = false;
const MAX_SALES = 1000;

export default function EarningCalculator({ isBeta }: { isBeta?: boolean }) {
  const [classSales, setClassSales] = useState(300);
  const [reviewSales, setReviewSales] = useState(100);
  const [averageClassPrice, setAverageClassPrice] = useState(10);
  const [averageReviewPrice, setAverageReviewPrice] = useState(1);
  const params = useSearchParams();

  const calculateEarning = (plan: SubscriptionPlan) => {
    const pricingRules = SubscriptionRules[plan];
    const pricing = isBeta ? 0 : pricingRules.pricing;
    const classSalesLimit = isBeta ? MAX_SALES : pricingRules.classSalesLimit;
    const reviewSalesLimit = isBeta ? MAX_SALES : pricingRules.reviewSalesLimit;
    const percentKeepAfterLimit = isBeta ? 1 : pricingRules.percentKeepAfterLimit;

    const classSalesEarning = Math.min(classSales, classSalesLimit) * averageClassPrice;
    const reviewSalesEarning = Math.min(reviewSales, reviewSalesLimit) * averageReviewPrice;

    let platformEarning = pricingRules.pricing;
    let classSalesEarningAfterLimit = 0;
    if (classSales > classSalesLimit) {
      classSalesEarningAfterLimit =
        (classSales - classSalesLimit) * averageClassPrice * percentKeepAfterLimit;
      platformEarning +=
        (classSales - classSalesLimit) * averageClassPrice * (1 - percentKeepAfterLimit);
    }

    let reviewSalesEarningAfterLimit = 0;
    if (reviewSales > reviewSalesLimit) {
      reviewSalesEarningAfterLimit =
        (reviewSales - reviewSalesLimit) * averageReviewPrice * percentKeepAfterLimit;
      platformEarning +=
        (reviewSales - reviewSalesLimit) * averageReviewPrice * (1 - percentKeepAfterLimit);
    }

    return {
      instructorEarning:
        classSalesEarning +
        classSalesEarningAfterLimit +
        reviewSalesEarning +
        reviewSalesEarningAfterLimit -
        pricing,
      platformEarning,
    };
  };

  return (
    <div className="mx-auto mt-20 flex flex-col justify-center space-y-8 text-center md:max-w-[600px]">
      <h2 className="text-center text-3xl font-bold md:text-4xl">
        {isBeta && <p className="mb-2 text-xl text-red-400"> Beta program </p>}
        <span className="bg-gradient-to-b from-primary/60 to-primary bg-clip-text text-transparent">
          Earning{" "}
        </span>
        Calculator
      </h2>
      <p className="mb-8 mt-2 text-sm  text-muted-foreground">
        Note: The calculation does not take{" "}
        <Link target="_blank" href="https://stripe.com/pricing">
          <span className="text-primary hover:font-semibold hover:underline">Stripe fees</span>
        </Link>{" "}
        into account.{" "}
      </p>

      <div className="flex justify-center gap-x-4">
        <InputText
          prefix={<span className="mr-2">$</span>}
          label="Average class price"
          inputProps={{
            type: "number",
          }}
          value={averageClassPrice}
          onChange={(e) => {
            setAverageClassPrice(e.target.value);
          }}
        />

        <InputText
          prefix={<span className="mr-2">$</span>}
          label="Average review price"
          inputProps={{
            type: "number",
            step: "any",
          }}
          value={averageReviewPrice}
          onChange={(e) => {
            setAverageReviewPrice(e.target.value);
          }}
        />
      </div>
      <div>
        <label
          htmlFor="slider"
          className="mb-2 block text-sm font-medium leading-6 text-foreground"
        >
          Class sales per month ({classSales})
        </label>
        <Slider
          value={[classSales]}
          onValueChange={(val) => {
            setClassSales(val[0]);
          }}
          max={MAX_SALES}
          step={1}
        />
      </div>
      <div>
        <label
          htmlFor="slider"
          className="mb-2 block text-sm font-medium leading-6 text-foreground"
        >
          Review sales per month ({reviewSales})
        </label>
        <Slider
          value={[reviewSales]}
          onValueChange={(val) => {
            setReviewSales(val[0]);
          }}
          max={MAX_SALES}
          step={1}
        />
      </div>

      {isBeta ? (
        <>
          <div className="flex flex-col">
            <p className="mt-4 text-2xl font-semibold text-green-600 sm:text-3xl">
              ${round(calculateEarning(SubscriptionPlan.Hobby).instructorEarning).toLocaleString()}
            </p>
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-3">
            {Object.keys(SubscriptionPlan).map((plan: any) => (
              <div key={plan} className="flex flex-col">
                {/** @ts-ignore */}
                <h3 className="text-lg font-bold">{SubscriptionPlan[plan]}</h3>
                <p className="mt-4 text-2xl font-semibold text-green-600 sm:text-3xl">
                  <>
                    $
                    {round(
                      // @ts-ignore
                      calculateEarning(SubscriptionPlan[plan]).instructorEarning,
                    ).toLocaleString()}
                  </>
                </p>
              </div>
            ))}
          </div>
          {Boolean(params?.get("admin")) && (
            <div className="grid grid-cols-3">
              {Object.keys(SubscriptionPlan).map((plan: any) => (
                <div key={plan} className="flex flex-col">
                  <h3 className="text-lg font-bold">
                    {/** @ts-ignore */}
                    {SubscriptionPlan[plan]}
                  </h3>
                  <p className="mt-4 text-2xl font-semibold text-muted-foreground sm:text-3xl">
                    <>
                      $
                      {round(
                        // @ts-ignore
                        calculateEarning(SubscriptionPlan[plan]).platformEarning,
                      ).toLocaleString()}
                    </>
                  </p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
