import Link from "next/link";
import { ArrowRight, CheckCircle, FileText, Scale } from "lucide-react";

export default function Home() {
  const steps = [
    {
      title: "1. Créez un dossier",
      description:
        "Ouvrez un dossier de cession et centralisez les pièces du vendeur ou de l'acquéreur.",
      icon: FileText,
    },
    {
      title: "2. Déposez vos documents",
      description:
        "Ajoutez bail commercial, Kbis, bilans, pièces fiscales, contrats utiles et compromis s'il existe.",
      icon: FileText,
    },
    {
      title: "3. Lancez l'audit",
      description:
        "La plateforme classe les pièces, signale les manques, remonte les points d'attention et prépare un rapport lisible.",
      icon: CheckCircle,
    },
    {
      title: "4. Faites valider si besoin",
      description:
        "Le rapport d'audit peut ensuite servir de base à une validation par avocat avant toute génération d'actes.",
      icon: Scale,
    },
  ];

  const deliverables = [
    "Checklist documentaire du dossier",
    "Synthèse claire des pièces analysées",
    "Risques et points d'attention identifiés",
    "Rapport d'audit exploitable pour un avocat",
  ];

  return (
    <div className="space-y-16 py-12">
      <section className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
        <div className="space-y-8">
          <div className="space-y-5 max-w-4xl">
            <span className="inline-flex items-center rounded-full bg-navy-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-navy-700">
              Audit-first V2
            </span>
            <h1 className="text-5xl font-bold text-navy-900 leading-tight">
              Auditez votre dossier de cession de fonds de commerce avant de signer
            </h1>
            <p className="text-xl text-muted-foreground">
              Identifiez les pièces manquantes, les risques et les points
              d'attention avant d'aller plus loin. Puis faites valider votre
              dossier par un avocat si nécessaire.
            </p>
            <div className="disclaimer">
              <strong>Positionnement V2 :</strong> le produit commence par
              l'audit du dossier. La génération d'actes vient dans un second
              temps, une fois le dossier clarifié.
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/dossiers/new"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-navy-700 text-white rounded-lg font-semibold text-lg hover:bg-navy-800 transition-colors shadow-lg hover:shadow-xl"
            >
              Faire auditer mon dossier
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/#comment-ca-marche"
              className="btn-secondary px-8 py-4 text-lg"
            >
              Voir comment ça marche
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-gradient-to-br from-white to-navy-50 p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-navy-700">
            Ce que l'audit V2 prépare
          </p>
          <div className="mt-5 space-y-4">
            {deliverables.map((item) => (
              <div
                key={item}
                className="flex items-start gap-3 rounded-lg border border-border bg-white p-4"
              >
                <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-confidence-high" />
                <p className="text-sm text-navy-900">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="comment-ca-marche" className="space-y-10 scroll-mt-24">
        <div className="max-w-3xl space-y-3">
          <h2 className="text-3xl font-bold text-navy-900">Comment ça marche</h2>
          <p className="text-muted-foreground">
            Le MVP V2 est centré sur le parcours dossier → upload → audit →
            rapport → validation avocat.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          {steps.map(({ title, description, icon: Icon }) => (
            <div
              key={title}
              className="bg-white border border-border rounded-lg p-6 space-y-4"
            >
              <div className="w-12 h-12 bg-navy-50 rounded-lg flex items-center justify-center">
                <Icon className="w-6 h-6 text-navy-700" />
              </div>
              <h3 className="font-semibold text-navy-900">{title}</h3>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-white p-8 space-y-4">
          <h2 className="text-2xl font-bold text-navy-900">
            Ce que le MVP V2 inclut
          </h2>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li>Classification des documents du dossier</li>
            <li>Checklist des pièces présentes et manquantes</li>
            <li>Synthèse du dossier et premiers signaux de risque</li>
            <li>Rapport d'audit lisible pour l'utilisateur et pour un avocat</li>
          </ul>
        </div>

        <div className="rounded-lg border border-border bg-gray-50 p-8 space-y-4">
          <h2 className="text-2xl font-bold text-navy-900">
            Ce qui est volontairement laissé de côté
          </h2>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li>Génération complète d'offres, compromis et actes</li>
            <li>Marketplace avocat et workflow cabinet avancé</li>
            <li>Signature électronique et paiement</li>
            <li>Automatisations IA génératives complexes branchées trop tôt</li>
          </ul>
        </div>
      </section>

      <section className="space-y-8 bg-gray-50 rounded-lg p-8">
        <h2 className="text-3xl font-bold text-navy-900">Questions fréquentes</h2>

        <div className="space-y-6">
          <div className="space-y-2">
            <h3 className="font-semibold text-navy-900">
              Est-ce que ça remplace un avocat ?
            </h3>
            <p className="text-muted-foreground">
              Non. Le rôle du produit V2 est d'auditer le dossier et de le
              structurer, puis de faciliter une validation par avocat si besoin.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-navy-900">
              Quels documents dois-je déposer ?
            </h3>
            <p className="text-muted-foreground">
              Bail commercial, Kbis, bilans, pièces fiscales, contrats utiles,
              et compromis s'il existe déjà. Le dossier peut commencer
              incomplet.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-navy-900">
              Que se passe-t-il après l'audit ?
            </h3>
            <p className="text-muted-foreground">
              Vous obtenez une synthèse, une checklist et un rapport. La
              génération d'actes viendra ensuite dans un second temps du
              produit.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-navy-700 text-white rounded-lg p-12 text-center space-y-6">
        <h2 className="text-3xl font-bold text-white">Prêt à auditer un dossier ?</h2>
        <p className="text-lg text-navy-100 max-w-2xl mx-auto">
          Posez une base saine pour la V2: un dossier clair, des documents bien
          classés, un audit lisible et une porte d'entrée naturelle vers la
          validation avocat.
        </p>
        <Link
          href="/dossiers/new"
          className="inline-flex items-center gap-2 px-8 py-4 bg-white text-navy-700 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-colors"
        >
          Faire auditer mon dossier
          <ArrowRight className="w-5 h-5" />
        </Link>
      </section>
    </div>
  );
}
