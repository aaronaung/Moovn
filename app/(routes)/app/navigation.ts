import { DocumentIcon, NewspaperIcon } from "@heroicons/react/24/outline";
import { CircleStackIcon } from "@heroicons/react/24/outline";

export const appSidebarNavigation = [
  {
    name: "Data sources",
    icon: CircleStackIcon,
    href: "/app/sources",
  },
  {
    name: "Design templates",
    icon: DocumentIcon,
    href: "/app/templates",
  },
  {
    name: "Designs",
    icon: NewspaperIcon,
    href: "/app/designs",
  },
];

export const userNavigation = [{ name: "Sign out", href: "#" }];
