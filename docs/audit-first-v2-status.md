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
- **Dashboard dossier réel** (V2-28) : `/dossiers/[id]` est désormais un server component qui lit `getCessionById` + `getDocumentsByCessionId` en `Promise.all`. Quatre cartes de synthèse alimentées par les données réelles (Documents déposés/classifiés/à vérifier · PDF exploitables/scannés/en attente · Questionnaire n/5 · Avancement). Section "Prochaines actions" limitée à 3 actions dérivées de règles simples. Mode démo et fallback Supabase indisponible préservés. Aucun affichage de donnée personnelle, aucune table nouvelle.
- **Validation avocat persistée** (V2-29) : nouvelle table `validation_requests` (id, cession_id, dossier_id, nom, email, telephone, message, consentement, source, statut, created_at). RLS activée : `INSERT` ouvert à `anon`, aucune lecture client — la lecture passe par la clé service-role côté serveur. La page `/dossiers/[id]/validation-avocat` persiste réellement la demande au submit avec fallback `try/catch` (UX non bloquée). Le dashboard affiche désormais "Validation avocat : demandée le JJ/MM/AAAA" si une demande existe, sinon "non demandée". Aucun envoi email automatique, aucun engagement d'avocat.
- **Notification interne webhook** (V2-30) : nouvelle route `POST /api/validation-requests/notify` qui forward un payload formaté (`{ type, subject, dossier_id, nom, email, telephone, message, created_at, lien_dossier, mention }`) vers `VALIDATION_NOTIFY_WEBHOOK_URL` (Make / Zapier / n8n / Slack). Aucun document, texte extrait ou storage_path n'est transmis. Appel client en *fire-and-forget* après l'insert ; la base reste source de vérité. Timeout 5 s, fallback silencieux si webhook absent ou indisponible. `APP_BASE_URL` (server-side, sans préfixe `NEXT_PUBLIC_`) optionnelle pour construire le lien_dossier ; à défaut, dérivé des headers de la requête.
- **Sécurisation minimale TypeScript et `.env.example`** (V2-31) : correction des erreurs `tsc --noEmit` dans `lib/supabase/client.ts` (helper `getEnv` qui narrow `string | undefined → string`, type alias `BrowserClient = ReturnType<typeof createClient<Database>>` à la place de `SupabaseClient<Database>` incompatible depuis `@supabase/supabase-js@2.47`). Aucune signature publique modifiée, aucun changement fonctionnel du tunnel audit-first et aucun changement visible pour l'utilisateur. La correction porte uniquement sur le typage et la validation des variables d'environnement côté client Supabase. `.env.example` réorganisé en *Obligatoires* (3 vars Supabase) / *Optionnelles* (Anthropic réservée future IA, webhook notification, app base URL) avec mention explicite de la nécessité en production de `VALIDATION_NOTIFY_WEBHOOK_URL`.
- **Neutralisation des routes legacy avant démo** (V2-33) : les anciennes routes `/upload` et `/analyse` sont neutralisées et redirigées côté serveur vers `/dossiers/new`. Cela supprime deux surfaces obsolètes qui créaient ou lisaient des dossiers hors du tunnel V2 et affichaient encore une promesse d'analyse IA legacy. Aucun comportement du tunnel audit-first principal (`/dossiers/*`) n'est modifié. Aucune authentification ajoutée, aucune policy RLS modifiée, aucune migration, aucun changement Supabase. La recommandation reste inchangée : activer une **protection globale de déploiement** avant toute démo publique ou semi-publique.
- **Anti-abus minimal avant démo** (V2-34) : rate-limit best-effort en mémoire sur `POST /api/dossiers/[id]/extract-text`, `POST /api/dossiers/[id]/structured-extraction` et `POST /api/validation-requests/notify`. Les routes d'extraction plafonnent désormais le traitement aux 5 premiers PDF éligibles par appel, ignorent automatiquement les fichiers trop volumineux (> 10 Mo) et ne renvoient plus `storage_path` au client sur `extract-text`. La route webhook valide désormais le format UUID du `dossier_id`, vérifie l'existence réelle de la cession avant envoi et peut ajouter un secret sortant optionnel `VALIDATION_NOTIFY_SECRET` via l'en-tête `X-Validation-Notify-Secret`. La page documents limite le lot sélectionné (10 fichiers max, 30 Mo max par lot, 10 Mo max par fichier) et restreint la démo à PDF / Word / Excel, sans images scannées. La protection globale de déploiement reste requise avant toute démo publique ou semi-publique. Aucun captcha ajouté, aucune auth complète, aucune migration RLS, aucun changement Supabase, aucune sécurité production complète.
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

