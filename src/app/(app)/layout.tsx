import { Suspense } from "react";
import { Nav } from "@/components/Nav";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="min-h-dvh md:pl-56">
      <Suspense>
        <Nav />
      </Suspense>
      <main className="mx-auto w-full max-w-3xl px-4 pb-28 pt-6 md:px-8 md:pb-12 md:pt-10">{children}</main>
    </div>
  );
}
