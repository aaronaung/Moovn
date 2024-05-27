import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";

interface FeatureProps {
  title: string;
  description: string;
  image: string;
}

const features: FeatureProps[] = [
  {
    title: "Instructor landing page",
    description:
      "Every instructor gets a public landing page with social links and classes for their audience to purchase.",
    image: "/reflecting.png",
  },
  {
    title: "Upload classes",
    description:
      "Instructors have access to the Admin app where they can upload classes, set pricing, and list classes for sale.",
    image: "/looking-ahead.png",
  },
  {
    title: "Manage reviews",
    description:
      "Instructors can provide personalized video feedback to their students' review requests.",
    image: "/growth.png",
  },
  {
    title: "Buy once, own forever",
    description: "Students have access to the classes they purchase forever.",
    image: "/looking-ahead.png",
  },
  {
    title: "Learn effectively",
    description:
      "Students have access to learning tools to help them learn effectively.",
    image: "/looking-ahead.png",
  },
  {
    title: "Submit review requests",
    description:
      "Students can submit review requests to their instructors for personalized video feedback.",
    image: "/looking-ahead.png",
  },
];

export const Features = () => {
  return (
    <section id="features" className="container space-y-8 py-24 sm:py-32">
      <h2 className="text-3xl font-bold md:text-center lg:text-4xl">
        Everything you need to{" "}
        <span className="bg-gradient-to-b from-primary/60 to-primary bg-clip-text text-transparent">
          Teach and Learn{" "}
        </span>
        dance
      </h2>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {features.map(({ title, description, image }: FeatureProps) => (
          <Card key={title}>
            <CardHeader>
              <CardTitle>{title}</CardTitle>
            </CardHeader>

            <CardContent>{description}</CardContent>

            {/* <CardFooter>
              <img
                src={image}
                alt="About feature"
                className="mx-auto w-[200px] lg:w-[300px]"
              />
            </CardFooter> */}
          </Card>
        ))}
      </div>
    </section>
  );
};
