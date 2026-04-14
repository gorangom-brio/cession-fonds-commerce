# Cession Fonds Commerce — Instructions projet

## Contexte produit
Application française d'aide à la préparation d'une cession de fonds de commerce.
Cible : petits commerçants non juristes. Non substituable à un avocat.

## Stack
- Next.js 15 App Router + TypeScript strict
- Tailwind CSS — palette custom déclarée dans `tailwind.config.ts` (navy, confidence-*)
- Supabase sans auth (MVP) — storage + DB
- Anthropic Claude API

## Parcours utilisateur
1. `/` — Landing + CTA "Commencer ma cession"
2. `/upload` — Upload PDFs
3. `/analyse?cession_id=` — Analyse IA + résultats
4. `/contrat?cession_id=` — Génération contrat PDF (à venir)

## Architecture lib/
| Fichier | Rôle |
|---------|------|
| `types.ts` | Tous les types TypeScript du projet |
| `database.types.ts` | Types Supabase (schéma DB) |
| `supabase.ts` | Client + fonctions DB/storage |
| `anthropic.ts` | Appel Claude API |
| `prompts.ts` | Prompt Maître v3.0 (source unique) |
| `pdf-generator.ts` | Génération HTML contrat |

## Règles Supabase
- `supabaseClient` (clé anon) : composants client et fonctions appelées depuis le browser
- `supabaseAdmin` (service role) : API routes uniquement — ne jamais importer dans `"use client"`

## Contraintes impératives
1. **Disclaimer juridique obligatoire** sur chaque page et dans le PDF
2. **RGPD** : consentement avant upload, suppression possible
3. **Think Before Coding** : pas de feature non demandée
4. **Simplicity First** : MVP fonctionnel > sur-ingénierie
5. **No pseudo-code** : tout fichier fourni doit être compilable et exécutable

## Tables Supabase à créer
```sql
create table cessions (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  user_id uuid,
  status text default 'draft',
  vendeur_nom text, vendeur_prenom text, vendeur_adresse text, vendeur_siret text,
  acheteur_nom text, acheteur_prenom text, acheteur_adresse text,
  fonds_denomination text, fonds_activite text, fonds_adresse text,
  prix_cession numeric, date_entree_jouissance date,
  chiffre_affaires_n1 numeric, chiffre_affaires_n2 numeric, chiffre_affaires_n3 numeric,
  bail_bailleur text, bail_date_expiration date, bail_loyer_mensuel numeric,
  elements_inclus text[], elements_exclus text[],
  confidence_scores jsonb, ai_comments jsonb, raw_ai_response text
);

create table documents (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  cession_id uuid references cessions(id) on delete cascade,
  nom_fichier text not null,
  type_document text,
  storage_path text not null,
  taille_octets bigint not null,
  analyse_effectuee boolean default false
);
```
