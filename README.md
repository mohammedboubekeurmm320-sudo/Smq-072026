# QMS ISO 13485 Pro — Système de Management de la Qualité

Application web complète de gestion de la qualité conforme **ISO 13485:2016**, **ISO 14971**, **ICH Q10**, **IVDR EU 2017/746** et **FDA 21 CFR Part 11**.

## 🎯 Fonctionnalités principales

- **Multi-organisation & multi-tenant** : chaque organisation a ses propres données, utilisateurs et modules
- **10 modules QMS** : CAPA, NCR, Déviations, Contrôle des Changements, Audits, Risques, Formation, Dossiers de Lot, Fournisseurs, OOS/OOT
- **Architecture hybride 2-couches** : Templates (Layer 1) + Instances (Layer 2) avec workflow d'approbation
- **Système `record_links` polymorphique** : 8 types de liens entre enregistrements (caused_by, corrected_by, derived_from, etc.)
- **Audit trail hash-chainé HMAC-SHA256** (21 CFR Part 11 §11.10(e))
- **Signatures électroniques** sur transitions de statut terminales
- **6 rôles & 49 permissions** : admin, quality_manager, auditor, document_controller, executive, operator
- **3 checklists de conformité** : ISO 13485 (15 clauses), ICH Q10 (13 clauses), IVDR (12 clauses)
- **Barr Decision Tree** complet pour OOS/OOT (Phase I/II investigation)
- **Triggers documentaires** avec détection de cycles DFS
- **Types d'enregistrements extensibles** : 10 types système + types custom
- **Recherche globale** cross-module (Ctrl+K)
- **i18n FR/EN** avec switcher de langue
- **Setup wizard** 6 étapes (Organisation → Industrie → Normes → Modules → Équipe → Résumé)

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────┐
│  Navigateur (client-side)                                 │
│  • AuthContext → fetch('/api/auth/*')                     │
│  • useModule() hook → fetch('/api/{module}')              │
│  • api-client.ts (helpers apiGet/apiPost/apiPut/apiDelete)│
└──────────────────────────────────────────────────────────┘
                            ↕ HTTP (cookies httpOnly)
┌──────────────────────────────────────────────────────────┐
│  Next.js API Routes (server-side) — ~40 endpoints          │
│  • Auth: bcrypt + cookies httpOnly + Session table         │
│  • Permissions: vérification côté serveur (hasPermission)  │
│  • Audit trail: logAudit() avec hash-chainage HMAC-SHA256  │
└──────────────────────────────────────────────────────────┘
                            ↕ Prisma Client
┌──────────────────────────────────────────────────────────┐
│  SQLite (db/custom.db) — 27 tables Prisma                 │
│  (migrable vers PostgreSQL/Supabase via les migrations SQL)│
└──────────────────────────────────────────────────────────┘
```

## 🛠️ Stack technique

- **Framework** : Next.js 16 (App Router) + TypeScript 5
- **Base de données** : Prisma ORM + SQLite (production : PostgreSQL/Supabase)
- **UI** : Tailwind CSS 4 + shadcn/ui + Lucide icons
- **Auth** : bcrypt + cookies httpOnly + sessions en base
- **State** : hooks personnalisés (useModule, useApiData)
- **i18n** : Context React FR/EN

## 📦 Installation

### Prérequis
- Node.js 18+ ou Bun
- npm/bun

### Étapes

```bash
# 1. Installer les dépendances
bun install
# ou
npm install

# 2. Configurer l'environnement
cp .env.example .env
# Éditer .env avec DATABASE_URL=file:./db/custom.db

# 3. Créer la base de données
bun run db:push
# ou
npx prisma db push

# 4. Seed la base avec données démo
bun run scripts/seed-db.ts
# ou
npx tsx scripts/seed-db.ts

# 5. Démarrer le serveur de développement
bun run dev
# ou
npm run dev
```

L'application sera disponible sur `http://localhost:3000`.

## 🔐 Comptes de démonstration

| Email | Mot de passe | Rôle |
|-------|-------------|------|
| admin@mediquality.fr | admin123 | Administrateur |
| quality@mediquality.fr | admin123 | Responsable Qualité |
| doc@mediquality.fr | admin123 | Contrôleur Documentaire |
| auditor@mediquality.fr | admin123 | Auditeur |
| operator@mediquality.fr | admin123 | Opérateur |

## 📂 Structure du projet

