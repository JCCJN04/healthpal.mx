# Catálogo e Inventario de Datos Personales y de Salud (HealthPal.mx)

**Documento Oficial para Auditorías de Cumplimiento: SOC 2 Type I/II, NOM-024-SSA3-2012, NOM-004-SSA3-2012 y LFPDPPP**

---

## 1. Ficha Técnica y Marco Normativo

- **Razón Social / Plataforma:** HealthPal.mx
- **Versión del Documento:** 1.0.0
- **Fecha de Emisión:** 10 de Septiembre de 2026
- **Clasificación del Documento:** Confidencial / Auditoría
- **Normativas de Referencia:**
  1. **SOC 2 (Trust Services Criteria):** Security (CC6.1-CC6.7), Confidentiality (C1.1, C1.2), Privacy (P1.1-P8.1).
  2. **NOM-024-SSA3-2012:** Sistemas de Información de Registro Electrónico para la Salud (SIRES) e Intercambio de Información en Salud.
  3. **NOM-004-SSA3-2012:** Del Expediente Clínico (Confidencialidad, titularidad del paciente y custodia mínima de 5 años).
  4. **LFPDPPP (México):** Ley Federal de Protección de Datos Personales en Posesión de los Particulares (Art. 3 Fracc. VI sobre Datos Personales Sensibles de Salud, Art. 9 consentimiento expreso, y Art. 19 medidas de seguridad).

---

## 2. Taxonomía de Clasificación de la Información

HealthPal.mx clasifica todos los datos gestionados en 4 niveles de sensibilidad:

| Nivel  | Clasificación                                 | Definición                                                                                                                       | Requisitos de Protección                                                                                                                                                 |
| :----: | :-------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **N1** | **Datos de Identificación y Contacto (PII)**  | Datos que identifican a una persona física (paciente o médico). Ej. Nombre, CURP, correo, teléfono, fecha de nacimiento.         | Consentimiento previo, RLS estricto, cifrado en tránsito (TLS 1.3), cifrado en reposo (AES-256).                                                                         |
| **N2** | **Datos Profesionales y Credenciales**        | Información técnica y laboral del médico. Ej. Cédula profesional, especialidad, dirección de consultorio, horarios.              | Verificación de identidad médica, visibilidad pública o restringida según consentimiento del médico.                                                                     |
| **N3** | **Datos Personales Sensibles de Salud (PHI)** | Información relativa al estado de salud físico, mental, diagnósticos, recetas, cirugías, notas de evolución y estudios clínicos. | Consentimiento expreso (Art. 9 LFPDPPP), aislamiento estricto (RLS + consentimiento médico-paciente), cifrado a nivel de almacenamiento/aplicación, auditoría inmutable. |
| **N4** | **Datos Criptográficos y de Auditoría**       | Claves públicas SPKI, claves privadas envueltas (wrapped keys), nonces, tokens y logs de acceso.                                 | Acceso restringido a administradores/service_role, nunca expuestos en logs de producción.                                                                                |

---

## 3. Inventario Detallado por Entidad / Tabla de Base de Datos

### 3.1. Identidad y Perfiles de Usuario (`profiles`, `patient_profiles`, `doctor_profiles`)

| Tabla              | Campos de Datos                                                                                                                                     |    Clasificación     | Finalidad de Tratamiento                                                                | Cifrado en Tránsito | Cifrado en Reposo | Acceso (RLS)                                                | Retención                                 |
| :----------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------: | :-------------------------------------------------------------------------------------- | :-----------------: | :---------------: | :---------------------------------------------------------- | :---------------------------------------- |
| `profiles`         | `full_name`, `email`, `phone`, `curp`, `primer_apellido`, `segundo_apellido`, `birthdate`, `sex`, `avatar_url`, `estado_nacimiento`, `nacionalidad` |     **N1 (PII)**     | Identificación unívoca del paciente/doctor conforme a NOM-024 §6.5 y gestión de cuenta. |   TLS 1.3 / HTTPS   | AWS EBS (AES-256) | Propio usuario, médicos con consentimiento aceptado, admin. | Duración de la cuenta + 5 años tras baja. |
| `doctor_profiles`  | `license_number` (cédula), `specialty`, `subspecialty`, `institution`, `education`, `consultation_fee`, `bio`, `address`, `latitude`, `longitude`   | **N2 (Profesional)** | Verificación de acreditación profesional y directorio público de especialistas.         |   TLS 1.3 / HTTPS   | AWS EBS (AES-256) | Público si `is_public = true`, propio doctor y admin.       | Duración de la relación profesional.      |
| `patient_profiles` | `blood_type`, `height_cm`, `weight_kg`, `emergency_contact_name`, `emergency_contact_phone`, `insurance_company`, `insurance_policy_number`         | **N1 / N3 (Salud)**  | Ficha demográfica y de emergencias del paciente para atención clínica.                  |   TLS 1.3 / HTTPS   | AWS EBS (AES-256) | Propio paciente y doctores autorizados por consentimiento.  | Mínimo 5 años (NOM-004 §5.4).             |

