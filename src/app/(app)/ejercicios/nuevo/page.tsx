import type { Metadata } from "next";
import Link from "next/link";
import { CustomExerciseForm } from "@/components/CustomExerciseForm";
import { Card, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Nuevo ejercicio" };

export default function NewExercisePage() {
  return (
    <div>
      <Link href="/ejercicios" className="mb-3 inline-block text-sm text-muted hover:text-fg">← Ejercicios</Link>
      <PageHeader title="Ejercicio propio" subtitle="Para máquinas de tu gimnasio que no estén en el catálogo." />
      <Card className="p-4"><CustomExerciseForm /></Card>
    </div>
  );
}
