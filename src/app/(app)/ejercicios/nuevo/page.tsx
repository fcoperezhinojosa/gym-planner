import type { Metadata } from "next";
import { BackLink } from "@/components/BackLink";
import { CustomExerciseForm } from "@/components/CustomExerciseForm";
import { Card, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Nuevo ejercicio" };

export default function NewExercisePage() {
  return (
    <div>
      <BackLink href="/ejercicios" label="Ejercicios" className="mb-3" />
      <PageHeader title="Ejercicio propio" subtitle="Para máquinas de tu gimnasio que no estén en el catálogo." />
      <Card className="p-4"><CustomExerciseForm /></Card>
    </div>
  );
}
