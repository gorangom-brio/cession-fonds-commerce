-- Migration V2-29 : table validation_requests
-- Objectif  : persister les demandes de validation avocat soumises depuis
--             /dossiers/[id]/validation-avocat
-- Branche   : codex/v2-audit-first

create table validation_requests (
  id           uuid        default gen_random_uuid() primary key,
  created_at   timestamptz default now() not null,
  cession_id   uuid        references cessions(id) on delete cascade,
  dossier_id   text        not null,
  nom          text        not null,
  email        text        not null,
  telephone    text,
  message      text        not null,
  consentement boolean     not null default false,
  source       text        not null default 'rapport_validation_avocat',
  statut       text        not null default 'nouveau'
                 check (statut in ('nouveau', 'en_cours', 'traite', 'clos'))
);

create index validation_requests_cession_id_idx on validation_requests (cession_id);
create index validation_requests_created_at_idx on validation_requests (created_at);
create index validation_requests_statut_idx     on validation_requests (statut);

comment on table validation_requests is
  'Demandes de validation avocat soumises depuis le tunnel audit. Trace exploitable pour traitement manuel ; pas d''engagement automatique d''un avocat ni envoi email automatique à ce stade.';

-- RLS : insertion ouverte à la clé anon, aucune lecture côté client.
-- Le dashboard utilise la clé service-role côté serveur pour lire les demandes.
alter table validation_requests enable row level security;

create policy "validation_requests_insert_anon"
  on validation_requests
  for insert
  to anon
  with check (true);