## Risques production non résolus par V2-34

V2-34 ajoute un lot défensif court pour plafonner, ralentir et filtrer certains abus côté routes serveur et côté upload UI. Cette mission **ne résout pas** les sujets suivants, qui restent ouverts avant toute exposition publique ou semi-publique plus large :

- **Écritures browser → Supabase encore imparfaitement protégées** — `createCession`, `insertReportLead`, `insertValidationRequest` et `uploadDocument` passent toujours par le client browser avec la clé `anon`, hors rate-limit Next.js.
- **Rate-limit mémoire non distribué** — les garde-fous V2-34 sont best-effort, en mémoire processus, et ne remplacent pas un vrai rate-limit partagé.
- **Authentification complète** — l'accès au tunnel reste sans session utilisateur dédiée.
- **Accès dossier par UUID** — l'accès direct par identifiant reste possible ; aucun secret par dossier ni URL signée n'est ajouté en V2-34.
- **RLS Supabase complète** — RLS active uniquement sur `report_leads` et `validation_requests` (INSERT anon, aucune lecture client). Les politiques `cessions` et `documents` doivent toujours être vérifiées et durcies en Studio Supabase.
- **Storage policies** — les règles d'accès du bucket `documents` (public/private, select/list/read/insert/delete) doivent être auditées manuellement dans Supabase Studio.
- **Captcha** — non installé sur les formulaires publics.
- **Purge Storage / orphelins** — un blob téléversé puis "retiré" côté UI reste dans le bucket `documents`. Aucune routine de purge planifiée. Aucune politique de conservation explicite des documents et des cessions.
- **OCR** — les PDF scannés restent non exploitables.
- **Branchement IA / Anthropic** — `ANTHROPIC_API_KEY` est documentée comme réservée mais non utilisée. Le rapport reste alimenté par les blocs hardcodés + la synthèse documentaire indicative V2-26.
- **RGPD complet** — CGU, politique de confidentialité, base légale détaillée, durées de conservation et droit de suppression restent à formaliser pour une exposition publique.
- **Monitoring / alerting** — `console.warn` invisible sans agrégateur (Sentry, Datadog, Logflare…).

---

## V2-35 — Déplacement côté serveur des écritures sensibles

V2-35 déplace côté serveur les deux écritures Supabase qui transportent des données personnelles :

- **`validation_requests`** : insertion désormais effectuée par la route `POST /api/dossiers/[id]/validation-requests`, qui orchestre dans le même appel l'insertion en base **et** le déclenchement du webhook interne. Les pages clientes ne disposent plus du chemin `insertValidationRequest` (helper supprimé de `lib/supabase/client.ts`).
- **`report_leads`** : insertion désormais effectuée par la route `POST /api/dossiers/[id]/report-leads`. Helper `insertReportLead` également supprimé.

Mécanismes communs aux deux nouvelles routes :

- Validation stricte côté serveur (`nom`, `email`, `telephone`, `message`/`role`, `consentement` requis), avec longueurs maximales et expression régulière email.
- Vérification de l'existence de la cession via `supabaseAdmin.from('cessions').select('id').eq('id', id).maybeSingle()`.
- Rate-limit best-effort en mémoire processus (clé `IP + route + dossier_id`, 5 appels / 10 minutes), réutilisant le pattern V2-34.
- Réponses HTTP normalisées : `400` payload invalide, `404` dossier inconnu, `429` rate-limit avec en-tête `Retry-After`, `500` indisponibilité Supabase, `201` succès.
- Le secret webhook `VALIDATION_NOTIFY_SECRET` reste exclusivement côté serveur.
- En cas d'échec du webhook, l'insertion en base est conservée et l'UX renvoie une confirmation positive (la base reste source de vérité).

