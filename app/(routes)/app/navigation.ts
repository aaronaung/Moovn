import { PhotoIcon, RectangleStackIcon, RocketLaunchIcon } from "@heroicons/react/24/outline";
import { CircleStackIcon } from "@heroicons/react/24/outline";

export const appSidebarNavigation = [
  {
    name: "Sources",
    icon: CircleStackIcon,
    href: "/app/sources",
  },
  {
    name: "Templates",
    icon: RectangleStackIcon,
    href: "/app/templates",
  },
  {
    name: "Destinations",
    icon: RocketLaunchIcon,
    href: "/app/destinations",
  },
  {
    name: "Content",
    icon: PhotoIcon,
    href: "/app/content",
  },
];

export const userNavigation = [{ name: "Sign out", href: "#" }];
