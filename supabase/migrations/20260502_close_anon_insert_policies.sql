-- Migration V2-36 : fermeture des INSERT anon sur validation_requests et report_leads
-- Branche   : codex/v2-audit-first
--
-- Contexte :
-- V2-35 (commit 500a360) a déplacé côté serveur les écritures sensibles sur
-- ces deux tables : les pages clientes appellent désormais
--   POST /api/dossiers/[id]/validation-requests
--   POST /api/dossiers/[id]/report-leads
-- qui utilisent `supabaseAdmin` (service-role) et bypassent donc RLS.
--
-- Les policies historiques `*_insert_anon` et le grant INSERT au rôle anon
-- ne sont plus nécessaires : ils maintenaient une porte d'entrée parallèle
-- exploitable directement depuis le browser avec la clé anon.
--
-- V2-36 ferme cette porte :
--   - drop des deux policies `*_insert_anon` ;
--   - revoke de l'INSERT anon (ceinture-bretelle au niveau grants).
--
-- Hors périmètre V2-36 (à traiter en V2-37+) :
--   - cessions  : createCession / updateCession(situation_declaree) restent
--                 effectués côté browser via la clé anon, donc on ne ferme
--                 rien sur cette table ici.
--   - documents : uploadDocument écrit la metadata côté browser, donc idem.
--   - Storage   : le bucket `documents` continue d'accepter un upload anon.
--   - cessions / documents / Storage ne sont par ailleurs pas versionnés
--     dans `supabase/migrations/` — un audit Supabase Studio est nécessaire
--     avant toute fermeture.
--
-- RLS reste activée sur les deux tables ; sans policy permissive, l'INSERT
-- anonyme est refusé par défaut. Aucune nouvelle policy n'est créée
-- (pas d'auth, pas de rôle authenticated utilisé par le tunnel).

drop policy if exists "validation_requests_insert_anon" on public.validation_requests;
drop policy if exists "report_leads_insert_anon"       on public.report_leads;

revoke insert on public.validation_requests from anon;
revoke insert on public.report_leads       from anon;
