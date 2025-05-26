import { ReactNode } from "react";

interface LayoutProps {
  children: ReactNode;
}

export default function HandleLayout({ children }: LayoutProps) {
  return <div className="min-h-screen bg-background">{children}</div>;
}
