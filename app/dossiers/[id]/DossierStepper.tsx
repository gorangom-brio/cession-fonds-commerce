"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type DossierStepperProps = { id: string };

const ETAPES = [
  { label: "Documents", segment: "documents" },
  { label: "Audit", segment: "audit" },
  { label: "Rapport", segment: "rapport" },
  { label: "Validation avocat", segment: "validation-avocat" },
] as const;

export default function DossierStepper({ id }: DossierStepperProps) {
  const pathname = usePathname();
  const segment = pathname.split("/").pop() ?? "";
  const activeIndex = ETAPES.findIndex((e) => e.segment === segment);

  return (
    <nav aria-label="Progression du dossier">
      <ol className="flex items-center">
        {ETAPES.map((etape, index) => {
          const isActive = etape.segment === segment;
          const isDone = activeIndex > index;
          const isLast = index === ETAPES.length - 1;

          return (
            <li key={etape.segment} className="flex items-center flex-1 last:flex-none">
              <Link
                href={`/dossiers/${id}/${etape.segment}`}
                className="flex items-center gap-2 group"
                aria-current={isActive ? "step" : undefined}
              >
                <span
                  className={[
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors",
                    isActive
                      ? "border-navy-700 bg-navy-700 text-white"
                      : isDone
                      ? "border-confidence-high bg-confidence-high/10 text-confidence-high"
                      : "border-border bg-white text-muted-foreground group-hover:border-navy-700 group-hover:text-navy-700",
                  ].join(" ")}
                >
                  {isDone ? "✓" : index + 1}
                </span>
                <span
                  className={[
                    "hidden text-sm font-medium sm:block transition-colors",
                    isActive
                      ? "text-navy-900"
                      : isDone
                      ? "text-confidence-high"
                      : "text-muted-foreground group-hover:text-navy-700",
                  ].join(" ")}
                >
                  {etape.label}
                </span>
              </Link>
              {!isLast && (
                <div
                  className={[
                    "mx-2 h-px flex-1",
                    isDone ? "bg-confidence-high" : "bg-border",
                  ].join(" ")}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
