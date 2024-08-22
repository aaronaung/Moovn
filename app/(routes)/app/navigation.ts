import { CalendarIcon, RectangleStackIcon, RocketLaunchIcon } from "@heroicons/react/24/outline";
import { CircleStackIcon } from "@heroicons/react/24/outline";

export const appSidebarNavigation = [
  {
    name: "Calendar",
    icon: CalendarIcon,
    href: "/app/calendar",
  },
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
];

export const userNavigation = [{ name: "Sign out", href: "#" }];
