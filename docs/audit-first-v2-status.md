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
/dossiers/[id]/audit              Audit enrichi — checklist calculée + extraction PDF + questionnaire
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
- **Extraction texte PDF** via `unpdf` — route API `POST /api/dossiers/[id]/extract-text`, déclenchée manuellement depuis la page audit.
- **Affichage des résultats d'extraction** dans la page audit : statut par document, nombre de caractères, extrait court.
- **Détection des PDF scannés** ou non extractibles : signalés lorsque `nb_caracteres_extraits = 0` après tentative réussie.
- **Persistance des métadonnées d'extraction** dans la table `documents` : `nb_caracteres_extraits`, `extraction_ok`, `analyse_effectuee`.
- **Référentiel documentaire métier** (`lib/document-requirements.ts`) : 23 pièces organisées par famille, priorité et phase — base de la checklist.
- **Checklist documentaire calculée** à partir des `type_document` réellement déposés, organisée en 3 phases et 4 niveaux de priorité.
- **Questionnaire de situation** dans la page audit : 5 questions facultatives permettant d'affiner la checklist selon le profil du dossier.
- **Adaptation dynamique de la checklist** en temps réel selon les réponses du questionnaire (pièces conditionnelles masquées ou affichées).
- **Persistance du questionnaire de situation** dans `cessions.situation_declaree` (colonne `jsonb`) — lecture côté serveur au chargement, sauvegarde silencieuse côté client avec debounce 800 ms.
- **Fallback localStorage** : si la sauvegarde Supabase échoue (réseau, RLS), les réponses sont conservées dans le navigateur sans bloquer l'interface.
- **Capture lead rapport PDF** : nom, email, rôle, consentements enregistrés dans la table `report_leads`.
- **Synthèse documentaire dans le rapport** (V2-26) : bouton opt-in qui appelle `/api/dossiers/[id]/structured-extraction` et affiche, en complément des blocs hardcodés, les informations détectées par document et des constats factuels (`information` / `attention` / `verification`). Aucune persistance, aucune IA, wording strictement indicatif.
- **Rapport téléchargeable / imprimable** (V2-27) : bouton "Télécharger / imprimer le rapport" qui appelle `window.print()` ; CSS print A4 minimale ; stepper, formulaire de capture et CTA masqués à l'impression. Wording de la capture lead reformulé : plus de promesse d'envoi par email — les coordonnées sont enregistrées, le rapport reste accessible sur la page.
- Stepper de progression sur toutes les pages `[id]/*`.

---

## Ce qui reste simulé

| Fonctionnalité | État |
|---|---|
| Extraction structurée des données juridiques | Non branchée — texte brut uniquement |
| Audit juridique réel | Non branché — checklist basée sur `type_document`, pas sur le contenu |
| Analyse IA / Anthropic | Non branchée |
| Génération PDF du rapport | Non implémentée |
| Envoi email | Non branché |
| Validation avocat réelle | Simulée |
| Génération d'actes (compromis, protocole) | Hors périmètre V2 |

---

## Chaîne documentaire actuelle

```
Upload fichier
    ↓
Stockage Supabase Storage (bucket documents)
    ↓
Insertion métadonnées en table documents (nom, taille, storage_path)
    ↓
Classification légère par nom de fichier → type_document enregistré
    ↓
[Manuel] Extraction texte PDF → nb_caracteres_extraits, extraction_ok persistés
    ↓
Référentiel documentaire métier (lib/document-requirements.ts)
    + Situation déclarée (cessions.situation_declaree)
    ↓
Checklist personnalisée calculée → organisée par phase et priorité
    ↓
Affichage audit : pièces présentes / manquantes / à vérifier / le cas échéant
```

---

## Référentiel documentaire métier

Fichier source : `lib/document-requirements.ts`

### Familles de pièces

