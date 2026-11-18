-- Rollback de 006 — remove role audita_app (após trocar DATABASE_URL de volta).
REASSIGN OWNED BY audita_app TO postgres;
DROP OWNED BY audita_app;
DROP ROLE IF EXISTS audita_app;
