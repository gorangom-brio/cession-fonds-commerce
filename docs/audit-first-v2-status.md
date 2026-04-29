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
/dossiers/[id]/audit              Audit enrichi — checklist calculée + extraction PDF
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
- **Checklist documentaire calculée** à partir des `type_document` réellement déposés — plus de checklist simulée en mode réel.
- **Capture lead rapport PDF** : nom, email, rôle, consentements enregistrés dans la table `report_leads`.
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
Checklist calculée à partir de type_document → affichage audit
    ↓
Affichage audit : pièces présentes / manquantes / à vérifier
```

---

## Décisions structurantes déjà prises

- **Audit-first** : l'utilisateur dépose ses documents et reçoit un audit avant tout engagement.
- **Rapport PDF comme lead magnet** : l'email est capturé au moment du téléchargement du rapport.
- **Validation avocat comme conversion principale** : l'utilisateur est orienté vers un professionnel après l'audit.
- **Génération d'actes en second temps** : uniquement après validation du modèle de conversion.
- **Pas d'IA tant que la chaîne documentaire n'est pas stabilisée** : classification légère d'abord, extraction PDF ensuite, puis analyse juridique.

---

## Décisions RGPD / sécurité

- **Le texte extrait des PDF n'est pas persisté** : seules les métadonnées techniques (`nb_caracteres_extraits`, `extraction_ok`) sont stockées.
- **Les fichiers PDF restent dans Supabase Storage** : non copiés ailleurs, non envoyés à des tiers.
- **Les documents scannés sont signalés** (PDF sans texte sélectionnable) sans tentative d'OCR à ce stade.
- **Pas de consentement spécifique requis** pour les métadonnées techniques — elles sont liées au traitement légitime du dossier.
- **Le texte extrait ne sera persisté qu'après validation d'une base légale et d'une durée de conservation** explicite.

---

## Points d'attention actuels

- **Doublons de documents** : un même fichier peut être uploadé plusieurs fois sans détection — aucune contrainte d'unicité en base.
- **Documents anciens sans `type_document`** : les documents déposés avant la V2-13 ont `type_document = null` — signalés "À vérifier" dans la checklist.
- **PDF scannés non exploitables** : sans OCR, leur contenu reste inaccessible — la checklist les ignore si leur nom n'est pas assez explicite.
- **Classification dépendante du nom de fichier** : un PDF nommé `document1.pdf` sera classé `"autre"` et ne contribuera à aucune catégorie attendue.
- **Absence d'authentification utilisateur** : le dossier est accessible par UUID — pas de protection par session à ce stade (MVP sans auth).

---

## Prochaines étapes recommandées

| Mission | Objectif |
|---|---|
| V2-21 | Définir la liste exhaustive des pièces attendues selon le type de dossier |
| V2-22 | Extraction structurée des informations clés par type documentaire |
| V2-23 | Persistance structurée de l'audit juridique |
| V2-24 | Audit juridique assisté IA (branchement Anthropic) |
| V2-25 | Génération PDF du rapport d'audit |
| V2-26 | Validation avocat réelle (email ou webhook) |

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