---

### 3.2. Expediente Clínico Electrónico y Diagnósticos (`clinical_histories`, `notas_evolucion`, `surgery_notes`, `prescriptions`)

| Tabla                       | Campos de Datos                                                                                                                                                                               |     Clasificación     | Finalidad de Tratamiento                                              | Cifrado en Tránsito |                   Cifrado en Reposo                   | Acceso (RLS)                                                                     | Retención                                  |
| :-------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------: | :-------------------------------------------------------------------- | :-----------------: | :---------------------------------------------------: | :------------------------------------------------------------------------------- | :----------------------------------------- |
| `clinical_histories`        | `consultation_reason`, `allergies`, `family_history`, `pathological_history`, `non_pathological_history`, `gynecological_history`, `physical_exam`, `diagnostic_impression`, `treatment_plan` | **N3 (PHI Sensible)** | Historia clínica general conforme a NOM-004 §6.                       |   TLS 1.3 / HTTPS   |                   AWS EBS (AES-256)                   | Paciente titular y médicos con permiso explícito `edit_clinical_history = true`. | Mínimo 5 años obligatorios (NOM-004 §5.4). |
| `notas_evolucion`           | `motivo_consulta`, `exploracion_fisica`, `signos_vitales` (TA, FC, FR, Temp, SpO2), `diagnostico_cie10`, `plan_tratamiento`, `pronostico`                                                     | **N3 (PHI Sensible)** | Notas de evolución médica periódica conforme a NOM-004 §8.            |   TLS 1.3 / HTTPS   | AWS EBS (AES-256) + Cifrado AES-GCM por Edge Function | Doctor autor, doctores autorizados y paciente titular.                           | Mínimo 5 años obligatorios.                |
| `surgery_notes`             | `tipo_nota` (pre/post/seguimiento), `diagnostico_preoperatorio`, `operacion_realizada`, `tecnica_quirurgica`, `hallazgos`, `gasas_compresas`, `sangrado_ml`, `incidentes_accidentes`          | **N3 (PHI Sensible)** | Expediente quirúrgico obligatorio conforme a NOM-004 §8.6 y §8.8.     |   TLS 1.3 / HTTPS   |                   AWS EBS (AES-256)                   | Médico cirujano tratante y paciente titular.                                     | Mínimo 5 años obligatorios.                |
| `prescriptions`             | `folio`, `patient_name`, `patient_age`, `patient_sex`, `diagnosis`, `medications` (fármaco, dosis, vía, frecuencia), `indications`                                                            | **N3 (PHI Sensible)** | Emisión de recetas médicas electrónicas y trazabilidad farmacológica. |   TLS 1.3 / HTTPS   |                   AWS EBS (AES-256)                   | Doctor emisor y paciente receptor.                                               | Mínimo 5 años obligatorios.                |
| `patient_biometric_history` | `recorded_at`, `systolic`, `diastolic`, `heart_rate`, `glucose`, `weight_kg`, `oxygen_saturation`                                                                                             | **N3 (PHI Sensible)** | Monitoreo temporal de signos vitales del paciente.                    |   TLS 1.3 / HTTPS   |                   AWS EBS (AES-256)                   | Paciente titular y médicos con consentimiento activo.                            | Mínimo 5 años.                             |

---

### 3.3. Notas Médicas Protegidas con Cifrado de Aplicación (`appointment_notes`, `patient_notes`)

