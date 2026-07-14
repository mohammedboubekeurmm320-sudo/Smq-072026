-- ============================================================
-- PHASE 1E : AJOUTER COLONNES MANQUANTES AUX TABLES EXISTANTES
-- CORRIGÉ: GROUP BY ajouté dans le résumé
-- Exécuter en DERNIER (après 1A, 1B, 1C, 1D)
-- ============================================================

BEGIN;

-- ==========================================
-- organizations : ajouter settings si manquant
-- ==========================================
DO $$ BEGIN
    ALTER TABLE organizations ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ==========================================
-- profiles : ajouter colonnes manquantes
-- ==========================================
DO $$ BEGIN
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS job_title TEXT;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ==========================================
-- sessions (public) : ajouter colonnes manquantes
-- ==========================================
DO $$ BEGIN
    ALTER TABLE sessions ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE sessions ADD COLUMN IF NOT EXISTS user_agent TEXT;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE sessions ADD COLUMN IF NOT EXISTS ip INET;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ==========================================
-- Vérification : afficher le résumé
-- CORRIGÉ: sous-requête avec GROUP BY pour éviter l'erreur aggregate
-- ==========================================
DO $$
DECLARE
    v_table_count INTEGER;
    v_table_names TEXT;
BEGIN
    SELECT COUNT(*), string_agg(table_name, ', ' ORDER BY table_name)
    INTO v_table_count, v_table_names
    FROM (
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_type = 'BASE TABLE'
    ) t;

    RAISE NOTICE '=== RESUME PHASE 1 ===';
    RAISE NOTICE 'Tables dans public: %', v_table_count;
    RAISE NOTICE 'Tables: %', v_table_names;
END $$;

COMMIT;