```
├── prisma/
│   └── schema.prisma              # Schéma Prisma (27 modèles)
├── supabase/
│   └── migrations/                # 6 migrations SQL pour Supabase/PostgreSQL
│       ├── 001_initial_schema.sql
│       ├── 002_record_type_architecture.sql
│       ├── 003_enable_rls_policies.sql
│       ├── 005_fix_rls_gaps_and_password_rotation.sql
│       ├── 006_scoped_rls_policies.sql
│       └── 007_audit_blockchain_fix_trigger_restoration.sql
├── scripts/
│   └── seed-db.ts                 # Script de seed SQLite
├── src/
│   ├── app/
│   │   ├── api/                   # ~40 routes API CRUD
│   │   │   ├── auth/              # login, logout, session, signup
│   │   │   ├── organizations/
│   │   │   ├── profiles/
│   │   │   ├── dashboard/
│   │   │   ├── documents/
│   │   │   ├── capas/
│   │   │   ├── ncrs/
│   │   │   ├── deviations/
│   │   │   ├── change-controls/
│   │   │   ├── audits/
│   │   │   ├── risks/
│   │   │   ├── training/
│   │   │   ├── batch-records/
│   │   │   ├── suppliers/
│   │   │   ├── record-links/
│   │   │   ├── audit-trail/
│   │   │   ├── record-types/
│   │   │   └── scheduled-reports/
│   │   ├── layout.tsx
│   │   └── page.tsx               # Page principale (router interne)
│   ├── components/
│   │   ├── auth/                  # Login
│   │   ├── dashboard/             # DashboardView
│   │   ├── layout/                # AppShell + Sidebar
│   │   ├── modules/               # 12 vues modules
│   │   │   ├── index.tsx          # CAPA, NCR, Deviation, ChangeControl, Audit, Risk, Training, BatchRecord, Supplier
│   │   │   ├── Documents.tsx      # Contrôle documentaire + hiérarchie
│   │   │   ├── OosOot.tsx         # Barr Decision Tree
│   │   │   ├── Forms.tsx          # Layer 1 + Layer 2
│   │   │   ├── Compliance.tsx     # 3 checklists
│   │   │   ├── Admin.tsx          # Users, Settings, AuditTrail, RecordTypes, Reports
│   │   │   ├── DocumentRelations.tsx  # Triggers + Relations
│   │   │   └── ScheduledReports.tsx
│   │   ├── setup/                 # SetupWizard
│   │   └── shared/                # ModuleShell, RecordLinkPanel, ElectronicSignatureModal, GlobalSearch, ErrorBoundary
│   ├── contexts/
│   │   ├── AuthContext.tsx        # Auth via API routes
│   │   └── I18nContext.tsx        # FR/EN
│   ├── hooks/
│   │   ├── useRecordWorkflow.ts   # State machine unifié
│   │   ├── useModule.ts           # CRUD générique via API
│   │   └── useApiData.ts          # Fetch générique
│   ├── lib/
│   │   ├── db.ts                  # PrismaClient
│   │   ├── auth-server.ts         # bcrypt + cookies + sessions
│   │   ├── api-helpers.ts         # apiSuccess/apiError/logAudit
│   │   ├── api-client.ts          # Client API côté client
│   │   ├── demo-store.ts          # (Legacy) Store Zustand démo
│   │   ├── document-code-convention.ts  # 10 préfixes + regex + cycle detection
│   │   ├── department-taxonomy.ts # 91 départements
│   │   ├── compliance-checklists.ts  # 3 checklists (ISO 13485, ICH Q10, IVDR)
│   │   └── i18n/fr.ts            # Traductions FR
│   └── types/
│       └── qms.ts                 # Tous les types, enums, permissions
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── eslint.config.mjs
└── .env
```

## 🔄 Migration vers Supabase/PostgreSQL

Le projet inclut 6 migrations SQL Supabase dans `supabase/migrations/` :

1. **001_initial_schema.sql** — 22 tables + vues + triggers audit
2. **002_record_type_architecture.sql** — record_type_definitions + record_links polymorphiques
3. **003_enable_rls_policies.sql** — RLS sur toutes les tables
4. **005_fix_rls_gaps_and_password_rotation.sql** — Corrections RLS + rotation mots de passe
5. **006_scoped_rls_policies.sql** — Policies multi-tenant
6. **007_audit_blockchain_fix_trigger_restoration.sql** — Audit blockchain HMAC-SHA256

### Pour déployer sur Supabase

1. Créer un projet Supabase
2. Exécuter les migrations dans l'ordre (001 → 007) via le SQL Editor
3. Configurer les variables d'environnement :
   ```env
   DATABASE_URL=postgresql://...@db.xxx.supabase.co:5432/postgres
   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   ```
4. Adapter `src/lib/db.ts` pour utiliser Supabase client au lieu de Prisma (optionnel)

## 📊 Modules QMS et sections ISO 13485

| Module | Section ISO 13485 | Description |
|--------|-------------------|-------------|
| Documents | §4.2.3 | Contrôle documentaire, hiérarchie 4 niveaux, templates |
| CAPA | §8.5.2 / §8.5.3 | Actions correctives et préventives, 5-Why, effectiveness |
| NCR | §8.3 | Non-conformités produit/processus, OOS/OOT |
| Déviations | §7.1 / §7.5.1 | Déviations planifiées et non planifiées |
| Contrôle des Changements | §7.3.7 / §8.5.1 | Gestion des modifications |
| Audits | §8.2.4 | Audit interne/externe/fournisseur |
| Risques | §7.1 + ISO 14971 | FMEA (P×I×D), gestion des risques |
| Formation | §6.2 | Compétences, formations, overdue |
| Dossiers de Lot | §7.5.1 / §7.5.9 | Traçabilité, steps, QA release |
| Fournisseurs | §7.4 | Qualification, évaluation |
| OOS/OOT | §8.2.6 | Barr Decision Tree (Phase I/II) |
| Conformité | §4.1 | 3 checklists (ISO 13485, ICH Q10, IVDR) |

## 🔐 Rôles et permissions

| Rôle | Permissions clés |
|------|-------------------|
| admin | Toutes (49 permissions) |
| quality_manager | CRUD + approbation sur tous les modules |
| auditor | Lecture + création/modification audits |
| document_controller | Documents (CRUD + delete) + Change Controls |
| executive | Lecture seule + export rapports |
| operator | NCR + Déviations + Lots (création uniquement) |

## 📝 Scripts disponibles

```bash
bun run dev          # Serveur développement
bun run build        # Build production
bun run lint         # ESLint
bun run db:push      # Synchroniser schéma Prisma → DB
bun run db:generate  # Générer Prisma Client
bun run db:reset     # Reset DB (⚠️ supprime les données)
```

## 📄 Licence

MIT

## 🤝 Contribution

Ce projet est basé sur le repo [smq-iso-13485-pro](https://github.com/mohammedboubekeurmm320-sudo/smq-iso-13485-pro) et adapté avec persistance SQLite via Prisma.