| Tabla               | Campos de Datos                                                       |          Clasificación          | Finalidad de Tratamiento                                   | Cifrado en Tránsito |                   Cifrado en Reposo                    | Acceso (RLS)                                                   | Retención                |
| :------------------ | :-------------------------------------------------------------------- | :-----------------------------: | :--------------------------------------------------------- | :-----------------: | :----------------------------------------------------: | :------------------------------------------------------------- | :----------------------- |
| `appointment_notes` | `note_enc` (bytes), `note_nonce`, `note_kid`, `note_ver`, `title`     | **N3 (PHI Altamente Sensible)** | Apuntes privados del médico generados durante la consulta. |   TLS 1.3 / HTTPS   | **AES-GCM (256 bits)** a nivel de aplicación + AWS EBS | Exclusivo del médico autor mediante Edge Function autenticada. | 5 años tras la consulta. |
| `patient_notes`     | `body_enc` (bytes), `body_nonce`, `body_kid`, `body_ver`, `body_hash` | **N3 (PHI Altamente Sensible)** | Observaciones clínicas internas sobre el paciente.         |   TLS 1.3 / HTTPS   | **AES-GCM (256 bits)** a nivel de aplicación + AWS EBS | Exclusivo del médico tratante vía Edge Function.               | 5 años tras la consulta. |

---

### 3.4. Documentos y Archivos Médicos (`documents`, `document_shares`, `document_keys`, Storage S3)

| Tabla / Recurso             | Campos de Datos                                                                                                              |     Clasificación      | Finalidad de Tratamiento                                                        | Cifrado en Tránsito |                               Cifrado en Reposo                               | Acceso (RLS)                                             | Retención                                  |
| :-------------------------- | :--------------------------------------------------------------------------------------------------------------------------- | :--------------------: | :------------------------------------------------------------------------------ | :-----------------: | :---------------------------------------------------------------------------: | :------------------------------------------------------- | :----------------------------------------- |
| `documents`                 | `title`, `category` (laboratorio, radiología, etc.), `mime_type`, `file_size`, `document_date`, `is_encrypted`, `deleted_at` | **N3 (PHI Metadatos)** | Catálogo de estudios, análisis de sangre, radiografías y reportes.              |   TLS 1.3 / HTTPS   |                               AWS EBS (AES-256)                               | Paciente propietario y médicos con acceso compartido.    | Mínimo 5 años (inmutabilidad 24h NOM-024). |
| Bucket Storage: `documents` | Archivos binarios (PDF, DICOM, JPG, PNG)                                                                                     | **N3 (PHI Archivos)**  | Almacenamiento de archivos clínicos.                                            |   TLS 1.3 / HTTPS   | **AWS S3 SSE-AES256** + Cifrado cliente **E2EE (AES-256-GCM)** cuando aplica. | URLs firmadas temporales bajo validación RLS de usuario. | Mínimo 5 años.                             |
| `document_keys`             | `wrapped_key`, `doc_iv`                                                                                                      | **N4 (Criptográfico)** | Claves AES-256 de archivos envueltas con la clave pública RSA del destinatario. |   TLS 1.3 / HTTPS   |                               AWS EBS (AES-256)                               | Usuario dueño y receptor de la clave compartida.         | Asociado a la vida del documento.          |

---

### 3.5. Consentimientos, Gobernanza y Legal (`legal_consents`, `doctor_patient_consent`)

| Tabla                    | Campos de Datos                                                                                                                                         | Clasificación  | Finalidad de Tratamiento                                                            | Cifrado en Tránsito | Cifrado en Reposo | Acceso (RLS)                                           | Retención                                    |
| :----------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------ | :------------: | :---------------------------------------------------------------------------------- | :-----------------: | :---------------: | :----------------------------------------------------- | :------------------------------------------- |
| `legal_consents`         | `terms_accepted`, `privacy_accepted`, `medical_data_consent`, `marketing_consent`, `terms_version`, `privacy_version`, `accepted_at`                    | **N1 / Legal** | Evidencia legal del consentimiento expreso bajo la LFPDPPP y Términos de Servicio.  |   TLS 1.3 / HTTPS   | AWS EBS (AES-256) | Propio usuario autenticado y auditoría administrativa. | Permanente o vigencia de la cuenta + 5 años. |
| `doctor_patient_consent` | `doctor_id`, `patient_id`, `status` (pending/accepted/revoked), `share_documents`, `share_appointments`, `share_medical_notes`, `edit_clinical_history` | **N1 / Legal** | Gestión granular de consentimiento para compartir expediente médico (NOM-024 §6.3). |   TLS 1.3 / HTTPS   | AWS EBS (AES-256) | Doctor y paciente participantes.                       | Histórico inmutable para auditoría.          |

