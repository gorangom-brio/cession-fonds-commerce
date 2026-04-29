-- Migration : enrichissement table documents — métadonnées d'extraction PDF
-- Objectif  : persister le résultat technique de l'extraction sans stocker le contenu
-- Branche   : codex/v2-audit-first

alter table documents
  add column if not exists nb_caracteres_extraits integer,
  add column if not exists extraction_ok           boolean;

comment on column documents.nb_caracteres_extraits is
  'Nombre de caractères extraits du PDF. NULL = extraction non tentée. 0 = PDF scanné ou vide.';

comment on column documents.extraction_ok is
  'Extraction texte réussie (true), échouée (false), ou non tentée (null).';
