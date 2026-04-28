# État V2 — Tunnel audit-first

## Positionnement produit

- Plateforme d'audit IA de dossiers de cession de fonds de commerce.
- Le **rapport d'audit** est le lead magnet principal : visible à l'écran, téléchargeable en PDF après capture email.
- La **validation avocat** est la conversion principale : l'utilisateur est orienté vers un professionnel après avoir pris conscience des points d'attention.
- La **génération d'actes** (compromis, protocole) est prévue en second temps, après validation du modèle.

---

## Parcours actuellement fonctionnel

```
/                               Landing + CTA "Commencer ma cession"
/dossiers/new                   Création d'un dossier (nom + contexte)
/dossiers/[id]                  Dashboard du dossier + stepper
/dossiers/[id]/documents        Sélection locale de documents
/dossiers/[id]/audit            Checklist audit simulée + points d'attention
/dossiers/[id]/rapport          Rapport simulé + capture email PDF
/dossiers/[id]/validation-avocat  Demande de validation avocat simulée
```

Le stepper de progression (`DossierStepper`) est affiché sur toutes les pages du dossier avec l'étape active visuellement distinguée.

---

## Ce qui est réel aujourd'hui

- Navigation complète du tunnel, sans erreur.
- Création locale d'un dossier démo (identifiant `demo-{timestamp}`).
- Sélection locale de documents (état React, aucun upload).
- Affichage d'un audit simulé (checklist, statuts, points d'attention, synthèse).
- Rapport simulé structuré (pièces analysées, manquantes, risques, recommandations).
- Capture email simulée avant remise du rapport PDF (nom, email, rôle, consentements).
- Demande de validation avocat simulée (formulaire + confirmation locale).
- Stepper de progression sur toutes les pages `[id]/*`.

---

## Ce qui est simulé (non branché)

| Fonctionnalité | État |
|---|---|
| Persistance des dossiers | Aucune — reset à chaque rechargement |
| Upload Supabase | Non branché |
| Analyse IA réelle | Non branchée |
| Génération PDF | Non implémentée |
| Envoi email | Non branché |
| Validation avocat réelle | Non branchée |
| Leads rapport PDF | Non persistés |

---

## Hors périmètre actuel (explicitement)

- Paiement (stripe ou autre)
- Signature électronique
- Génération d'actes (compromis, protocole de cession)
- Marketplace avocat
- Workflow multi-utilisateurs / auth

---

## Prochaines étapes recommandées

| Mission | Objectif |
|---|---|
| V2-10 | Persistance minimale des leads rapport PDF (Supabase ou fichier local) |
| V2-11 | Stockage réel des documents via Supabase Storage |
| V2-12 | Audit réel à partir des documents uploadés (appel Claude API) |
| V2-13 | Génération PDF du rapport d'audit |
| V2-14 | Demande de validation avocat réelle (email ou webhook) |

---

## Contraintes techniques

- **Node** : 20
- **Répertoire de travail** : `/Users/ngom/dev/cession-fonds-commerce-git`
- **Éviter** : Desktop / iCloud Drive (problèmes de synchronisation observés)
- **Branche de référence** : `codex/v2-audit-first`
- **Stack** : Next.js 15 App Router, TypeScript strict, Tailwind CSS, Supabase (non branché V2), Anthropic Claude API (non branché V2)