---

### 3.6. Trazabilidad, Auditoría y Seguridad (`audit_log`, `sensitive_access_audit`)

| Tabla                    | Campos de Datos                                                                                                                                              |   Clasificación    | Finalidad de Tratamiento                                                              | Cifrado en Tránsito | Cifrado en Reposo | Acceso (RLS)                                                                           | Retención                                          |
| :----------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------: | :------------------------------------------------------------------------------------ | :-----------------: | :---------------: | :------------------------------------------------------------------------------------- | :------------------------------------------------- |
| `audit_log`              | `actor_id`, `patient_id`, `action` (view_document, update_clinical_history, etc.), `resource_type`, `resource_id`, `metadata` (IP, user agent), `created_at` | **N4 (Auditoría)** | Pista de auditoría inmutable exigida por NOM-024 §6.8 y SOC 2 CC7.2 (Log Monitoring). |   TLS 1.3 / HTTPS   | AWS EBS (AES-256) | Solo inserción autenticada; lectura reservada a admin y vista de accesos del paciente. | Mínimo 5 años inmutable (prohibido DELETE/UPDATE). |
| `sensitive_access_audit` | `actor_id`, `action`, `target_table`, `target_id`, `reason`, `success`, `created_at`                                                                         | **N4 (Auditoría)** | Registro de intentos de descifrado y lecturas sensibles.                              |   TLS 1.3 / HTTPS   | AWS EBS (AES-256) | Exclusivo de administrador del sistema.                                                | Mínimo 5 años.                                     |

---

## 4. Medidas Técnicas y Controles de Seguridad de la Información

### 4.1. Cifrado en Tránsito (_Data in Transit_)

- **Protocolos Obligatorios:** TLS 1.2 y TLS 1.3 activos en todos los endpoints de Vercel y Supabase.
- **HSTS (HTTP Strict Transport Security):** Cabecera activa con directiva `max-age=63072000; includeSubDomains; preload` (2 años).
- **Content Security Policy (CSP):** `upgrade-insecure-requests;` bloqueando contenido mixto o peticiones inseguras en el navegador.

### 4.2. Cifrado en Reposo (_Data at Rest_)

- **Infraestructura Cloud:** Volúmenes AWS EBS cifrados con AES-256 gestionados por AWS KMS.
- **Almacenamiento de Objetos (S3):** Server-Side Encryption (SSE-S3 con AES-256) habilitado por defecto.
- **Cifrado E2EE Opcional (Cliente):** Esquema criptográfico Web Crypto API:
  - RSA-OAEP de 2048 bits para pares de llaves por usuario.
  - Llaves privadas protegidas mediante PBKDF2 (600,000 iteraciones SHA-256) + AES-256-GCM.
  - Archivos cifrados individualmente con AES-256-GCM antes de subir a la red.
- **Cifrado de Columnas en Edge Functions:** Claves maestras `SENSITIVE_DATA_ENC_KEY_B64` para tablas de notas médicas.

### 4.3. Control de Acceso y Segregación (_Access Control & Tenancy_)

- **Autenticación Fuerte:** Soporte de MFA / TOTP (Google Authenticator, Authy) con enrolamiento de código QR en configuración.
- **Row Level Security (RLS):** 100% de las tablas tienen RLS habilitado en PostgreSQL. Ninguna consulta pública puede acceder a filas de pacientes sin un vínculo de consentimiento explícito (`status = 'accepted'`).
- **Principio de Mínimo Privilegio:** Usuarios conectados como `authenticated` carecen de permisos DDL (`DROP`, `ALTER`, `TRUNCATE`). La clave administrativa `SUPABASE_SERVICE_ROLE_KEY` está restringida a scripts de servidor aislados.

### 4.4. Derechos ARCO y Supresión de Datos

- **Acceso y Descarga:** El sistema cuenta con exportación completa de expediente en formato PDF conforme a NOM-024.
- **Cancelación / Inmutabilidad:** Los documentos clínicos cuentan con un periodo de inmutabilidad de 24 horas (`deleted_at`), tras el cual no se permite borrado físico (_hard delete_) para proteger la validez legal del expediente médico frente a peritajes conforme a la NOM-004.
