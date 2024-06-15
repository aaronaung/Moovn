import { PhotoIcon, RocketLaunchIcon } from "@heroicons/react/24/outline";
import { CircleStackIcon } from "@heroicons/react/24/outline";

export const appSidebarNavigation = [
  {
    name: "Sources",
    icon: CircleStackIcon,
    href: "/app/sources",
  },
  {
    name: "Destinations",
    icon: RocketLaunchIcon,
    href: "/app/destinations",
  },
  {
    name: "Designs",
    icon: PhotoIcon,
    href: "/app/designs",
  },
];

export const userNavigation = [{ name: "Sign out", href: "#" }];
