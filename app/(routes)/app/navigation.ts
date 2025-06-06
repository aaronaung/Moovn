import {
  BuildingOffice2Icon,
  UserGroupIcon,
  UserIcon,
  BuildingStorefrontIcon,
  RocketLaunchIcon,
  RectangleStackIcon,
} from "@heroicons/react/24/outline";
import { Tables } from "@/types/db";
import { CalendarIcon } from "lucide-react";

export const getAppSidebarNavigation = (user: Tables<"users"> | null) => {
  if (!user) return [];

  const baseNavigation = [
    {
      name: "Profile",
      icon: UserIcon,
      href: "/app/profile",
    },
  ];

  if (user.type === "studio") {
    return [
      {
        name: "Studios",
        icon: BuildingOffice2Icon,
        href: "/app/sources",
      },
      {
        name: "Instructors",
        icon: UserGroupIcon,
        href: "/app/instructors",
      },
      ...baseNavigation,
    ];
  } else if (user.type === "instructor") {
    return [
      {
        name: "My Studios",
        icon: BuildingStorefrontIcon,
        href: "/app/my-studios",
      },
      ...baseNavigation,
    ];
  }

  return baseNavigation;
};

// Legacy export for backward compatibility
export const appSidebarNavigation = [
  {
    name: "Calendar",
    icon: CalendarIcon,
    href: "/app/calendar",
  },
  {
    name: "Studios",
    icon: BuildingOffice2Icon,
    href: "/app/sources",
  },
  {
    name: "Instructors",
    icon: UserGroupIcon,
    href: "/app/instructors",
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
    name: "Profile",
    icon: UserIcon,
    href: "/app/profile",
  },
];

export const userNavigation = [{ name: "Sign out", href: "#" }];
