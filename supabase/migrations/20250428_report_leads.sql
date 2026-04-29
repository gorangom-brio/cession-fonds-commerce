-- Migration : table report_leads
-- Objectif  : persister les leads de la capture email "Recevoir mon rapport PDF"
-- Branche   : codex/v2-audit-first

create table report_leads (
  id                     uuid        default gen_random_uuid() primary key,
  created_at             timestamptz default now() not null,
  dossier_id             text        not null,
  cession_id             uuid        references cessions(id) on delete set null,
  nom                    text        not null,
  email                  text        not null,
  role                   text        not null
                           check (role in ('vendeur', 'acquereur', 'intermediaire', 'autre')),
  telephone              text,
  consentement_rapport   boolean     not null default false,
  consentement_recontact boolean     not null default false,
  source                 text        not null default 'rapport_pdf_demo',
  statut                 text        not null default 'nouveau'
);

create index report_leads_email_idx      on report_leads (email);
create index report_leads_created_at_idx on report_leads (created_at);
create index report_leads_statut_idx     on report_leads (statut);

-- RLS : insert ouvert à la clé anon, aucune lecture côté client
alter table report_leads enable row level security;

create policy "report_leads_insert_anon"
  on report_leads
  for insert
  to anon
  with check (true);