| Famille | Contenu |
|---|---|
| `vendeur` | Kbis, statuts de la société venderesse |
| `acquereur` | Kbis, statuts, projet de statuts, pièce d'identité, financement |
| `fonds` | Actifs incorporels, licences et autorisations administratives |
| `comptable_financier` | Bilans, état des créances et dettes, inventaire stocks |
| `locatif` | Bail commercial, accord bailleur, quittances de loyer |
| `contrats` | Contrats fournisseurs, assurances, crédit-bail |
| `personnel` | Contrats de travail, bulletins de salaire |
| `fiscal` | Liasses fiscales, déclarations CET |
| `acte_cession` | Offre d'achat ou lettre d'intention |

### Priorités

| Priorité | Comportement dans la checklist |
|---|---|
| `indispensable` | Affiché "Manquant" si absent |
| `conditionnel` | Affiché "À vérifier" si absent (dépend de la situation déclarée) |
| `recommande` | Affiché "À vérifier" si absent |
| `le_cas_echeant` | Affiché "Le cas échéant" — non bloquant, signal informatif uniquement |

### Phases

| Phase | Moment dans la cession |
|---|---|
| `demarrage` | Pièces à réunir dès l'ouverture du dossier |
| `audit_complet` | Pièces nécessaires pour un audit approfondi |
| `avocat_acte` | Pièces requises pour la rédaction et la signature de l'acte |

### Principe de progressivité UX

La checklist n'affiche pas toutes les pièces d'un coup. L'organisation par phase permet de guider l'utilisateur sans créer un mur administratif à l'entrée. Les pièces conditionnelles (`conditionnel`, `le_cas_echeant`) ne sont marquées comme manquantes que si la situation déclarée confirme qu'elles sont attendues.

---

## Questionnaire de situation

### Questions actuellement gérées

| Champ | Type | Objectif |
|---|---|---|
| `salaries` | `boolean \| null` | Afficher ou masquer les pièces personnel (contrats, bulletins) |
| `locaux_loues` | `boolean \| null` | Afficher ou masquer les pièces locatives (bail, accord bailleur) |
| `acquereur_type` | `"physique" \| "societe_existante" \| "societe_creation" \| null` | Filtrer les pièces acquéreur selon la forme juridique |
| `marque_enseigne` | `boolean \| null` | Afficher ou masquer les actifs incorporels |
| `activite_reglementee` | `boolean \| null` | Afficher ou masquer les licences et autorisations administratives |

Chaque question propose une réponse **"Je ne sais pas encore"** (`null`) — la pièce conditionnelle reste alors en statut "À vérifier" sans être masquée.

### Finalité

Le questionnaire sert uniquement à **adapter l'affichage** de la checklist. Il ne produit pas de qualification juridique et ne remplace pas l'analyse d'un professionnel.

### Persistance

- **Supabase** : les réponses sont sauvegardées silencieusement dans `cessions.situation_declaree` (colonne `jsonb`) avec un debounce de 800 ms. La sauvegarde ne bloque pas l'interface.
- **Fallback localStorage** : si la sauvegarde Supabase échoue (réseau, RLS, migration non appliquée), les réponses sont conservées dans le navigateur via la clé `situation_dossier_{id}`.
- **Mode démo** : localStorage uniquement — aucun appel Supabase.
- **Au chargement** : la situation est lue côté serveur depuis `cessions.situation_declaree` et injectée comme état initial. Si Supabase est indisponible, le composant tente le fallback localStorage.

---

## Décisions structurantes déjà prises

- **Audit-first** : l'utilisateur dépose ses documents et reçoit un audit avant tout engagement.
- **Rapport PDF comme lead magnet** : l'email est capturé au moment du téléchargement du rapport.
- **Validation avocat comme conversion principale** : l'utilisateur est orienté vers un professionnel après l'audit.
- **Génération d'actes en second temps** : uniquement après validation du modèle de conversion.
- **Pas d'IA tant que la chaîne documentaire n'est pas stabilisée** : classification légère d'abord, extraction PDF ensuite, puis analyse juridique.
- **Progressivité UX** : ne pas faire peur à l'utilisateur, ne pas afficher toutes les pièces d'un coup, distinguer les phases et les priorités.
- **Questionnaire facultatif** : les réponses "Je ne sais pas encore" sont acceptées — la checklist reste utile même sans réponses.

