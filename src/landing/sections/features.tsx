import { Clock, Palette, Wand2 } from "lucide-react";

const features = [
  {
    name: "Automated Design Creation",
    description:
      "Turn your class schedules into beautiful Instagram-ready designs automatically. Choose from professionally designed templates or create your own.",
    icon: <Palette className="h-5 w-5 text-primary" />,
  },
  {
    name: "Smart Scheduling",
    description:
      "Schedule your posts in advance and let our system handle the publishing. Keep your feed consistent without the daily hassle.",
    icon: <Clock className="h-5 w-5 text-primary" />,
  },
  {
    name: "Seamless Integration",
    description:
      "Connect with Mindbody, Pike13, Google Drive, and Instagram. Import your schedules and media, then publish with a single click.",
    icon: <Wand2 className="h-5 w-5 text-primary" />,
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Everything You Need to Showcase Your Classes
          </h2>
          <p className="mt-6 text-lg leading-8 text-muted-foreground">
            Seamlessly integrate with your existing tools and automate your social media workflow.
          </p>
        </div>
        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
          <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.name} className="flex flex-col">
                <dt className="flex items-center gap-x-3 text-lg font-semibold leading-7">
                  {feature.icon}
                  {feature.name}
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-muted-foreground">
                  <p className="flex-auto">{feature.description}</p>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
