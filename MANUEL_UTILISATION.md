# 📘 Manuel d'utilisation — QMS ISO 13485 Pro

> Guide débutant pour comprendre comment fonctionne le code, l'architecture, et comment démarrer avec le système de management de la qualité.

---

## 📑 Sommaire

1. [Vue d'ensemble](#1-vue-densemble)
2. [Architecture technique](#2-architecture-technique)
3. [Le système multi-tenant (organisations)](#3-le-système-multi-tenant-organisations)
4. [Le flux d'authentification](#4-le-flux-dauthentification)
5. [Le système QMS (entités métier)](#5-le-système-qms-entités-métier)
6. [Démarrage en local](#6-démarrage-en-local)
7. [Variables d'environnement](#7-variables-denvironnement)
8. [La base de données Supabase](#8-la-base-de-données-supabase)
9. [Déploiement sur Vercel](#9-déploiement-sur-vercel)
10. [Commandes utiles](#10-commandes-utiles)
11. [Dépannage](#11-dépannage)
12. [Glossaire](#12-glossaire)

---

## 1. Vue d'ensemble

### Qu'est-ce que ce projet ?

**QMS ISO 13485 Pro** est une application web de management de la qualité conçue pour les fabricants de dispositifs médicaux. Elle aide à respecter la norme **ISO 13485:2016** (et accessoirement ISO 14971, FDA 21 CFR Part 11, etc.).

### Fonctionnalités principales

- 📋 **Gestion documentaire** — Manuel qualité, procédures, instructions, formulaires (4 niveaux hiérarchiques)
- 🛡️ **CAPA** — Actions Correctives et Préventives
- ⚠️ **NCR** — Non-Conformités
- 🔄 **Contrôle des changements**
- 🔍 **Audits internes**
- 📊 **Gestion des risques** (FMEA)
- 🎓 **Formation** du personnel
- 🏭 **Dossiers de lot** (batch records)
- 🚚 **Fournisseurs** (qualification)
- 📈 **Tableau de bord** avec KPIs et échéances

### Stack technique en 1 phrase

> Application web **Next.js 16** (React 19) avec authentification **JWT maison** (jose + bcrypt), base de données **Supabase** (PostgreSQL), déployée sur **Vercel**.

---

## 2. Architecture technique

### Schéma global

```
┌─────────────────────────────────────────────────────────────┐
│                    NAVIGATEUR UTILISATEUR                     │
│  (React 19 + Next.js App Router + Tailwind + shadcn/ui)      │
└─────────────────────────────────────────────────────────────┘
                              │
                              │  HTTPS (cookies httpOnly)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    VERCEL (Next.js serverless)                │
│                                                               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   Middleware    │→ │   API Routes    │→ │  Lib (CRUD)  │ │
│  │ (vérif JWT +    │  │ /api/auth/*     │  │  Services    │ │
│  │  rate limit)    │  │ /api/dashboard  │  │              │ │
│  └─────────────────┘  │ /api/qms/*       │  └──────────────┘ │
│         ▲             └────────┬─────────┘                   │
│         │                      │                              │
│   Cookie session               │ Requêtes SQL                 │
│         │                      ▼                              │
└─────────┼─────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│              SUPABASE (PostgreSQL managé)                     │
│                                                               │
│  Tables: organizations, profiles, organization_members,      │
│  sessions, documents, capas, non_conformances, deviations,    │
│  change_controls, audits, risks, training, batch_records,    │
│  suppliers, audit_trails, electronic_signatures, etc.        │
│                                                               │
│  + Vues (v_current_user, v_org_dashboard)                     │
│  + Fonctions RPC (set_user_context, get_upcoming_deadlines)   │
└─────────────────────────────────────────────────────────────┘
```

### Structure des dossiers importants

```
Smq-072026/
├── src/
│   ├── app/                     # Routes Next.js (App Router)
│   │   ├── (auth)/              # Pages publiques (login, signup)
│   │   ├── (dashboard)/         # Pages privées (dashboard, qms/*)
│   │   └── api/                 # API Routes (backend)
│   │       ├── auth/            # /api/auth/login, signup, session, etc.
│   │       ├── dashboard/       # /api/dashboard
│   │       ├── qms/             # /api/qms/[entity] — CRUD générique
│   │       └── admin/           # /api/admin/users, settings
│   ├── components/              # Composants React
│   │   ├── ui/                  # shadcn/ui (boutons, inputs, etc.)
│   │   ├── qms/                 # Composants QMS (Sidebar, OrgSwitcher)
│   │   ├── dashboard/           # KpiCards, StatusCharts, DeadlinesPanel
│   │   └── shared/              # ErrorBoundary, GlobalSearch, etc.
│   ├── contexts/                # React Contexts
│   │   ├── AuthContext.tsx      # Gestion de l'authentification
│   │   └── I18nContext.tsx      # Internationalisation FR/EN
│   ├── lib/                     # Logique métier réutilisable
│   │   ├── session.ts           # Sign/Vérify JWT (jose)
│   │   ├── auth-server.ts       # hashPassword, getServerSession
│   │   ├── supabase/            # Clients Supabase
│   │   ├── crud-service.ts      # Service CRUD générique (filtrage org)
│   │   ├── api-client.ts        # Helper fetch côté client
│   │   └── rate-limit.ts        # Rate limiting (token bucket)
│   ├── hooks/                   # React Hooks
│   │   ├── useQmsQuery.ts       # React Query pour les entités QMS
│   │   └── useApiData.ts        # Hook générique de fetch
│   ├── types/                   # Types TypeScript
│   └── middleware.ts            # Middleware Next.js (vérif session)
├── supabase/
│   └── migrations/              # Fichiers SQL de migration
└── prisma/
    └── schema.prisma            # Schéma Prisma (pour référence)
```

---

## 3. Le système multi-tenant (organisations)

### Principe

Chaque organisation (entreprise) a ses propres données, totalement isolées des autres. Un utilisateur appartient à une ou plusieurs organisations via la table `organization_members`.

### Modèle de données

```
┌──────────────────┐     ┌──────────────────────────┐     ┌──────────────┐
│  organizations   │     │  organization_members    │     │   profiles   │
├──────────────────┤     ├──────────────────────────┤     ├──────────────┤
│ id               │◄──┐ │ id                       │ ┌──►│ id           │
│ name             │   │ │ organization_id ─────────┘ │   │ email        │
│ slug             │   │ │ user_id ──────────────────┘   │ full_name    │
│ settings (JSON)  │   └─│ role (owner/admin/member)    │ password_hash│
│ created_at       │     │ status (active/pending)      │ role         │
│ updated_at       │     │ created_at                   │ organization │
└──────────────────┘     └──────────────────────────────┤_id           │
                                                      │ active       │
                                                      └──────────────┘
```

### Rôles possibles dans `organization_members`

| Rôle | Droits |
|------|--------|
| `owner` | Tout, y compris supprimer l'org |
| `admin` | Gérer les users, tous droits métier |
| `member` | Droits métier standards |
| `viewer` | Lecture seule |

### Comment l'isolation est garantie

**Côté backend** (`src/lib/crud-service.ts`), chaque requête SQL filtre automatiquement par `organization_id` :

```ts
// Pour les entités qui ont organization_id
if (ORG_SCOPED_ENTITIES.has(options.entity)) {
  query = query.eq('organization_id', organizationId)  // ← filtrage auto
}
```

L'`organizationId` est **toujours dérivé du JWT côté serveur**, jamais du client. C'est la défense en profondeur.

---

## 4. Le flux d'authentification

### Inscription (signup)

```
1. Utilisateur remplit le formulaire /signup
   (email, password 12+ chars complexe, fullName, orgName, industry)
                    │
                    ▼
2. POST /api/auth/signup
   - Validation email + force du mot de passe
   - Vérifier email unique dans profiles
   - INSERT organizations (id, name, slug, settings, updated_at)
   - INSERT profiles (id, email, full_name, password_hash, organization_id, updated_at)
   - INSERT organization_members (user_id, organization_id, role='owner')
   - INSERT sessions (id, token, profile_id, expires_at)
   - Poser cookie httpOnly 'session' (JWT signé avec SESSION_SECRET)
   - Poser cookie 'current_org_id'
                    │
                    ▼
3. Redirection vers /login?registered=1
   (ou directement /dashboard si pas de redirection)
```

### Connexion (login)

```
1. Utilisateur entre email + password sur /login
                    │
                    ▼
2. POST /api/auth/login
   - SELECT profiles WHERE email = ?
   - Vérifier password avec bcrypt.compare(password, password_hash)
   - Vérifier profile.active = true
   - SELECT organization_members WHERE user_id = profile.id
   - INSERT sessions (nouvelle session, expire dans 24h)
   - Signer JWT avec { sub, email, role, organizationId, sid }
   - Poser cookie httpOnly 'session' (maxAge: 24h)
                    │
                    ▼
3. AuthContext.refreshSession() est appelé
   - GET /api/auth/session
   - Récupère profile + memberships depuis v_current_user
   - setUser({ id, email, full_name, role })
                    │
                    ▼
4. router.push('/dashboard')
```

### Vérification à chaque requête (middleware)

```
Chaque requête vers /api/* ou /dashboard passe par src/middleware.ts:

1. Si path public (/login, /signup, /api/auth/login, etc.) → laisser passer
2. Lire cookie 'session'
3. Vérifier signature JWT (jose.jwtVerify avec SESSION_SECRET)
4. Si JWT invalide → 401 (API) ou redirect /login (page)
5. Vérifier que la session existe encore en DB (table sessions)
   - Si expirée ou supprimée → 401 ou redirect /login
6. Injecter headers x-profile-id, x-org-id, x-user-role dans la requête
7. Laisser passer vers l'API route
```

### Déconnexion (logout)

```
POST /api/auth/logout
  - DELETE FROM sessions WHERE id = payload.sid
  - Effacer les cookies 'session' et 'current_org_id'
  - Redirection vers /login
```

---

## 5. Le système QMS (entités métier)

### Le CRUD générique

Le système utilise une **API générique** pour toutes les entités QMS. Au lieu d'avoir une route `/api/capas`, `/api/ncrs`, `/api/audits`, etc., il y a une seule route :

```
GET    /api/qms/[entity]              → liste
POST   /api/qms/[entity]              → créer
GET    /api/qms/[entity]/[id]         → détail
PUT    /api/qms/[entity]/[id]         → modifier
DELETE /api/qms/[entity]/[id]         → supprimer
POST   /api/qms/[entity]/[id]/transition → changer de statut
```

Où `[entity]` est l'un des slugs suivants : `capas`, `ncrs`, `deviations`, `change_controls`, `audits`, `risks`, `training`, `suppliers`, `batch_records`, `documents`, etc.

### Exemple : créer une CAPA

```ts
// Côté frontend
const { create } = useQmsEntity('capas')
await create({
  title: "Défaut sur pièce P-100",
  description: "Description détaillée...",
  priority: "high",
  // organization_id est injecté automatiquement côté serveur
  // created_by_id est injecté automatiquement
  // capa_number est généré automatiquement (CAPA-2026-0001)
})
```

### Numérotation automatique

Chaque entité a un numéro métier auto-généré au format `PREFIX-YYYY-NNNN` :

| Entité | Préfixe | Exemple |
|--------|---------|---------|
| CAPA | CAPA | CAPA-2026-0001 |
| NCR | NCR | NCR-2026-0001 |
| Déviation | DEV | DEV-2026-0001 |
| Contrôle changement | CC | CC-2026-0001 |
| Audit | AUD | AUD-2026-0001 |
| Risque | RISK | RISK-2026-0001 |
| Document | DOC | DOC-2026-0001 |
| Fournisseur | SUP | SUP-2026-0001 |
| Lot | BAT | BAT-2026-0001 |

### Workflow de statuts

Chaque entité a son propre workflow. Exemple pour les CAPAs :

```
Open → Investigation → Implementation → Effectiveness Check → Closed
```

Les transitions sont validées par la fonction RPC PostgreSQL `validate_status_transition`.

### Signature électronique (21 CFR Part 11)

Pour les transitions sensibles (Close, Approve, etc.), l'utilisateur doit signer électroniquement avec son mot de passe. Le hash HMAC-SHA256 est stocké dans `electronic_signatures` avec :
- `user_id`
- `document_id` (ou record)
- `meaning` (ex: "Approved", "Closed")
- `signature_hash`
- `timestamp`
- `ip_address`

---

## 6. Démarrage en local

### Prérequis

- **Node.js 18+** (recommandé 20+)
- **npm** ou **bun**
- Un compte **Supabase** (gratuit)
- Un compte **Vercel** (gratuit, pour le déploiement)

### Installation

```bash
# 1. Cloner le dépôt
git clone https://github.com/mohammedboubekeurmm320-sudo/Smq-072026.git
cd Smq-072026

# 2. Installer les dépendances
npm install
# ou: bun install

# 3. Copier le fichier d'environnement
cp .env.example .env.local

# 4. Éditer .env.local avec vos vraies valeurs (voir section 7)

# 5. Lancer en développement
npm run dev
```

L'application sera disponible sur **http://localhost:3000**.

---

## 7. Variables d'environnement

### Liste complète

Créez un fichier `.env.local` à la racine du projet avec :

```bash
# === SUPABASE ===
# Trouvez ces valeurs dans Supabase Dashboard → Project Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://votre-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...    # service_role key

# === SESSION (JWT) ===
# Générer avec: openssl rand -base64 48
SESSION_SECRET=votre-secret-de-48-caracteres-ou-plus

# === SIGNATURE ÉLECTRONIQUE (21 CFR Part 11) ===
# Générer avec: openssl rand -base64 48
SIGNATURE_SECRET=votre-autre-secret-de-48-caracteres

# === APP ===
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

### ⚠️ Sécurité importante

- **NE JAMAIS** committer le fichier `.env.local` dans Git
- **NE JAMAIS** partager ces valeurs dans une conversation, un email ou un ticket
- Le fichier `.env.example` (sans vraies valeurs) est commitable, pas `.env.local`
- Sur Vercel, ces variables vont dans **Project Settings → Environment Variables**

---

## 8. La base de données Supabase

### Création du projet Supabase

1. Allez sur https://supabase.com
2. Créez un nouveau projet (gratuit pour débuter)
3. Notez l'URL (`https://xxxx.supabase.co`) et la `service_role` key
4. Mettez ces valeurs dans `.env.local`

### Appliquer les migrations SQL

Les fichiers SQL sont dans `supabase/migrations/`. Ils doivent être exécutés **dans l'ordre** :

1. Allez dans **Supabase Dashboard → SQL Editor**
2. Pour chaque fichier (dans l'ordre numérique) :
   - Ouvrez un New Query
   - Collez le contenu du fichier
   - Cliquez sur **Run**

Ordre recommandé :
```
000_prisma_base_tables.sql        → crée toutes les tables
002_rls_and_helpers.sql           → active RLS + fonctions helper
003_audit_triggers.sql            → triggers d'audit
004_missing_rpcs_views_triggers.sql → RPC + vues + triggers manquants
005_fix_004_bugs.sql              → correctifs
006_role_enum.sql                 → enum pour les rôles
007_p0_gaps_fix.sql               → correctifs P0
008_optimized_indexes.sql         → indexes (attention: user_id pas profile_id)
009_p2_hierarchy_enhancements.sql → hiérarchie documents
010_document_review_workflow.sql  → workflow de revue
011_fix_audit_trigger_org_id.sql  → fix trigger audit
012_fix_v_current_user_and_org_members.sql → fix vue (utilise user_id)
013_fix_get_upcoming_deadlines.sql → fix RPC deadlines
014_drop_old_get_upcoming_deadlines.sql → supprime l'ancienne signature
```

### Vérifier que la DB est correcte

Exécutez le script `supabase/diagnostic_schema.sql` dans SQL Editor. Vous devriez voir :
- ~25 tables dans `public`
- La vue `v_current_user` qui utilise `om.user_id` (pas `profile_id`)
- Les fonctions `set_user_context`, `get_upcoming_deadlines`, `validate_status_transition`

---

## 9. Déploiement sur Vercel

### Étapes

1. Poussez votre code sur GitHub (branche `main`)
2. Allez sur https://vercel.com → **New Project**
3. Importez le dépôt GitHub `Smq-072026`
4. Vercel détecte automatiquement Next.js — **ne changez rien aux paramètres build**
5. **Ajoutez les variables d'environnement** (Project Settings → Environment Variables) :
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SESSION_SECRET` (utilisez `openssl rand -base64 48` pour générer)
   - `SIGNATURE_SECRET` (idem)
   - `NEXT_PUBLIC_APP_URL` = l'URL Vercel (ex: `https://smq-072026.vercel.app`)
   - `NODE_ENV` = `production`
6. Cliquez sur **Deploy**
7. Attendez 2-3 minutes que le build se termine

### Déploiements automatiques

Par défaut, chaque `git push` sur `main` déclenche un nouveau déploiement. Vercel vous notifie par email en cas d'échec.

### Voir les logs

Vercel Dashboard → votre projet → onglet **Logs**. Vous y verrez :
- Les `console.error` du middleware
- Les erreurs 500 des API routes
- Les cold starts

---

## 10. Commandes utiles

### Développement

```bash
npm run dev          # Lancer en développement (http://localhost:3000)
npm run build        # Build de production (vérifie les erreurs)
npm run start        # Lancer le build de production
npm run lint         # Linter ESLint
npm run test         # Tests unitaires (Vitest)
npm run test:watch   # Tests en mode watch
```

### Base de données (Prisma)

```bash
npm run db:push      # Synchroniser le schéma Prisma avec la DB
npm run db:generate  # Régénérer le client Prisma
npm run db:migrate   # Créer et appliquer une migration
npm run db:reset     # Réinitialiser la DB (⚠️ destructif)
```

### Git

```bash
git status                    # Voir les fichiers modifiés
git add .                     # Stage tous les changements
git commit -m "message"       # Commiter
git push origin main          # Pousser sur GitHub
git pull --rebase origin main # Récupérer les changements distants
git log --oneline -10         # Voir les 10 derniers commits
```

---

## 11. Dépannage

### Problèmes courants et solutions

#### "Session crashe / redirection vers /login"

**Causes possibles :**
1. `SESSION_SECRET` manquant ou différent entre Vercel et local
2. Race condition dans `AuthContext` (déjà corrigé dans le commit `b326abc`)
3. Crash React non géré (vérifiez la console F12)

**Solution :**
- Vérifiez les variables d'environnement Vercel
- Ouvrez la console F12 → onglet Console → cherchez les erreurs rouges
- Appelez `/api/auth/debug-session` dans le navigateur pour diagnostiquer

#### "Impossible de créer un compte"

**Causes possibles :**
1. Mot de passe trop faible (12 caractères min. avec majuscule + minuscule + chiffre + spécial)
2. Email déjà utilisé
3. Email déjà utilisé par une organization orpheline (lancer le cleanup SQL)

**Solution :**
- Utilisez un mot de passe comme `TestQMS2026!`
- Essayez un email jamais utilisé
- Si ça persiste, ouvrez DevTools → Network → cliquez sur `/api/auth/signup` → onglet Response → lisez le message d'erreur exact

#### "null value in column updated_at"

**Cause :** L'INSERT ne fournit pas `updated_at` alors que la colonne est NOT NULL.

**Tables concernées :** `organizations`, `profiles` (elles ont `updated_at NOT NULL` sans DEFAULT).

**Tables NON concernées :** `organization_members`, `sessions` (pas de colonne `updated_at`).

#### "e.filter is not a function"

**Cause :** Une API retourne un objet erreur au lieu d'un array, et le code frontend appelle `.filter()` dessus.

**Solution :** Toujours wrapper les réponses API avec `Array.isArray(x) ? x : []` avant d'appeler `.filter`/`.map`/`.slice`. Voir le pattern dans `DeadlinesPanel.tsx` et `NotificationBell.tsx`.

#### "Failed to fetch" ou erreurs CORS

**Cause :** Variables d'environnement mal configurées, ou URL Supabase incorrecte.

**Solution :**
- Vérifiez `NEXT_PUBLIC_SUPABASE_URL` (doit commencer par `https://` et finir par `.supabase.co`)
- Vérifiez que la `service_role` key est complète (commence par `eyJ...`)

#### Page blanche après login

**Cause :** Crash React non géré.

**Solution :**
- Ouvrez F12 → Console → cherchez l'erreur
- Vérifiez que `<ErrorBoundary>` est bien dans le layout
- Si vous voyez une erreur, isolez-la et ajoutez un `try/catch` ou un `Array.isArray`

---

## 12. Glossaire

| Terme | Définition |
|-------|------------|
| **QMS** | Quality Management System — Système de Management de la Qualité |
| **ISO 13485** | Norme internationale pour les dispositifs médicaux |
| **CAPA** | Corrective and Preventive Action — Action corrective/préventive |
| **NCR** | Non-Conformance Report — Rapport de non-conformité |
| **FMEA** | Failure Modes and Effects Analysis — Analyse des modes de défaillance |
| **21 CFR Part 11** | Règlement FDA sur les signatures électroniques |
| **JWT** | JSON Web Token — token d'authentification signé |
| **Multi-tenant** | Architecture où plusieurs orgs partagent la même app, avec isolation des données |
| **RLS** | Row-Level Security — sécurité PostgreSQL au niveau des lignes |
| **RPC** | Remote Procedure Call — fonction SQL appelable depuis l'API |
| **Middleware** | Code exécuté avant chaque requête (vérif auth, rate limit) |
| **Serverless** | Architecture sans serveur dédié (Vercel exécute le code à la demande) |
| **Cold start** | Délai initial quand une fonction serverless est invoquée pour la 1ère fois |
| **shadcn/ui** | Bibliothèque de composants React basée sur Radix UI + Tailwind |
| **React Query** | Bibliothèque de gestion d'état serveur (cache, refetch, mutations) |

---

## 📚 Pour aller plus loin

### Documentation officielle

- **Next.js 16** : https://nextjs.org/docs
- **Supabase** : https://supabase.com/docs
- **Vercel** : https://vercel.com/docs
- **React Query** : https://tanstack.com/query/latest
- **shadcn/ui** : https://ui.shadcn.com
- **Tailwind CSS** : https://tailwindcss.com/docs

### Normes qualité

- **ISO 13485:2016** : https://www.iso.org/standard/59702.html
- **ISO 14971:2019** (risques) : https://www.iso.org/standard/72704.html
- **FDA 21 CFR Part 11** : https://www.fda.gov/regulatory-information/search-fda-guidance-documents

### Bonnes pratiques

- **Sécurité** : Ne jamais logger ou exposer les mots de passe, tokens, ou keys
- **Performance** : Utiliser `useQuery` de React Query pour le cache automatique
- **Accessibilité** : shadcn/ui est accessible par défaut (ARIA, keyboard nav)
- **Tests** : Écrire des tests Vitest pour les fonctions critiques (auth, CRUD)
- **Migration DB** : Toujours tester sur un environnement de dev avant la prod

---

## 🆘 Support

Si vous rencontrez un problème :

1. **Lisez les logs Vercel** (Dashboard → Logs)
2. **Vérifiez la console F12** (erreurs JavaScript)
3. **Appelez `/api/auth/debug`** pour diagnostiquer l'auth
4. **Appelez `/api/auth/debug-session`** pour diagnostiquer le middleware
5. **Exécutez `supabase/diagnostic_schema.sql`** pour vérifier la DB

---

## ⚠️ Sécurité — À lire absolument

### Secrets à ne JAMAIS exposer

- `SUPABASE_SERVICE_ROLE_KEY` — donne accès admin complet à votre DB
- `SESSION_SECRET` — permet de forger des JWT valides
- `SIGNATURE_SECRET` — permet de forger des signatures électroniques
- Password DB Supabase direct — accès root PostgreSQL
- GitHub PAT — accès écriture à votre dépôt

### Bonnes pratiques

- ✅ Utilisez des **variables d'environnement** (Vercel, `.env.local`)
- ✅ Activez le **secret scanning** sur GitHub (Settings → Code security)
- ✅ Faites des **rotations régulières** des secrets (tous les 6 mois)
- ✅ Utilisez des **mots de passe uniques** pour chaque service
- ❌ Ne commitez JAMAIS `.env.local`
- ❌ Ne partagez JAMAIS un secret en clair (email, chat, ticket)
- ❌ Ne réutilisez pas le même `SESSION_SECRET` en dev et prod

---

**Dernière mise à jour** : Juillet 2026
**Version du document** : 1.0
**Projet** : QMS ISO 13485 Pro — Smq-072026
