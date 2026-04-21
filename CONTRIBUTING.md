# Guía de contribución — HealthPal.mx

## Índice

1. [Configuración inicial](#1-configuración-inicial)
2. [Estrategia de branching](#2-estrategia-de-branching)
3. [Convención de commits](#3-convención-de-commits)
4. [Flujo de trabajo (PR → main)](#4-flujo-de-trabajo)
5. [Pipeline de CI/CD](#5-pipeline-de-cicd)
6. [Versionado semántico](#6-versionado-semántico)
7. [Secretos y variables de entorno en CI](#7-secretos-y-variables-de-entorno-en-ci)
8. [Reglas de protección de ramas](#8-reglas-de-protección-de-ramas)

---

## 1. Configuración inicial

```bash
# Clonar el repositorio
git clone https://github.com/JCCJN04/healthpal.mx.git
cd healthpal.mx

# Usar la versión de Node correcta
nvm use          # requiere nvm; usa Node 20 según .nvmrc

# Instalar dependencias (instala también husky)
npm install

# Copiar variables de entorno
cp .env.example .env
# → Edita .env con tus credenciales de Supabase (pídelas al equipo)
```

Los hooks de pre-commit (`husky`) se instalan automáticamente con `npm install` gracias al script `"prepare": "husky"`.

---

## 2. Estrategia de branching

**Modelo: GitHub Flow simplificado**

Justificación: equipo pequeño, deploy continuo a Vercel en cada merge a `main`, sin necesidad de releases coordinadas largas. Se agrega `hotfix/` para urgencias en producción.

```
main          ← producción (Vercel auto-despliega en cada push)
  │
  ├── feature/whatsapp-integration    ← nueva funcionalidad
  ├── feature/patient-history-view    ← nueva funcionalidad
  ├── hotfix/fix-appointment-404      ← bug crítico en producción
  └── release/v1.2.0                  ← (opcional) para coordinar releases mayores
```

### Nomenclatura de ramas

| Tipo | Patrón | Ejemplo |
|---|---|---|
| Feature | `feature/<descripcion-corta>` | `feature/whatsapp-notifications` |
| Bug fix | `fix/<descripcion-corta>` | `fix/chat-rls-error` |
| Hotfix urgente | `hotfix/<descripcion-corta>` | `hotfix/login-token-expiry` |
| Release coordinado | `release/<version>` | `release/v2.0.0` |
| Experimento | `experiment/<descripcion>` | `experiment/ai-diagnosis-triage` |

### Reglas

- **Nunca** hacer push directo a `main` (ver §8 Protección de ramas)
- Las ramas deben abrirse desde `main` actualizado: `git pull origin main && git checkout -b feature/mi-feature`
- Borrar la rama después del merge (GitHub puede hacerlo automáticamente)
- Las ramas huérfanas listadas abajo pueden eliminarse: `arreglosMVP`, `doctor-and-patient`, `doctor-new-design`

---

## 3. Convención de commits

Este proyecto usa **Conventional Commits** v1.0. El formato exacto es validado por `commitlint` en el hook `commit-msg`.

```
<tipo>(<scope opcional>): <descripción en minúsculas>

[cuerpo opcional — explica el por qué, no el qué]

[footer opcional — BREAKING CHANGE: ... o Closes #123]
```

### Tipos válidos

| Tipo | Cuándo usarlo | Sube versión |
|---|---|---|
| `feat` | Nueva funcionalidad visible para el usuario | **minor** (0.x.0) |
| `fix` | Corrección de bug | **patch** (0.0.x) |
| `security` | Parche de seguridad o privacidad | **patch** |
| `perf` | Mejora de rendimiento sin cambio de API | **patch** |
| `revert` | Reversar un commit anterior | **patch** |
| `refactor` | Reestructura interna sin cambio de comportamiento | — |
| `docs` | Solo documentación | — |
| `test` | Agregar o corregir tests | — |
| `chore` | Mantenimiento (deps, config) | — |
| `ci` | Cambios en pipelines o GitHub Actions | — |
| `build` | Cambios en el sistema de build | — |
| `style` | Formato, espacios, sin cambio de lógica | — |

### Ejemplos reales del proyecto

```bash
# Bueno ✓
feat(appointments): agregar campo de síntomas al agendar cita
fix(chat): corregir política RLS para inserción de mensajes
security(documents): sanitizar nombre de archivo antes de subir a Storage
perf(doctor-search): agregar índice compuesto en especialidad y ciudad
refactor(auth): simplificar renovación de JWT en AuthContext
chore(deps): actualizar supabase-js a v2.45.0
ci: agregar job de escaneo de secretos con gitleaks
docs: agregar guía de onboarding en CONTRIBUTING.md

# BREAKING CHANGE (sube major)
feat(api)!: cambiar formato de respuesta de /agendar/:slug

BREAKING CHANGE: el campo `doctor_id` pasa de UUID a objeto { id, name }

# Malo ✗
git commit -m "fix stuff"
git commit -m "WIP"
git commit -m "arreglos varios"
```

> **Tip:** Si `commitlint` rechaza tu commit, revisa que el tipo sea uno de los listados arriba y que la descripción esté en minúsculas.

---

## 4. Flujo de trabajo

```bash
# 1. Crear rama desde main actualizado
git checkout main && git pull origin main
git checkout -b feature/nueva-funcionalidad

# 2. Desarrollar con commits pequeños y descriptivos
git add src/features/patient/NuevaFeature.tsx
git commit -m "feat(patient): agregar vista de historial clínico"

# 3. Mantener la rama actualizada con main
git fetch origin
git rebase origin/main   # preferir rebase sobre merge para historial limpio

# 4. Abrir Pull Request hacia main
# → Usa la plantilla en .github/pull_request_template.md
# → Verifica que todos los checks de CI pasen (ver §5)
# → Requiere al menos 1 aprobación

# 5. Merge (squash o merge commit — acordar con el equipo)
# → Vercel desplegará automáticamente a producción
# → semantic-release creará tag y CHANGELOG si hay commits relevantes
```

---

## 5. Pipeline de CI/CD

### Workflows disponibles

| Archivo | Trigger | Propósito |
|---|---|---|
| `ci.yml` | Push + PR | Lint, typecheck, privacidad, security audit, build |
| `release.yml` | Push a main | Semantic release → tag + CHANGELOG + GitHub Release |
| `privacy-guards.yml` | Push + PR | Alias legacy de checks de privacidad |

### Diagrama del pipeline

```
PR abierto / Push a feature/*
        │
        ├── [lint] ESLint + tsc --noEmit
        ├── [privacy] privacy:verify + phase4:readiness
        ├── [security] npm audit + gitleaks
        └── [build] tsc + vite build → artefacto dist/
                │
                └── (solo en push a main)
                        └── [release] semantic-release → tag vX.Y.Z + CHANGELOG
                                │
                                └── Vercel detecta push a main → deploy a producción
```

### Tiempos aproximados

- lint + typecheck: ~60s
- privacy checks: ~30s
- security audit: ~45s
- build: ~90s
- **Total en paralelo: ~2-3 min**

---

## 6. Versionado semántico

El versionado es **completamente automático** en base a los tipos de commit (ver §3).

```
feat:     → 0.1.0 → 0.2.0 → ...   (minor)
fix:      → 0.1.0 → 0.1.1 → ...   (patch)
feat!:    → 0.1.0 → 1.0.0 → ...   (major — BREAKING CHANGE)
chore/docs/refactor: → sin cambio de versión
```

El tag, el CHANGELOG y el GitHub Release se crean **automáticamente** cuando se hace merge a `main` si hay commits con impacto de versión. No hay nada que hacer manualmente.

**`CHANGELOG.md`** es generado y commiteado por `semantic-release` con el mensaje `chore(release): vX.Y.Z [skip ci]`.

---

## 7. Secretos y variables de entorno en CI

Para que el job de **build** funcione correctamente, configura estos secretos en:
**GitHub → Settings → Secrets and variables → Actions → New repository secret**

| Nombre | Descripción |
|---|---|
| `VITE_SUPABASE_URL` | URL del proyecto Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Anon key de Supabase |
| `VITE_MAPBOX_TOKEN` | Token de Mapbox |
| `VITE_DEMO_DOCTOR_ID` | UUID del doctor demo |
| `VITE_DEMO_DOCTOR_EMAIL` | Email del doctor demo |
| `VITE_DEMO_DOCTOR_PASSWORD` | Contraseña del doctor demo |

> Si los secretos no están configurados, el build de CI aún pasa (Vite embebe strings vacíos) pero el artefacto generado no funcionará correctamente. **El deploy real a producción usa los secretos configurados directamente en Vercel**, no los de GitHub Actions.

---

## 8. Reglas de protección de ramas

Configura en **GitHub → Settings → Branches → Add rule → `main`**:

```
✅ Require a pull request before merging
   ✅ Require approvals: 1
   ✅ Dismiss stale pull request approvals when new commits are pushed

✅ Require status checks to pass before merging
   Checks requeridos:
   - CI / Lint & Type Check
   - CI / Privacy Checks
   - CI / Build
   (Opcional pero recomendado: CI / Security Audit)

✅ Require branches to be up to date before merging
✅ Delete head branches automatically
❌ Allow force pushes  ← NUNCA en main
❌ Allow deletions
```

---

## Preguntas frecuentes

**¿Puedo hacer push directo a main?**
No. Las branch protection rules lo bloquean. Siempre crea un PR.

**commitlint rechazó mi commit, ¿qué hago?**
Usa `git commit --amend` para corregir el mensaje antes de hacer push. Revisa la tabla de tipos en §3.

**¿Cómo agrego un nuevo tipo de secret para producción?**
1. Agrégalo a `.env.example` (sin valor real)
2. Actualiza `src/shared/types/env.d.ts` si aplica
3. Agrégalo a la tabla en §7 de este documento
4. Configúralo en Vercel (para producción) y en GitHub Secrets (para CI)
