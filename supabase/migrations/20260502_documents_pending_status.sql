-- Migration V2-38 : statut pending / ready sur documents
-- Branche   : codex/v2-audit-first
--
-- Contexte :
-- V2-38 introduit un flux d'upload en deux temps (prepare-upload côté serveur
-- → upload Storage via signed URL → finalize-upload côté serveur).
-- La colonne `status` permet :
--   - de matérialiser l'état d'une ligne pré-créée par prepare-upload mais
--     dont l'objet Storage n'a pas encore été déposé (status = 'pending') ;
--   - d'isoler les lignes effectivement téléversées (status = 'ready') pour
--     les lectures du dashboard, de l'audit et des routes d'extraction ;
--   - de préparer une future GC des orphelins (lignes 'pending' jamais
--     finalisées) sans dépendre d'une horloge applicative.
--
-- Hors périmètre V2-38 :
--   - aucune policy n'est créée, modifiée ou supprimée ;
--   - aucun grant n'est révoqué ;
--   - aucune modification du bucket Storage ;
--   - la fermeture des policies anon (`documents_insert_anon`,
--     Storage `INSERT to anon`) est réservée à V2-38b après audit Studio
--     et soak du nouveau flux.
--
-- Note : `default 'ready' not null` garantit la rétrocompatibilité — toutes
-- les lignes existantes deviennent immédiatement 'ready' sans nécessiter de
-- backfill, et les routes d'extraction continuent de les voir.

alter table public.documents
  add column if not exists status text not null default 'ready'
  check (status in ('pending', 'ready'));

create index if not exists documents_status_created_at_idx
  on public.documents (status, created_at);
