import { MindbodyLogo } from "@/src/components/ui/icons/mindbody";
import { Pike13Logo } from "@/src/components/ui/icons/pike13";
import { InstagramIcon } from "@/src/components/ui/icons/instagram";
import { GoogleDriveIcon } from "@/src/components/ui/icons/google";

const integrations = [
  {
    name: "Mindbody",
    description: "Import your class schedules and instructor data directly from Mindbody.",
    icon: <MindbodyLogo className="h-12" />,
  },
  {
    name: "Pike13",
    description: "Seamlessly connect with Pike13 to access your studio's schedule.",
    icon: <Pike13Logo />,
  },
  {
    name: "Instagram",
    description: "Publish your designs directly to Instagram as posts or stories.",
    icon: <InstagramIcon className="h-12 w-12" />,
  },
  {
    name: "Google Drive",
    description: "Access and use media from your Google Drive in your designs.",
    icon: <GoogleDriveIcon className="h-12 w-12" />,
  },
];

export function IntegrationsSection() {
  return (
    <section id="integrations" className="bg-muted/50 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Works With Your Existing Tools
          </h2>
          <p className="mt-6 text-lg leading-8 text-muted-foreground">
            Seamlessly integrate with the platforms you already use. Import schedules from Mindbody
            and Pike13, media from Google Drive, and publish directly to Instagram.
          </p>
        </div>
        <div className="mx-auto mt-16 grid max-w-lg grid-cols-1 gap-8 sm:mt-20 sm:max-w-xl sm:grid-cols-2 lg:mx-0 lg:max-w-none lg:grid-cols-4">
          {integrations.map((integration) => (
            <div
              key={integration.name}
              className="flex flex-col items-center rounded-lg bg-card p-8 shadow-sm ring-1 ring-ring/5"
            >
              <div className="flex h-16 items-center">{integration.icon}</div>
              <h3 className="mt-6 text-lg font-semibold">{integration.name}</h3>
              <p className="mt-2 text-center text-sm text-muted-foreground">
                {integration.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
