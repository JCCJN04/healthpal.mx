## Descripción

<!-- ¿Qué cambia y por qué? Una o dos oraciones. -->

Closes #<!-- número de issue -->

## Tipo de cambio

- [ ] `feat` — Nueva funcionalidad
- [ ] `fix` — Corrección de bug
- [ ] `refactor` — Refactor sin cambio de comportamiento
- [ ] `perf` — Mejora de rendimiento
- [ ] `docs` — Solo documentación
- [ ] `chore` — Mantenimiento (deps, config, scripts)
- [ ] `security` — Parche de seguridad
- [ ] `ci` — Cambios en pipelines

## Checklist general

- [ ] El código compila sin errores (`npm run build`)
- [ ] ESLint pasa sin warnings (`npm run lint`)
- [ ] TypeScript pasa sin errores (`npx tsc --noEmit`)
- [ ] Probé el flujo manualmente en la preview de Vercel

## Checklist de privacidad y seguridad

<!-- Obligatorio para cambios que toquen datos de pacientes, autenticación o base de datos -->

- [ ] No expongo datos de pacientes en logs (uso `logger.ts`, no `console.log`)
- [ ] No expongo nombres de tablas o errores internos de Supabase en la UI
- [ ] Si agregué campos a la DB: definí RLS y verifiqué con `check_rls.sql`
- [ ] Si el cambio toca campos sensibles (nombre, diagnóstico, teléfono): confirmé que pasan por encriptación AES-256
- [ ] `npm run privacy:verify` pasa localmente
- [ ] No hay secretos, claves o tokens hardcodeados en el diff

## Capturas de pantalla (UI)

<!-- Antes / Después — omite si el cambio es solo backend o config -->

| Antes | Después |
|---|---|
|  |  |

## Notas para el reviewer

<!-- Contexto adicional, decisiones de diseño, áreas de riesgo, TODOs futuros -->