Pages clientes mises à jour :

- [`app/dossiers/[id]/validation-avocat/page.tsx`](app/dossiers/[id]/validation-avocat/page.tsx) — un seul `fetch` vers la route serveur, suppression du double appel `Supabase + /api/validation-requests/notify`.
- [`app/dossiers/[id]/rapport/page.tsx`](app/dossiers/[id]/rapport/page.tsx) — `fetch` vers la route serveur, court-circuit en mode démo (ID non UUID).

Aucune migration Supabase n'est introduite par V2-35. Aucune politique RLS n'est fermée. La route legacy `app/api/validation-requests/notify/route.ts` est conservée intacte pour ne pas régresser un éventuel consommateur externe ; elle n'est plus appelée par les pages V2-35.

### Dette restante après V2-35

- **`createCession`** continue d'écrire `cessions` (status='draft') depuis le browser via la clé anon.
- **`uploadDocument`** continue d'écrire le bucket Storage **et** la table `documents` depuis le browser.
- **`updateCession({ situation_declaree })`** continue de mettre à jour `cessions` depuis le browser (debounce 800 ms).
- **Policies RLS `report_leads_insert_anon` et `validation_requests_insert_anon`** restent ouvertes : à fermer en V2-36 une fois le soak des nouvelles routes confirmé.
- **Storage** : politiques du bucket `documents` à auditer en Supabase Studio (hors versionnement Git).
- **Accès dossier par UUID** non résolu : pas de token de dossier ni de signature.
- **Rate-limit mémoire non distribué** : les compteurs sont par instance serverless et non partagés.
- **Captcha** absent sur tous les formulaires publics.
- **Authentification utilisateur** absente.

V2-35 réduit la surface d'écriture browser sur les deux tables PII les plus exposées, mais ne suffit pas à considérer la production publique comme sécurisée.

---

## V2-36 — Fermeture des anciennes portes

V2-36 referme deux surfaces résiduelles laissées ouvertes par V2-35.

### Route legacy neutralisée

[`app/api/validation-requests/notify/route.ts`](app/api/validation-requests/notify/route.ts) ne lit plus Supabase, ne déclenche plus le webhook interne, n'utilise plus la clé service-role et n'applique plus de rate-limit. Tout `POST` ou `GET` répond `410 Gone` avec :

```json
{
  "error": "deprecated_route",
  "message": "Cette route legacy est désactivée. Utilisez /api/dossiers/[id]/validation-requests."
}
```

et l'en-tête `Cache-Control: no-store`. Un éventuel client externe historique reçoit donc un signal HTTP standard et explicite. La route successeur (`POST /api/dossiers/[id]/validation-requests`, V2-35) reste le seul point d'entrée actif pour la persistence d'une demande de validation avocat et le déclenchement du webhook.

### Migration RLS ciblée

[`supabase/migrations/20260502_close_anon_insert_policies.sql`](supabase/migrations/20260502_close_anon_insert_policies.sql) ferme la porte SQL anonyme sur les deux tables désormais écrites uniquement côté serveur :

- `drop policy if exists "validation_requests_insert_anon" on public.validation_requests;`
- `drop policy if exists "report_leads_insert_anon" on public.report_leads;`
- `revoke insert on public.validation_requests from anon;`
- `revoke insert on public.report_leads from anon;`

