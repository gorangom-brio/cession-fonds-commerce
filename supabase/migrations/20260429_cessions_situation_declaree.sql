-- Migration V2-22b : persistance situation déclarée dans cessions
-- Objectif  : stocker les réponses du questionnaire de situation pour adapter la checklist
-- Branche   : codex/v2-audit-first

alter table cessions
  add column if not exists situation_declaree jsonb;

comment on column cessions.situation_declaree is
  'Réponses déclarées au questionnaire de situation (salaries, locaux_loues, acquereur_type, marque_enseigne, activite_reglementee). NULL = questionnaire non rempli. Valeurs boolean | string | null par clé.';
