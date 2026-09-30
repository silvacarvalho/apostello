"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import { PublicSchedule } from "@/components/escala-publica/public-schedule";

export default function EscalaPublicaIgrejaPage() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id, 10);

  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <PublicSchedule tipo="igreja" id={id} />
    </Suspense>
  );
}