---

## Décisions RGPD / sécurité

- **Le texte extrait des PDF n'est pas persisté** : seules les métadonnées techniques (`nb_caracteres_extraits`, `extraction_ok`) sont stockées.
- **Les fichiers PDF restent dans Supabase Storage** : non copiés ailleurs, non envoyés à des tiers.
- **Les documents scannés sont signalés** (PDF sans texte sélectionnable) sans tentative d'OCR à ce stade.
- **`situation_declaree` ne contient pas de documents, de texte extrait ni d'analyse juridique** : uniquement des réponses de contexte déclarées par l'utilisateur (booléens et enum).
- **`situation_declaree` ne contient pas de données personnelles directement identifiantes** : pas de nom, email ou SIRET — uniquement des informations sur la nature du dossier (présence de salariés, type d'acquéreur, etc.).
- **Base légale pour `situation_declaree`** : exécution du service (art. 6.1.b RGPD) — ces réponses sont collectées pour personnaliser l'audit documentaire.
- **Durée de conservation de `situation_declaree`** : héritée de la cession (supprimée avec la cession).
- **Pas de consentement spécifique requis** pour les métadonnées techniques ni pour la situation déclarée — elles relèvent du traitement légitime du dossier.
- **Le texte extrait ne sera persisté qu'après validation d'une base légale et d'une durée de conservation** explicite.

---

## Points d'attention actuels

- **Absence d'authentification utilisateur** : le dossier est accessible par UUID — pas de protection par session à ce stade (MVP sans auth).
- **Questionnaire encore limité à 5 questions** : d'autres situations (présence d'un fonds de commerce artisanal, cession partielle, etc.) ne sont pas encore couvertes.
- **Situation déclarée non vérifiée** : les réponses du questionnaire sont acceptées telles quelles — la checklist peut être incomplète si l'utilisateur répond incorrectement.
- **Checklist indicative** : basée sur les types de documents détectés par le nom de fichier, pas sur leur contenu réel — un PDF nommé `document1.pdf` sera classé `"autre"` et ne contribuera à aucune catégorie.
- **Doublons de documents** : un même fichier peut être uploadé plusieurs fois sans détection — aucune contrainte d'unicité en base.
- **Documents anciens sans `type_document`** : les documents déposés avant la V2-13 ont `type_document = null` — signalés "À vérifier" dans la checklist.
- **PDF scannés non exploitables** : sans OCR, leur contenu reste inaccessible — la checklist les ignore si leur nom n'est pas assez explicite.
- **Migration `situation_declaree` à appliquer manuellement** : la colonne `cessions.situation_declaree` doit être créée via le SQL Editor de Supabase avant que la persistance soit active. Jusqu'alors, le fallback localStorage prend le relais silencieusement.

---

## Prochaines étapes recommandées

| Mission | Objectif |
|---|---|
| V2-24 | Extraction structurée des informations clés par type documentaire |
| V2-25 | Audit juridique assisté IA (branchement Anthropic) |
| V2-26 | ✅ Synthèse préparatoire dans le rapport, sans IA, sans persistance |
| V2-27 | ✅ Rapport téléchargeable / imprimable via `window.print()`, capture lead reformulée |
| V2-28 | Validation avocat réelle (email ou webhook) |
| V2-29 | Authentification / sécurisation du dossier par session |

---

## Hors périmètre actuel (explicitement)

- Paiement (Stripe ou autre)
- Signature électronique
- Génération d'actes (compromis, protocole de cession)
- Marketplace avocat
- Workflow multi-utilisateurs / auth
- OCR pour PDF scannés

---

## Répertoire et branche de référence

- **Répertoire de travail** : `/Users/ngom/dev/cession-fonds-commerce-git`
- **Branche de référence** : `codex/v2-audit-first`
- **Node** : 20 recommandé
- **Éviter** : Desktop / iCloud Drive (problèmes de synchronisation observés)
- **Stack** : Next.js 15 App Router, TypeScript strict, Tailwind CSS, Supabase (partiellement branché), Anthropic Claude API (non branché V2)