RLS reste activée sur les deux tables ; sans policy permissive, l'INSERT anon est refusé par défaut. Aucune nouvelle policy n'est créée (le tunnel n'utilise pas le rôle `authenticated`). La migration doit être appliquée via `supabase db push` ou via le SQL Editor de Supabase Studio.

### Hors périmètre V2-36

- **`cessions`** : `createCession` et `updateCession({ situation_declaree })` continuent d'écrire depuis le browser → fermeture reportée à une mission ultérieure (déplacement serveur préalable requis).
- **`documents`** : `uploadDocument` continue d'insérer la metadata côté browser → idem.
- **Storage `documents`** : politiques bucket inchangées ; un audit Supabase Studio reste nécessaire avant toute fermeture.
- **Routes d'extraction PDF** (`extract-text`, `structured-extraction`) : aucune modification.
- **Helpers browser** (`createCession`, `updateCession`, `uploadDocument`, helpers dormants) : aucune modification de `lib/supabase/client.ts`.
- **Auth, captcha, monitoring** : aucune addition.

### Dette restante après V2-36

- **`createCession` / `updateCession({ situation_declaree })`** côté browser via la clé anon.
- **`uploadDocument`** côté browser (Storage + table `documents`).
- **Accès dossier par UUID** énumérable ; pas de token ni de signature de dossier.
- **RLS `cessions` et `documents`** non versionnées dans `supabase/migrations/` : leur état effectif n'est connu qu'en Studio.
- **Storage bucket `documents`** : public/private, policies INSERT/SELECT/DELETE et grants à figer manuellement avant tout durcissement.
- **Rate-limit en mémoire processus** : non partagé entre instances serverless.
- **Captcha** absent sur tous les formulaires publics.
- **Authentification utilisateur** absente.
- **Monitoring / alerting complet** absent (`console.warn` sans agrégateur).

V2-36 supprime deux portes annexes mais ne change pas le verdict produit : la prochaine étape sécurité passe par la serveurisation des écritures `cessions` et `documents`, puis par un audit Storage et un éventuel passage en `createSignedUploadUrl`.

---

## V2-37 — Serveurisation `createCession` et `situation_declaree`

V2-37 termine la migration des écritures `cessions` côté serveur, sans toucher au schéma ni introduire d'auth ou de `dossier_secret`.

### Création de dossier

[`POST /api/dossiers`](app/api/dossiers/route.ts) — runtime `nodejs`, rate-limit best-effort `IP+route` (5 / 10 min). Insère une cession via `supabaseAdmin` (`{status: "draft"}`), retourne `{success, id, created_at}` avec statut `201`. Aucun champ optionnel n'est encore persisté ; les inputs `nom` / `contexte` du formulaire restent locaux dans l'attente d'une décision produit. En cas d'erreur Supabase, la réponse est un `500` générique sans détail interne.

[`app/dossiers/new/page.tsx`](app/dossiers/new/page.tsx) appelle désormais cette route via `fetch`. Le fallback `demo-${Date.now()}` est conservé : si le serveur renvoie `429`, `500` ou est injoignable, l'utilisateur retombe sur un identifiant local et conserve l'expérience offline.

### Persistance du questionnaire de situation

[`PATCH /api/dossiers/[id]/situation`](app/api/dossiers/[id]/situation/route.ts) — runtime `nodejs`, rate-limit `IP+route+id` (10 / 10 min, calibré sur le debounce 800 ms du composant client). La route :

- valide le format UUID du dossier ;
- accepte exclusivement les 5 clés du contrat `SituationDossier` (`salaries`, `locaux_loues`, `acquereur_type`, `marque_enseigne`, `activite_reglementee`) — toute clé inconnue déclenche un `400` ;
- valide chaque valeur (`boolean | null` pour les booléennes, enum strict pour `acquereur_type`) ;
- vérifie l'existence de la cession ;
- `UPDATE cessions SET situation_declaree = …` via `supabaseAdmin`, **uniquement cette colonne** : aucune autre colonne du schéma `cessions` n'est jamais écrite, neutralisant le vecteur de corruption arbitraire qui existait avec l'ancien `updateCession()` browser.

[`app/dossiers/[id]/audit/AuditChecklistSection.tsx`](app/dossiers/[id]/audit/AuditChecklistSection.tsx) appelle cette route via `fetch` après le debounce. Le fallback `localStorage` est conservé tel quel : si la persistance serveur échoue, l'utilisateur n'est pas bloqué et conserve ses réponses dans le navigateur.

### Helpers browser nettoyés

[`lib/supabase/client.ts`](lib/supabase/client.ts) — suppression des exports `createCession` et `updateCession` (et du type `CessionUpdate` associé). Conservation de `getSupabaseClient`, `uploadDocument`, `getCession`, `getDocuments`, `deleteDocument` (les trois derniers restent dormants en attendant V2-38). Une note V2-37 documente la migration.

### Hors périmètre V2-37

- **`uploadDocument`** : Storage + `documents` continuent d'être écrits côté browser via la clé anon — cible V2-38.
- **Storage bucket `documents`** : aucune modification ; audit Studio reporté en V2-38.
- **`dossier_secret`, auth, captcha** : non introduits.
- **Routes V2-35 et V2-36** : aucune modification.
- **Routes d'extraction PDF** : aucune modification.

### Dette restante après V2-37

- **`uploadDocument`** côté browser (Storage + table `documents`).
- **Accès dossier par UUID** énumérable — pas de `dossier_secret`, pas d'auth, pas de lien signé.
- **Tables `cessions` et `documents` non versionnées** — leur état RLS effectif n'est connu qu'en Studio.
- **Bucket Storage `documents`** : public/private, policies INSERT/SELECT/DELETE et grants à figer manuellement avant tout durcissement.
- **Helpers browser dormants** (`getCession`, `getDocuments`, `deleteDocument`) — conservés temporairement, à nettoyer au plus tard avec V2-38.
- **Rate-limit en mémoire processus** non partagé entre instances serverless.
- **Captcha** absent sur tous les formulaires publics.
- **Authentification utilisateur** absente.
- **Monitoring / alerting complet** absent.

### Cible V2-38

- `createSignedUploadUrl` côté serveur pour découpler l'upload du Storage anon.
- Insertion metadata `documents` côté serveur (route dédiée `POST /api/dossiers/[id]/documents/metadata`).
- Audit / baseline RLS Storage et tables `cessions` / `documents` (dump `pg_policies` versionné dans `supabase/migrations/` ou `docs/supabase-baseline.md`).
- Éventuellement, introduction d'un `dossier_secret` (migration colonne + transmission cookie httpOnly) pour réduire l'énumérabilité de l'accès dossier.

---

## Prochaines étapes recommandées

| Mission | Objectif |
|---|---|
| V2-24 | Extraction structurée des informations clés par type documentaire |
| V2-25 | Audit juridique assisté IA (branchement Anthropic) |
| V2-26 | ✅ Synthèse préparatoire dans le rapport, sans IA, sans persistance |
| V2-27 | ✅ Rapport téléchargeable / imprimable via `window.print()`, capture lead reformulée |
| V2-28 | ✅ Dashboard dossier réel basé sur cession + documents + situation_declaree |
| V2-29 | ✅ Demande de validation avocat persistée en base (table `validation_requests`) |
| V2-30 | ✅ Notification interne webhook (Make / Slack / Zapier / n8n) au submit |
| V2-31 | ✅ Sécurisation minimale TypeScript + clarification `.env.example` |
| V2-32 | ✅ Diagnostic pré-production des risques avant exposition publique |
| V2-33 | ✅ Neutralisation des routes legacy `/upload` et `/analyse` + recommandation de protection globale de déploiement |
| V2-34 | ✅ Anti-abus minimal : rate-limit mémoire, plafonds extraction PDF, webhook durci, limites upload MVP |
| V2-35 | ✅ Déplacement côté serveur de `validation_requests` et `report_leads` (validation, vérification dossier, rate-limit, webhook serveur unifié) |
| V2-36 | ✅ Neutralisation 410 Gone de `/api/validation-requests/notify` + fermeture des policies RLS `*_insert_anon` et révocation INSERT anon sur les deux tables |
| V2-37 | ✅ Serveurisation de la création de dossier (`POST /api/dossiers`) et de la persistance du questionnaire (`PATCH /api/dossiers/[id]/situation`), avec validation stricte du shape `SituationDossier` |
| V2-38 | Signed upload URL Storage + metadata `documents` côté serveur, audit / baseline RLS, éventuel `dossier_secret` |

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
