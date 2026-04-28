import Link from "next/link";

type DossierDashboardPageProps = {
  params: Promise<{ id: string }>;
};

export default async function DossierDashboardPage({
  params,
}: DossierDashboardPageProps) {
  const { id } = await params;

  const links = [
    {
      href: `/dossiers/${id}/documents`,
      title: "Documents",
      description: "Déposer et organiser les pièces du dossier.",
    },
    {
      href: `/dossiers/${id}/audit`,
      title: "Audit",
      description: "Lancer l'audit et consulter les premiers signaux.",
    },
    {
      href: `/dossiers/${id}/rapport`,
      title: "Rapport",
      description: "Lire la synthèse, les manques et les recommandations.",
    },
    {
      href: `/dossiers/${id}/validation-avocat`,
      title: "Validation avocat",
      description: "Préparer la transmission du dossier à un professionnel.",
    },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="space-y-3">
        <p className="text-sm font-medium text-navy-700">Dossier {id}</p>
        <h1 className="text-4xl font-bold text-navy-900">
          Tableau de bord du dossier
        </h1>
        <p className="max-w-3xl text-lg text-muted-foreground">
          Vue d&apos;ensemble du dossier d&apos;audit. Cette page servira de
          point d&apos;entrée principal du parcours V2.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-border bg-white p-5 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-navy-600">
            Statut
          </p>
          <p className="text-lg font-semibold text-navy-900">Brouillon audit</p>
          <p className="text-sm text-muted-foreground">
            Dossier créé, analyse non lancée.
          </p>
        </div>
        <div className="rounded-lg border border-border bg-white p-5 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-navy-600">
            Documents
          </p>
          <p className="text-lg font-semibold text-navy-900">À compléter</p>
          <p className="text-sm text-muted-foreground">
            Bail, Kbis, bilans, pièces fiscales, contrats utiles.
          </p>
        </div>
        <div className="rounded-lg border border-border bg-white p-5 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-navy-600">
            Audit
          </p>
          <p className="text-lg font-semibold text-navy-900">Non lancé</p>
          <p className="text-sm text-muted-foreground">
            Classification, checklist et risques à venir.
          </p>
        </div>
        <div className="rounded-lg border border-border bg-white p-5 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-navy-600">
            Validation avocat
          </p>
          <p className="text-lg font-semibold text-navy-900">Non demandée</p>
          <p className="text-sm text-muted-foreground">
            Le rapport pourra servir de support de transmission.
          </p>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-gray-50 p-6 space-y-4">
        <h2 className="text-xl font-semibold text-navy-900">Prochaines étapes</h2>
        <ol className="space-y-2 text-sm text-muted-foreground">
          <li>1. Déposer les documents utiles dans le dossier</li>
          <li>2. Lancer l&apos;audit documentaire</li>
          <li>3. Générer un rapport d&apos;audit lisible</li>
          <li>4. Demander une validation avocat si nécessaire</li>
        </ol>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="block rounded-lg border border-border bg-white p-6 transition-colors hover:border-navy-700 cursor-pointer"
          >
            <p className="text-lg font-semibold text-navy-900">{link.title}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {link.description}
            </p>
          </Link>
        ))}
      </section>
    </div>
  );
}
