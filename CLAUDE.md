# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server on port 3000
npm run build        # Production build
npm run preview      # Preview production build
npm lint             # Run ESLint

# Database
npm run schema:sync          # Sync Supabase schema types
npm run schema:sync:verbose  # Verbose schema sync

# Privacy / Encryption (AES-256 backfill)
npm run privacy:verify       # Verify privacy controls
npm run privacy:backfill:dry # Dry run before encrypting records

# Demo environment
npm run demo:doctor:setup    # Create demo doctor account
```

No test runner is configured in this project.

## Architecture

HealthPal.mx is a React + TypeScript SPA (Vite) for patient–doctor healthcare in Mexico. Backend is Supabase (PostgreSQL + Auth + Storage). UI uses TailwindCSS with `#33C7BE` as the primary teal color and the `@/*` alias pointing to `src/`.

### Routing

`src/App.tsx` contains all ~146 routes with lazy loading. Three authentication guard wrappers protect routes:
- `<RequireAuth>` — must be logged in
- `<RequireRole role="doctor|patient">` — role check after auth
- `<RequireOnboarding>` — must have completed onboarding

Public routes (no auth): `/directorio`, `/agendar/:slug`, `/especialistas`, `/dr/:slug`.

### Feature modules (`src/features/`)

Code is organized by user role:
- `auth/` — login, register, forgot/reset password, email verification, and 6-step onboarding flow
- `patient/` — doctor directory, doctor detail view, patient reviews
- `doctor/` — patient management, services, availability calendar, reviews
- `shared/` — Dashboard, Documentos, Consultas, Mensajes, Calendario, Configuracion (shared between roles)
- `public/` — Public-facing pages before login
- `demo/` — Demo mode pages; mirrors doctor features without real auth

### Auth & Session (`src/app/providers/AuthContext.tsx`)

Central auth state. JWT is refreshed every 50 minutes; sessions time out after 15 minutes of inactivity. Profile creation is handled by a Supabase database trigger on `auth.users`. Onboarding progress is tracked via `profiles.onboarding_step`.

### Data fetching (`src/shared/lib/queries/`)

All Supabase queries are co-located by domain: `appointments.ts`, `chat.ts`, `documents.ts`, `profile.ts`, `publicDoctors.ts`, `notifications.ts`, `calendar.ts`, `consent.ts`, `doctorManagement.ts`, `settings.ts`. Direct `supabase-js` SDK calls with async/await. React Query (TanStack v5) is present for client-side caching in some areas.

### TypeScript types (`src/shared/types/database.ts`)

Auto-generated from the Supabase schema. Always use these types when writing queries. Run `npm run schema:sync` after schema changes.

### Key database tables

`profiles` (core user), `doctor_profiles`, `patient_profiles`, `appointments` (mode: in_person|video|phone), `documents` (category: radiology|prescription|history|lab|insurance|other), `conversations`, `doctor_schedules`, `doctor_services`, `verified_reviews`, `doctor_patient_consent`, `notifications`, `user_settings`.

Row-Level Security is enabled on all tables.

### Demo mode (`src/context/DemoContext.tsx`)

A full test environment using `src/data/demoData.ts` (mock data) and `src/data/demoConfig.ts` (credentials). Session appointments are persisted in `sessionStorage`. Demo routes are under `/demo/doctor/*`. Toggle via `DemoContext`.

### Security patterns

- **Logger** (`src/shared/lib/logger.ts`): Strips PII/JWTs/UUIDs from log output in production. Always use this logger, never raw `console.log` in feature code.
- **Error handling** (`src/shared/lib/errors.ts`): Returns user-safe messages — never expose Supabase table names or internal error hints to the UI.
- **File validation**: 10 MB limit for documents, 15 MB for avatars (pre-compression); MIME type and filename sanitization enforced in `errors.ts`.
- **Encryption**: Sensitive database fields are AES-256 encrypted via backfill scripts in `scripts/`.

### Environment variables

Required in `.env`:
```
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_MAPBOX_TOKEN          # Doctor location map
VITE_DEMO_DOCTOR_ID        # Demo mode
VITE_DEMO_DOCTOR_EMAIL
VITE_DEMO_DOCTOR_PASSWORD
```
`SUPABASE_SERVICE_ROLE_KEY` is used only by server-side scripts (never ship to the browser).
