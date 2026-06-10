# Cambios NOM-024-SSA3-2012

## Base de datos
- **Migración `nom024_curp_identity`** — Agrega `curp`, `primer_apellido`, `segundo_apellido`, `estado_nacimiento`, `nacionalidad` a `profiles`
- **Migración `nom024_audit_log`** — Tabla `audit_log` + triggers en documents/appointments/consent + RPC `log_audit_event` (SECURITY DEFINER)
- **Migración `nom024_document_immutability`** — `deleted_at` en documents, trigger que bloquea hard DELETE después de 24h
- **Fix RLS** — Política `profiles_update_own_safe` causaba recursión infinita; reemplazada con función `get_my_role()` SECURITY DEFINER

## Edge Functions
- **`create-patient-direct` v2** — Agrega `localhost:3000` y `localhost:5173` a CORS allowed origins

## Nuevos archivos
- `src/shared/lib/curp.ts` — Validación y normalización de CURP, catálogo INEGI
- `src/shared/lib/audit.ts` — Cliente de auditoría no-bloqueante
- `src/shared/lib/queries/exportData.ts` — Exportación PDF del expediente (pdf-lib)
- `src/shared/components/settings/MfaCard.tsx` — Enrolamiento TOTP completo con QR y clave copiable
- `src/shared/components/settings/DataExportCard.tsx` — Descarga PDF del expediente
- `src/shared/components/settings/AccessHistoryCard.tsx` — Historial de accesos colapsable (audit_log)
- `src/features/auth/pages/MfaVerify.tsx` — Pantalla de verificación TOTP post-login

## Archivos modificados
- `src/shared/types/database.ts` — Tipos NOM-024 en profiles, tabla audit_log
- `src/shared/components/settings/PersonalInfoCard.tsx` — Campos CURP, apellidos, estado de nacimiento
- `src/features/shared/pages/Configuracion.tsx` — MfaCard, DataExportCard, AccessHistoryCard; guarda campos NOM-024
- `src/features/auth/pages/Login.tsx` — Redirección a MFA si AAL2 requerido
- `src/features/auth/pages/onboarding/OnboardingBasic.tsx` — Recopila campos NOM-024
- `src/app/providers/AuthContext.tsx` — `auditLog.login()` deduplicado por access_token
- `src/shared/lib/queries/documents.ts` — Filtro `deleted_at IS NULL`, soft-delete
- `src/shared/lib/queries/clinicalHistory.ts` — Audit al leer historial
- `src/features/shared/pages/DocumentDetail.tsx` — Audit al abrir documento
- `src/shared/components/documents/DocumentPreviewModal.tsx` — Audit al descargar
- `src/App.tsx` — Ruta `/auth/mfa`
