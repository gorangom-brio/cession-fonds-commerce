"use client";

import Link from "next/link";
import { ArrowRight, FileText, CheckCircle, MessageSquare } from "lucide-react";

export default function Home() {
  return (
    <div className="space-y-16 py-12">
      {/* Hero Section */}
      <section className="space-y-8">
        <div className="max-w-3xl">
          <h1 className="text-5xl font-bold text-navy-900 leading-tight mb-6">
            Préparez votre cession de fonds de commerce en quelques clics
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Cession Fonds Commerce est une application simple et sécurisée qui
            vous guide pas à pas pour préparer votre dossier de cession. 
            <strong className="block mt-2 text-navy-900">
              De vos documents PDF à un projet de contrat professionnel, en 10 minutes.
            </strong>
          </p>
          <div className="disclaimer">
            <strong>⚠️ Important :</strong> Cet outil est une aide à la rédaction.
            Les documents générés ne remplacent pas le conseil d'un avocat ou
            d'un notaire. Toute cession doit être validée par un professionnel
            du droit avant signature.
          </div>
        </div>

        {/* CTA Button */}
        <div>
          <Link
            href="/upload"
            className="inline-flex items-center gap-2 px-8 py-4 bg-navy-700 text-white rounded-lg font-semibold text-lg hover:bg-navy-800 transition-colors shadow-lg hover:shadow-xl"
          >
            Commencer ma cession
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* How It Works */}
      <section className="space-y-12">
        <h2 className="text-3xl font-bold text-navy-900">
          Comment ça marche ?
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Step 1 */}
          <div className="bg-white border border-border rounded-lg p-6 space-y-4">
            <div className="w-12 h-12 bg-navy-50 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-navy-700" />
            </div>
            <h3 className="font-semibold text-navy-900">1. Uploadez vos docs</h3>
            <p className="text-sm text-muted-foreground">
              Bilan comptable, bail commercial, Kbis, statuts... Glissez-les dans
              la zone de dépôt.
            </p>
          </div>

          {/* Step 2 */}
          <div className="bg-white border border-border rounded-lg p-6 space-y-4">
            <div className="w-12 h-12 bg-navy-50 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-navy-700" />
            </div>
            <h3 className="font-semibold text-navy-900">2. IA analyse tout</h3>
            <p className="text-sm text-muted-foreground">
              Notre IA Claude extrait automatiquement les informations clés :
              montants, dates, parties...
            </p>
          </div>

          {/* Step 3 */}
          <div className="bg-white border border-border rounded-lg p-6 space-y-4">
            <div className="w-12 h-12 bg-navy-50 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-navy-700" />
            </div>
            <h3 className="font-semibold text-navy-900">3. Vérifiez & corrigez</h3>
            <p className="text-sm text-muted-foreground">
              Vérifiez chaque champ. L'IA vous indique son niveau de confiance
              (vert/orange/rouge).
            </p>
          </div>

          {/* Step 4 */}
          <div className="bg-white border border-border rounded-lg p-6 space-y-4">
            <div className="w-12 h-12 bg-navy-50 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-navy-700" />
            </div>
            <h3 className="font-semibold text-navy-900">4. Générez le contrat</h3>
            <p className="text-sm text-muted-foreground">
              Obtenez un PDF professionnel avec toutes les clauses légales. À
              faire valider par votre avocat.
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="space-y-12">
        <h2 className="text-3xl font-bold text-navy-900">Nos avantages</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-3">
            <h3 className="font-semibold text-navy-900">⚡ Rapide</h3>
            <p className="text-muted-foreground">
              Préparation complète en moins de 15 minutes. Pas de formulaire
              compliqué.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-navy-900">🔒 Sécurisé</h3>
            <p className="text-muted-foreground">
              Vos données sont chiffrées. Aucun document n'est partagé sans votre
              accord.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-navy-900">👨‍⚖️ Professionnel</h3>
            <p className="text-muted-foreground">
              Contrat généré selon les normes françaises. Disclaimer juridique
              obligatoire inclus.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-navy-900">💬 IA explicite</h3>
            <p className="text-muted-foreground">
              L'IA explique ses détections et son niveau de confiance. Zéro
              boîte noire.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-navy-900">📧 Validation avocat</h3>
            <p className="text-muted-foreground">
              Envoyez votre dossier directement à votre avocat pour relecture
              finale.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-navy-900">📱 Responsive</h3>
            <p className="text-muted-foreground">
              Fonctionne sur téléphone, tablette, ordinateur. À votre rythme.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Preview */}
      <section className="space-y-8 bg-gray-50 rounded-lg p-8">
        <h2 className="text-3xl font-bold text-navy-900">Questions fréquentes</h2>

        <div className="space-y-6">
          <div className="space-y-2">
            <h3 className="font-semibold text-navy-900">
              Est-ce que ça remplace un avocat ?
            </h3>
            <p className="text-muted-foreground">
              Non. Cet outil prépare votre dossier. Un professionnel du droit
              doit toujours valider avant signature.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-navy-900">
              Mes documents sont-ils sécurisés ?
            </h3>
            <p className="text-muted-foreground">
              Oui. Chiffrement at-rest sur Supabase. Aucun document n'est
              conservé au-delà de votre session sans consentement.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-navy-900">Combien ça coûte ?</h3>
            <p className="text-muted-foreground">
              C'est gratuit pour le MVP. La version finalisée aura un tarif
              abordable (à venir).
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-navy-900">
              Quels documents dois-je uploader ?
            </h3>
            <p className="text-muted-foreground">
              Idéalement : Kbis du fonds, bail commercial, 3 derniers bilans,
              statuts, extrait SIRENE. Vous serez guidé.
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-navy-700 text-white rounded-lg p-12 text-center space-y-6">
        <h2 className="text-3xl font-bold">Prêt à commencer ?</h2>
        <p className="text-lg text-navy-100 max-w-2xl mx-auto">
          Préparez votre cession en quelques minutes. Pas de carte bancaire
          requise.
        </p>
        <Link
          href="/upload"
          className="inline-flex items-center gap-2 px-8 py-4 bg-white text-navy-700 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-colors"
        >
          Commencer ma cession
          <ArrowRight className="w-5 h-5" />
        </Link>
      </section>
    </div>
  );
}
