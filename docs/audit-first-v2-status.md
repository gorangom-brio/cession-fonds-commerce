# État V2 — Tunnel audit-first

## Positionnement produit

- Plateforme d'audit IA de dossiers de cession de fonds de commerce.
- Le **rapport d'audit** est le lead magnet principal : visible à l'écran, téléchargeable en PDF après capture email.
- La **validation avocat** est la conversion principale : l'utilisateur est orienté vers un professionnel après avoir pris conscience des points d'attention.
- La **génération d'actes** (compromis, protocole) est prévue en second temps, après validation du modèle.

---

## Parcours actuellement fonctionnel

```
/                                 Landing + CTA "Commencer ma cession"
/dossiers/new                     Création d'un dossier (cession Supabase réelle)
/dossiers/[id]                    Dashboard du dossier + stepper
/dossiers/[id]/documents          Upload réel des documents (Supabase Storage)
/dossiers/[id]/audit              Audit enrichi avec les documents réellement déposés
/dossiers/[id]/rapport            Rapport structuré + capture email + lead persisté
/dossiers/[id]/validation-avocat  Demande de validation avocat (simulée)
```

Le stepper de progression (`DossierStepper`) est affiché sur toutes les pages du dossier avec l'étape active visuellement distinguée.

Le tunnel fonctionne en **deux modes** :
- **Mode démo** : identifiant non UUID (`demo-{timestamp}`) — aucun appel Supabase, tout reste local.
- **Mode réel** : identifiant UUID Supabase — toutes les fonctionnalités réelles sont actives.

---

## Ce qui est réel aujourd'hui

- Navigation complète du tunnel, sans erreur.
- **Création d'une cession** en base Supabase depuis `/dossiers/new`.
- **Upload réel des documents** dans le bucket Supabase Storage `documents`.
- **Insertion des métadonnées** dans la table `documents` (nom, taille, chemin storage).
- **Classification légère par nom de fichier** : `type_document` enregistré en base pour chaque document uploadé (sans lecture PDF, sans IA).
- **Affichage enrichi à l'audit** : section "Pièces réellement déposées" avec libellés lisibles des types détectés.
- **Capture lead rapport PDF** : nom, email, rôle, consentements enregistrés dans la table `report_leads`.
- Stepper de progression sur toutes les pages `[id]/*`.

---

## Ce qui reste simulé

| Fonctionnalité | État |
|---|---|
| Lecture réelle du contenu PDF | Non branchée |
| Extraction juridique des documents | Non branchée |
| Audit juridique structuré | Simulé — checklist et statuts fixes |
| Génération PDF du rapport | Non implémentée |
| Envoi email | Non branché |
| Validation avocat réelle | Simulée |
| Génération d'actes (compromis, protocole) | Hors périmètre V2 |

---

## Décisions structurantes déjà prises

- **Audit-first** : l'utilisateur dépose ses documents et reçoit un audit avant tout engagement.
- **Rapport PDF comme lead magnet** : l'email est capturé au moment du téléchargement du rapport.
- **Validation avocat comme conversion principale** : l'utilisateur est orienté vers un professionnel après l'audit.
- **Génération d'actes en second temps** : uniquement après validation du modèle de conversion.
- **Pas d'IA tant que la chaîne documentaire n'est pas stabilisée** : classification légère d'abord, extraction PDF ensuite, puis analyse juridique.

---

## Prochaines étapes recommandées

| Mission | Objectif |
|---|---|
| V2-16 | Lecture PDF / extraction de texte brut |
| V2-17 | Classification confirmée par contenu (renforcement heuristique ou IA légère) |
| V2-18 | Audit juridique structuré à partir des documents réels |
| V2-19 | Persistance structurée de l'audit (table `analyses` ou champs enrichis sur `cessions`) |
| V2-20 | Génération PDF du rapport d'audit |
| V2-21 | Validation avocat réelle (email ou webhook) |

---

## Hors périmètre actuel (explicitement)

- Paiement (Stripe ou autre)
- Signature électronique
- Génération d'actes (compromis, protocole de cession)
- Marketplace avocat
- Workflow multi-utilisateurs / auth

---

## Répertoire et branche de référence

- **Répertoire de travail** : `/Users/ngom/dev/cession-fonds-commerce-git`
- **Branche de référence** : `codex/v2-audit-first`
- **Node** : 20 recommandé
- **Éviter** : Desktop / iCloud Drive (problèmes de synchronisation observés)
- **Stack** : Next.js 15 App Router, TypeScript strict, Tailwind CSS, Supabase (partiellement branché), Anthropic Claude API (non branché V2)
