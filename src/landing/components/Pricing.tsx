import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import { Check } from "lucide-react";
import Link from "next/link";
import EarningCalculator from "./earning-calculator";
import { SubscriptionPlan } from "@/src/consts/stripe";
import { SubscriptionRules } from "@/src/consts/stripe";

enum PopularPlanType {
  NO = 0,
  YES = 1,
}

interface PricingProps {
  title: string;
  popular: PopularPlanType;
  price: number;
  description: string;
  buttonText: string;
  benefitList: { main: any; secondary?: any }[];
}

const pricingList: PricingProps[] = [
  {
    title: SubscriptionPlan.Hobby,
    popular: 0,
    price: 0,
    description: "Try our platform for free. No upfront commitment required.",
    buttonText: "Try it out",
    benefitList: [
      {
        main: (
          <>
            <b>{SubscriptionRules[SubscriptionPlan.Hobby].uploadLimit}</b> class
            uploads per month
          </>
        ),
      },
      {
        main: (
          <>
            <b>{SubscriptionRules[SubscriptionPlan.Hobby].classSalesLimit}</b>{" "}
            class sales per month (keep <b>100%</b>)
          </>
        ),
        secondary: `Keep ${
          SubscriptionRules[SubscriptionPlan.Hobby].percentKeepAfterLimit * 100
        }% of the sales after the first ${
          SubscriptionRules[SubscriptionPlan.Hobby].classSalesLimit
        }`,
      },
      {
        main: (
          <>
            <b>{SubscriptionRules[SubscriptionPlan.Hobby].reviewSalesLimit}</b>{" "}
            review sales per month (keep <b>100%</b>)
          </>
        ),
        secondary: `Keep ${
          SubscriptionRules[SubscriptionPlan.Hobby].percentKeepAfterLimit * 100
        }% of the sales after the first ${
          SubscriptionRules[SubscriptionPlan.Hobby].reviewSalesLimit
        }`,
      },
    ],
  },
  {
    title: SubscriptionPlan.Starter,
    popular: 1,
    price: SubscriptionRules[SubscriptionPlan.Starter].pricing,
    description: "You're just starting out and want to test the waters.",
    buttonText: "Get Started",
    benefitList: [
      {
        main: (
          <>
            <b>{SubscriptionRules[SubscriptionPlan.Starter].uploadLimit}</b>{" "}
            class uploads per month
          </>
        ),
      },
      {
        main: (
          <>
            <b>{SubscriptionRules[SubscriptionPlan.Starter].classSalesLimit}</b>{" "}
            class sales per month (keep <b>100%</b>)
          </>
        ),
        secondary: `Keep ${
          SubscriptionRules[SubscriptionPlan.Starter].percentKeepAfterLimit *
          100
        }% of the sales after the first ${
          SubscriptionRules[SubscriptionPlan.Starter].classSalesLimit
        }`,
      },
      {
        main: (
          <>
            <b>
              {SubscriptionRules[SubscriptionPlan.Starter].reviewSalesLimit}
            </b>{" "}
            review sales per month (keep <b>100%</b>)
          </>
        ),
        secondary: `Keep ${
          SubscriptionRules[SubscriptionPlan.Starter].percentKeepAfterLimit *
          100
        }% of the sales after the first ${
          SubscriptionRules[SubscriptionPlan.Starter].reviewSalesLimit
        }`,
      },
      {
        main: "Email support",
      },
    ],
  },
  {
    title: SubscriptionPlan.Pro,
    popular: 0,
    price: SubscriptionRules[SubscriptionPlan.Pro].pricing,
    description:
      "You're serious about teaching and want to grow your business.",
    buttonText: "Get Started",
    benefitList: [
      {
        main: (
          <>
            <b>{SubscriptionRules[SubscriptionPlan.Pro].uploadLimit}</b> class
            uploads per month
          </>
        ),
      },
      {
        main: (
          <>
            <b>{SubscriptionRules[SubscriptionPlan.Pro].classSalesLimit}</b>{" "}
            class sales per month (keep <b>100%</b>)
          </>
        ),
        secondary: `Keep ${
          SubscriptionRules[SubscriptionPlan.Pro].percentKeepAfterLimit * 100
        }% of the sales after the first ${
          SubscriptionRules[SubscriptionPlan.Pro].classSalesLimit
        }`,
      },
      {
        main: (
          <>
            <b>{SubscriptionRules[SubscriptionPlan.Pro].reviewSalesLimit}</b>{" "}
            review sales per month (keep <b>100%</b>)
          </>
        ),
        secondary: `Keep ${
          SubscriptionRules[SubscriptionPlan.Pro].percentKeepAfterLimit * 100
        }% of the sales after the first ${
          SubscriptionRules[SubscriptionPlan.Pro].reviewSalesLimit
        }`,
      },
      {
        main: "Email support",
        secondary: "1-3 day turn around time",
      },
    ],
  },
  // {
  //   title: "Scale",
  //   popular: 0,
  //   price: 149.99,
  //   description:
  //     "You've scaled beyond the Pro plan and need more resources to keep up with demand.",
  //   buttonText: "Contact US",
  //   benefitList: [
  //     {
  //       main: (
  //         <>
  //           <b>50</b> class uploads per month
  //         </>
  //       ),
  //     },
  //     {
  //       main: (
  //         <>
  //           <b>500</b> class sales per month (keep <b>100%</b>)
  //         </>
  //       ),
  //       secondary: "Keep 80% of the sales after the first 500",
  //     },
  //     {
  //       main: (
  //         <>
  //           <b>500</b> review sales per month (keep <b>100%</b>)
  //         </>
  //       ),
  //       secondary: "Keep 80% of the sales after the first 500",
  //     },
  //     {
  //       main: "Email and phone support",
  //       secondary: "1-2 day turn around time",
  //     },
  //   ],
  // },
];

