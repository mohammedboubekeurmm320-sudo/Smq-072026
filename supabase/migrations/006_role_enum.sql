-- Migration 006: Convertir la colonne `role` (TEXT) en ENUM typé
CREATE TYPE user_role AS ENUM (
  'admin', 'quality_manager', 'auditor', 'document_controller', 'executive', 'operator'
);

ALTER TABLE profiles ALTER COLUMN role TYPE user_role USING role::user_role;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organization_members' AND column_name = 'role') THEN
    ALTER TABLE organization_members ALTER COLUMN role TYPE user_role USING role::user_role;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'electronic_signatures' AND column_name = 'signer_role') THEN
    ALTER TABLE electronic_signatures ALTER COLUMN signer_role TYPE user_role USING signer_role::user_role;
  END IF;
END $$;