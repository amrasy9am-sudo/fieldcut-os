import type { Metadata } from "next";
import { Suspense } from "react";
import { Sidebar, SidebarFrame } from "@/components/console/sidebar";

export const metadata: Metadata = { title: "Console · Fieldcut", robots: { index: false } };

export default function ConsoleLayout({ children }: LayoutProps<"/console">) {
  return (
    <div className="flex min-h-screen flex-col bg-oat lg:flex-row">
      <Suspense fallback={<SidebarFrame path={null} />}>
        <Sidebar />
      </Suspense>
      <div className="min-w-0 flex-1 p-5 lg:p-8">{children}</div>
    </div>
  );
}