export const Pricing = () => {
  return (
    <section id="pricing" className="container py-24 sm:py-32">
      <div className="flex  flex-col items-center">
        <h2 className="text-center text-3xl font-bold md:text-4xl">
          {`We're in`}
          <span className="bg-gradient-to-b from-primary/60 to-primary bg-clip-text text-transparent">
            {" "}
            Beta!
          </span>
        </h2>
        <p className="max-w-[800px] pt-4 text-center text-lg">
          {`We're looking for instructors to join our beta program. You'll
          have access to all features for free and keep 100% of your sales
          during the beta period.`}
        </p>
        <Link
          target="_blank"
          href="/sign-in?return_path=/app/instructor/profile"
        >
          <Button className="mt-4 w-[240px]">{`I'm interested!`}</Button>
        </Link>
        <EarningCalculator isBeta />
      </div>
      {false && (
        <>
          {" "}
          <h2 className="text-center text-3xl font-bold md:text-4xl">
            Pricing for
            <span className="bg-gradient-to-b from-primary/60 to-primary bg-clip-text text-transparent">
              {" "}
              Instructors{" "}
            </span>
          </h2>
          <h3 className="pt-4 text-center text-xl text-muted-foreground">
            Start teaching and earning today!
          </h3>
          <p className="pb-8 pt-2 text-center text-sm text-muted-foreground ">
            We use stripe for processing transactions. Every sale is subject to
            stripe fees.{" "}
            <Link target="_blank" href="https://stripe.com/pricing">
              <span className="text-primary hover:font-semibold hover:underline">
                Learn more.
              </span>
            </Link>
          </p>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {pricingList.map((pricing: PricingProps) => (
              <Card
                key={pricing.title}
                className={
                  pricing.popular === PopularPlanType.YES
                    ? "shadow-black/10 drop-shadow-xl dark:shadow-white/10"
                    : ""
                }
              >
                <CardHeader>
                  <CardTitle className="item-center flex justify-between">
                    {pricing.title}
                    {pricing.popular === PopularPlanType.YES ? (
                      <Badge
                        variant="secondary"
                        className="text-sm text-primary"
                      >
                        Most popular
                      </Badge>
                    ) : null}
                  </CardTitle>
                  <div>
                    <span className="text-3xl font-bold">${pricing.price}</span>
                    <span className="text-muted-foreground"> /month</span>
                  </div>

                  <CardDescription>{pricing.description}</CardDescription>
                </CardHeader>

                <CardContent>
                  <Link
                    target="_blank"
                    href="/sign-up?return_path=/app/instructor/billing"
                  >
                    <Button className="w-full rounded-full">
                      {pricing.buttonText}
                    </Button>
                  </Link>
                </CardContent>

                <hr className="m-auto mb-4 w-4/5" />

                <CardFooter className="flex">
                  <div className="space-y-4">
                    {pricing.benefitList.map((benefit) => (
                      <div key={benefit.main}>
                        <span className="flex">
                          <Check className="text-green-500" />{" "}
                          <h3 className="ml-2">{benefit.main}</h3>
                        </span>
                        <p className="ml-8 text-xs text-muted-foreground">
                          {benefit.secondary}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
          <EarningCalculator />
        </>
      )}
    </section>
  );
};
