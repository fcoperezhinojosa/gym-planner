import type { Metadata } from "next";
import { AuthForm } from "@/components/AuthForm";
import { Card } from "@/components/ui";

export const metadata: Metadata = { title: "Crear cuenta" };

export default function Page() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-3">
          <img src="/icon.svg" alt="" className="h-10 w-10" />
          <div>
            <h1 className="text-xl font-bold">Gym Planner</h1>
            <p className="text-sm text-muted">Crear cuenta</p>
          </div>
        </div>
        <Card className="p-5">
          <AuthForm mode="register" />
        </Card>
      </div>
    </main>
  );
}
