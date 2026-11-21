import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { LoaderPreview } from "./LoaderPreview";

export const metadata: Metadata = { title: "Propuestas de carga" };

// Página temporal para comparar las propuestas de pantalla de carga.
export default function Page() {
  return (
    <>
      <PageHeader title="Pantalla de carga" subtitle="Tres propuestas para la primera vez que entras" />
      <LoaderPreview />
    </>
  );
}
