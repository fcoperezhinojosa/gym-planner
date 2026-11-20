import type { Metadata } from "next";
import { BootRedirect } from "@/components/BootRedirect";

export const metadata: Metadata = {
  title: "Cargando sesión",
  robots: { index: false, follow: false },
};

export default function BootPage() {
  return <BootRedirect />;
}
