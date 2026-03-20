# Supabase Database Schema

Generated from live Supabase state on 2026-03-19T21:42:29.506Z.

## Sync Metadata

- Source of truth: live Supabase project (kxdxeobrcdoccqvqkvfw)
- Extraction method: Supabase CLI dry-run credentials + Docker pg_dump/psql introspection
- Data rows: excluded (schema only)

## Security Review Flags

### Public Read Policies (RLS)
- public.doctor_insurances -> doctor_insurances_select
- public.doctor_profiles -> Doctor profiles are viewable by everyone
- public.doctor_profiles -> doctor_profiles_public_read
- public.doctor_schedules -> Public profiles are viewable by everyone.
- public.doctor_services -> doctor_services_select
- public.specialties -> specialties_public_read
- public.verified_reviews -> reviews_read_all
- public.verified_reviews -> reviews_select
- public.verified_reviews -> verified_reviews_select_public

### Sensitive Relations
- auth.identities.user_id -> auth.users.id
- auth.mfa_factors.user_id -> auth.users.id
- auth.oauth_authorizations.user_id -> auth.users.id
- auth.oauth_consents.user_id -> auth.users.id
- auth.one_time_tokens.user_id -> auth.users.id
- auth.sessions.user_id -> auth.users.id
- public.appointments.doctor_id -> public.profiles.id
- public.appointments.patient_id -> public.profiles.id
- public.care_links.doctor_id -> public.profiles.id
- public.care_links.patient_id -> public.profiles.id
- public.conversation_participants.user_id -> public.profiles.id
- public.doctor_insurances.doctor_id -> public.doctor_profiles.doctor_id
- public.doctor_patient_consent.doctor_id -> public.profiles.id
- public.doctor_patient_consent.patient_id -> public.profiles.id
- public.doctor_profiles.doctor_id -> public.profiles.id
- public.doctor_schedules.doctor_id -> public.doctor_profiles.doctor_id
- public.doctor_services.doctor_id -> public.doctor_profiles.doctor_id
- public.document_folders.owner_id -> public.profiles.id
- public.documents.owner_id -> public.profiles.id
- public.documents.patient_id -> public.profiles.id
- public.folders.owner_id -> auth.users.id
- public.notifications.user_id -> public.profiles.id
- public.patient_notes.doctor_id -> public.profiles.id
- public.patient_notes.patient_id -> public.profiles.id
- public.patient_profiles.patient_id -> public.profiles.id
- public.user_settings.user_id -> public.profiles.id
- public.user_status.user_id -> auth.users.id
- public.verified_reviews.doctor_id -> public.doctor_profiles.doctor_id
- public.verified_reviews.patient_id -> public.patient_profiles.patient_id

## Tables

### auth.audit_log_entries

- Description: Primary records for audit log entries.
- RLS enabled: true
- RLS forced: false

#### Columns

| Column | Type | Nullable | Default | Sensitive |
|---|---|---|---|---|
| instance_id | uuid | YES |  | no |
| id | uuid | NO |  | no |
| payload | json | YES |  | no |
| created_at | timestamp with time zone | YES |  | no |
| ip_address | character varying(64) | NO | ''::character varying | no |

#### Constraints

- audit_log_entries_pkey (p): PRIMARY KEY (id)

#### Relationships (FK)

- None

### auth.custom_oauth_providers

- Description: Primary records for custom oauth providers.
- RLS enabled: false
- RLS forced: false

#### Columns

| Column | Type | Nullable | Default | Sensitive |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | no |
| provider_type | text | NO |  | no |
| identifier | text | NO |  | no |
| name | text | NO |  | no |
| client_id | text | NO |  | no |
| client_secret | text | NO |  | no |
| acceptable_client_ids | text[] | NO | '{}'::text[] | no |
| scopes | text[] | NO | '{}'::text[] | no |
| pkce_enabled | boolean | NO | true | no |
| attribute_mapping | jsonb | NO | '{}'::jsonb | no |
| authorization_params | jsonb | NO | '{}'::jsonb | no |
| enabled | boolean | NO | true | no |
| email_optional | boolean | NO | false | no |
| issuer | text | YES |  | no |
| discovery_url | text | YES |  | no |
| skip_nonce_check | boolean | NO | false | no |
| cached_discovery | jsonb | YES |  | no |
| discovery_cached_at | timestamp with time zone | YES |  | no |
| authorization_url | text | YES |  | no |
| token_url | text | YES |  | no |
| userinfo_url | text | YES |  | no |
| jwks_uri | text | YES |  | no |
| created_at | timestamp with time zone | NO | now() | no |
| updated_at | timestamp with time zone | NO | now() | no |

#### Constraints

- custom_oauth_providers_authorization_url_https (c): CHECK (authorization_url IS NULL OR authorization_url ~~ 'https://%'::text)
- custom_oauth_providers_authorization_url_length (c): CHECK (authorization_url IS NULL OR char_length(authorization_url) <= 2048)
- custom_oauth_providers_client_id_length (c): CHECK (char_length(client_id) >= 1 AND char_length(client_id) <= 512)
- custom_oauth_providers_discovery_url_length (c): CHECK (discovery_url IS NULL OR char_length(discovery_url) <= 2048)
- custom_oauth_providers_identifier_format (c): CHECK (identifier ~ '^[a-z0-9][a-z0-9:-]{0,48}[a-z0-9]$'::text)
- custom_oauth_providers_identifier_key (u): UNIQUE (identifier)
- custom_oauth_providers_issuer_length (c): CHECK (issuer IS NULL OR char_length(issuer) >= 1 AND char_length(issuer) <= 2048)
- custom_oauth_providers_jwks_uri_https (c): CHECK (jwks_uri IS NULL OR jwks_uri ~~ 'https://%'::text)
- custom_oauth_providers_jwks_uri_length (c): CHECK (jwks_uri IS NULL OR char_length(jwks_uri) <= 2048)
- custom_oauth_providers_name_length (c): CHECK (char_length(name) >= 1 AND char_length(name) <= 100)
- custom_oauth_providers_oauth2_requires_endpoints (c): CHECK (provider_type <> 'oauth2'::text OR authorization_url IS NOT NULL AND token_url IS NOT NULL AND userinfo_url IS NOT NULL)
- custom_oauth_providers_oidc_discovery_url_https (c): CHECK (provider_type <> 'oidc'::text OR discovery_url IS NULL OR discovery_url ~~ 'https://%'::text)
- custom_oauth_providers_oidc_issuer_https (c): CHECK (provider_type <> 'oidc'::text OR issuer IS NULL OR issuer ~~ 'https://%'::text)
- custom_oauth_providers_oidc_requires_issuer (c): CHECK (provider_type <> 'oidc'::text OR issuer IS NOT NULL)
- custom_oauth_providers_pkey (p): PRIMARY KEY (id)
- custom_oauth_providers_provider_type_check (c): CHECK (provider_type = ANY (ARRAY['oauth2'::text, 'oidc'::text]))
- custom_oauth_providers_token_url_https (c): CHECK (token_url IS NULL OR token_url ~~ 'https://%'::text)
- custom_oauth_providers_token_url_length (c): CHECK (token_url IS NULL OR char_length(token_url) <= 2048)
- custom_oauth_providers_userinfo_url_https (c): CHECK (userinfo_url IS NULL OR userinfo_url ~~ 'https://%'::text)
- custom_oauth_providers_userinfo_url_length (c): CHECK (userinfo_url IS NULL OR char_length(userinfo_url) <= 2048)

#### Relationships (FK)

- None

### auth.flow_state

- Description: Primary records for flow state.
- RLS enabled: true
- RLS forced: false

#### Columns

| Column | Type | Nullable | Default | Sensitive |
|---|---|---|---|---|
| id | uuid | NO |  | no |
| user_id | uuid | YES |  | yes |
| auth_code | text | YES |  | no |
| code_challenge_method | auth.code_challenge_method | YES |  | no |
| code_challenge | text | YES |  | no |
| provider_type | text | NO |  | no |
| provider_access_token | text | YES |  | no |
| provider_refresh_token | text | YES |  | no |
| created_at | timestamp with time zone | YES |  | no |
| updated_at | timestamp with time zone | YES |  | no |
| authentication_method | text | NO |  | no |
| auth_code_issued_at | timestamp with time zone | YES |  | no |
| invite_token | text | YES |  | no |
| referrer | text | YES |  | no |
| oauth_client_state_id | uuid | YES |  | no |
| linking_target_id | uuid | YES |  | no |
| email_optional | boolean | NO | false | no |

#### Constraints

- flow_state_pkey (p): PRIMARY KEY (id)

#### Relationships (FK)

- None

### auth.identities

- Description: Primary records for identities.
- RLS enabled: true
- RLS forced: false

#### Columns

| Column | Type | Nullable | Default | Sensitive |
|---|---|---|---|---|
| provider_id | text | NO |  | no |
| user_id | uuid | NO |  | yes |
| identity_data | jsonb | NO |  | no |
| provider | text | NO |  | no |
| last_sign_in_at | timestamp with time zone | YES |  | no |
| created_at | timestamp with time zone | YES |  | no |
| updated_at | timestamp with time zone | YES |  | no |
| email | text | YES | lower((identity_data ->> 'email'::text)) | no |
| id | uuid | NO | gen_random_uuid() | no |

#### Constraints

- identities_pkey (p): PRIMARY KEY (id)
- identities_provider_id_provider_unique (u): UNIQUE (provider_id, provider)
- identities_user_id_fkey (f): FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE

#### Relationships (FK)

- user_id -> auth.users.id [SENSITIVE]

### auth.instances

- Description: Primary records for instances.
- RLS enabled: true
- RLS forced: false

#### Columns

| Column | Type | Nullable | Default | Sensitive |
|---|---|---|---|---|
| id | uuid | NO |  | no |
| uuid | uuid | YES |  | no |
| raw_base_config | text | YES |  | no |
| created_at | timestamp with time zone | YES |  | no |
| updated_at | timestamp with time zone | YES |  | no |

#### Constraints

- instances_pkey (p): PRIMARY KEY (id)

#### Relationships (FK)

- None

### auth.mfa_amr_claims

- Description: Primary records for mfa amr claims.
- RLS enabled: true
- RLS forced: false

#### Columns

| Column | Type | Nullable | Default | Sensitive |
|---|---|---|---|---|
| session_id | uuid | NO |  | no |
| created_at | timestamp with time zone | NO |  | no |
| updated_at | timestamp with time zone | NO |  | no |
| authentication_method | text | NO |  | no |
| id | uuid | NO |  | no |

#### Constraints

- amr_id_pk (p): PRIMARY KEY (id)
- mfa_amr_claims_session_id_authentication_method_pkey (u): UNIQUE (session_id, authentication_method)
- mfa_amr_claims_session_id_fkey (f): FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE

#### Relationships (FK)

- session_id -> auth.sessions.id

### auth.mfa_challenges

- Description: Primary records for mfa challenges.
- RLS enabled: true
- RLS forced: false

#### Columns

| Column | Type | Nullable | Default | Sensitive |
|---|---|---|---|---|
| id | uuid | NO |  | no |
| factor_id | uuid | NO |  | no |
| created_at | timestamp with time zone | NO |  | no |
| verified_at | timestamp with time zone | YES |  | no |
| ip_address | inet | NO |  | no |
| otp_code | text | YES |  | no |
| web_authn_session_data | jsonb | YES |  | no |

#### Constraints

- mfa_challenges_auth_factor_id_fkey (f): FOREIGN KEY (factor_id) REFERENCES auth.mfa_factors(id) ON DELETE CASCADE
- mfa_challenges_pkey (p): PRIMARY KEY (id)

#### Relationships (FK)

- factor_id -> auth.mfa_factors.id

### auth.mfa_factors

- Description: Primary records for mfa factors.
- RLS enabled: true
- RLS forced: false

#### Columns

| Column | Type | Nullable | Default | Sensitive |
|---|---|---|---|---|
| id | uuid | NO |  | no |
| user_id | uuid | NO |  | yes |
| friendly_name | text | YES |  | no |
| factor_type | auth.factor_type | NO |  | no |
| status | auth.factor_status | NO |  | no |
| created_at | timestamp with time zone | NO |  | no |
| updated_at | timestamp with time zone | NO |  | no |
| secret | text | YES |  | no |
| phone | text | YES |  | no |
| last_challenged_at | timestamp with time zone | YES |  | no |
| web_authn_credential | jsonb | YES |  | no |
| web_authn_aaguid | uuid | YES |  | no |
| last_webauthn_challenge_data | jsonb | YES |  | no |

#### Constraints

- mfa_factors_last_challenged_at_key (u): UNIQUE (last_challenged_at)
- mfa_factors_pkey (p): PRIMARY KEY (id)
- mfa_factors_user_id_fkey (f): FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE

#### Relationships (FK)

- user_id -> auth.users.id [SENSITIVE]

### auth.oauth_authorizations

- Description: Primary records for oauth authorizations.
- RLS enabled: false
- RLS forced: false

#### Columns

| Column | Type | Nullable | Default | Sensitive |
|---|---|---|---|---|
| id | uuid | NO |  | no |
| authorization_id | text | NO |  | no |
| client_id | uuid | NO |  | no |
| user_id | uuid | YES |  | yes |
| redirect_uri | text | NO |  | no |
| scope | text | NO |  | no |
| state | text | YES |  | no |
| resource | text | YES |  | no |
| code_challenge | text | YES |  | no |
| code_challenge_method | auth.code_challenge_method | YES |  | no |
| response_type | auth.oauth_response_type | NO | 'code'::auth.oauth_response_type | no |
| status | auth.oauth_authorization_status | NO | 'pending'::auth.oauth_authorization_status | no |
| authorization_code | text | YES |  | no |
| created_at | timestamp with time zone | NO | now() | no |
| expires_at | timestamp with time zone | NO | (now() + '00:03:00'::interval) | no |
| approved_at | timestamp with time zone | YES |  | no |
| nonce | text | YES |  | no |

#### Constraints

- oauth_authorizations_authorization_code_key (u): UNIQUE (authorization_code)
- oauth_authorizations_authorization_code_length (c): CHECK (char_length(authorization_code) <= 255)
- oauth_authorizations_authorization_id_key (u): UNIQUE (authorization_id)
- oauth_authorizations_client_id_fkey (f): FOREIGN KEY (client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE
- oauth_authorizations_code_challenge_length (c): CHECK (char_length(code_challenge) <= 128)
- oauth_authorizations_expires_at_future (c): CHECK (expires_at > created_at)
- oauth_authorizations_nonce_length (c): CHECK (char_length(nonce) <= 255)
- oauth_authorizations_pkey (p): PRIMARY KEY (id)
- oauth_authorizations_redirect_uri_length (c): CHECK (char_length(redirect_uri) <= 2048)
- oauth_authorizations_resource_length (c): CHECK (char_length(resource) <= 2048)
- oauth_authorizations_scope_length (c): CHECK (char_length(scope) <= 4096)
- oauth_authorizations_state_length (c): CHECK (char_length(state) <= 4096)
- oauth_authorizations_user_id_fkey (f): FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE

#### Relationships (FK)

- client_id -> auth.oauth_clients.id
- user_id -> auth.users.id [SENSITIVE]

### auth.oauth_client_states

- Description: Primary records for oauth client states.
- RLS enabled: false
- RLS forced: false

#### Columns

| Column | Type | Nullable | Default | Sensitive |
|---|---|---|---|---|
| id | uuid | NO |  | no |
| provider_type | text | NO |  | no |
| code_verifier | text | YES |  | no |
| created_at | timestamp with time zone | NO |  | no |

#### Constraints

- oauth_client_states_pkey (p): PRIMARY KEY (id)

#### Relationships (FK)

- None

### auth.oauth_clients

- Description: Primary records for oauth clients.
- RLS enabled: false
- RLS forced: false

#### Columns

| Column | Type | Nullable | Default | Sensitive |
|---|---|---|---|---|
| id | uuid | NO |  | no |
| client_secret_hash | text | YES |  | no |
| registration_type | auth.oauth_registration_type | NO |  | no |
| redirect_uris | text | NO |  | no |
| grant_types | text | NO |  | no |
| client_name | text | YES |  | no |
| client_uri | text | YES |  | no |
| logo_uri | text | YES |  | no |
| created_at | timestamp with time zone | NO | now() | no |
| updated_at | timestamp with time zone | NO | now() | no |
| deleted_at | timestamp with time zone | YES |  | no |
| client_type | auth.oauth_client_type | NO | 'confidential'::auth.oauth_client_type | no |
| token_endpoint_auth_method | text | NO |  | no |

#### Constraints

- oauth_clients_client_name_length (c): CHECK (char_length(client_name) <= 1024)
- oauth_clients_client_uri_length (c): CHECK (char_length(client_uri) <= 2048)
- oauth_clients_logo_uri_length (c): CHECK (char_length(logo_uri) <= 2048)
- oauth_clients_pkey (p): PRIMARY KEY (id)
- oauth_clients_token_endpoint_auth_method_check (c): CHECK (token_endpoint_auth_method = ANY (ARRAY['client_secret_basic'::text, 'client_secret_post'::text, 'none'::text]))

#### Relationships (FK)

- None

### auth.oauth_consents

- Description: Primary records for oauth consents.
- RLS enabled: false
- RLS forced: false

#### Columns

| Column | Type | Nullable | Default | Sensitive |
|---|---|---|---|---|
| id | uuid | NO |  | no |
| user_id | uuid | NO |  | yes |
| client_id | uuid | NO |  | no |
| scopes | text | NO |  | no |
| granted_at | timestamp with time zone | NO | now() | no |
| revoked_at | timestamp with time zone | YES |  | no |

#### Constraints

- oauth_consents_client_id_fkey (f): FOREIGN KEY (client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE
- oauth_consents_pkey (p): PRIMARY KEY (id)
- oauth_consents_revoked_after_granted (c): CHECK (revoked_at IS NULL OR revoked_at >= granted_at)
- oauth_consents_scopes_length (c): CHECK (char_length(scopes) <= 2048)
- oauth_consents_scopes_not_empty (c): CHECK (char_length(TRIM(BOTH FROM scopes)) > 0)
- oauth_consents_user_client_unique (u): UNIQUE (user_id, client_id)
- oauth_consents_user_id_fkey (f): FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE

#### Relationships (FK)

- client_id -> auth.oauth_clients.id
- user_id -> auth.users.id [SENSITIVE]

### auth.one_time_tokens

- Description: Primary records for one time tokens.
- RLS enabled: true
- RLS forced: false

#### Columns

| Column | Type | Nullable | Default | Sensitive |
|---|---|---|---|---|
| id | uuid | NO |  | no |
| user_id | uuid | NO |  | yes |
| token_type | auth.one_time_token_type | NO |  | no |
| token_hash | text | NO |  | no |
| relates_to | text | NO |  | no |
| created_at | timestamp without time zone | NO | now() | no |
| updated_at | timestamp without time zone | NO | now() | no |

#### Constraints

- one_time_tokens_pkey (p): PRIMARY KEY (id)
- one_time_tokens_token_hash_check (c): CHECK (char_length(token_hash) > 0)
- one_time_tokens_user_id_fkey (f): FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE

#### Relationships (FK)

- user_id -> auth.users.id [SENSITIVE]

### auth.refresh_tokens

- Description: Primary records for refresh tokens.
- RLS enabled: true
- RLS forced: false

#### Columns

| Column | Type | Nullable | Default | Sensitive |
|---|---|---|---|---|
| instance_id | uuid | YES |  | no |
| id | bigint | NO | nextval('auth.refresh_tokens_id_seq'::regclass) | no |
| token | character varying(255) | YES |  | no |
| user_id | character varying(255) | YES |  | yes |
| revoked | boolean | YES |  | no |
| created_at | timestamp with time zone | YES |  | no |
| updated_at | timestamp with time zone | YES |  | no |
| parent | character varying(255) | YES |  | no |
| session_id | uuid | YES |  | no |

#### Constraints

- refresh_tokens_pkey (p): PRIMARY KEY (id)
- refresh_tokens_session_id_fkey (f): FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE
- refresh_tokens_token_unique (u): UNIQUE (token)

#### Relationships (FK)

- session_id -> auth.sessions.id

### auth.saml_providers

- Description: Primary records for saml providers.
- RLS enabled: true
- RLS forced: false

#### Columns

| Column | Type | Nullable | Default | Sensitive |
|---|---|---|---|---|
| id | uuid | NO |  | no |
| sso_provider_id | uuid | NO |  | no |
| entity_id | text | NO |  | no |
| metadata_xml | text | NO |  | no |
| metadata_url | text | YES |  | no |
| attribute_mapping | jsonb | YES |  | no |
| created_at | timestamp with time zone | YES |  | no |
| updated_at | timestamp with time zone | YES |  | no |
| name_id_format | text | YES |  | no |

#### Constraints

- entity_id not empty (c): CHECK (char_length(entity_id) > 0)
- metadata_url not empty (c): CHECK (metadata_url = NULL::text OR char_length(metadata_url) > 0)
- metadata_xml not empty (c): CHECK (char_length(metadata_xml) > 0)
- saml_providers_entity_id_key (u): UNIQUE (entity_id)
- saml_providers_pkey (p): PRIMARY KEY (id)
- saml_providers_sso_provider_id_fkey (f): FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE

#### Relationships (FK)

- sso_provider_id -> auth.sso_providers.id

### auth.saml_relay_states

- Description: Primary records for saml relay states.
- RLS enabled: true
- RLS forced: false

#### Columns

| Column | Type | Nullable | Default | Sensitive |
|---|---|---|---|---|
| id | uuid | NO |  | no |
| sso_provider_id | uuid | NO |  | no |
| request_id | text | NO |  | no |
| for_email | text | YES |  | no |
| redirect_to | text | YES |  | no |
| created_at | timestamp with time zone | YES |  | no |
| updated_at | timestamp with time zone | YES |  | no |
| flow_state_id | uuid | YES |  | no |

#### Constraints

- request_id not empty (c): CHECK (char_length(request_id) > 0)
- saml_relay_states_flow_state_id_fkey (f): FOREIGN KEY (flow_state_id) REFERENCES auth.flow_state(id) ON DELETE CASCADE
- saml_relay_states_pkey (p): PRIMARY KEY (id)
- saml_relay_states_sso_provider_id_fkey (f): FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE

#### Relationships (FK)

- flow_state_id -> auth.flow_state.id
- sso_provider_id -> auth.sso_providers.id

### auth.schema_migrations

- Description: Primary records for schema migrations.
- RLS enabled: true
- RLS forced: false

#### Columns

| Column | Type | Nullable | Default | Sensitive |
|---|---|---|---|---|
| version | character varying(255) | NO |  | no |

#### Constraints

- schema_migrations_pkey (p): PRIMARY KEY (version)

#### Relationships (FK)

- None

### auth.sessions

- Description: Primary records for sessions.
- RLS enabled: true
- RLS forced: false

#### Columns

| Column | Type | Nullable | Default | Sensitive |
|---|---|---|---|---|
| id | uuid | NO |  | no |
| user_id | uuid | NO |  | yes |
| created_at | timestamp with time zone | YES |  | no |
| updated_at | timestamp with time zone | YES |  | no |
| factor_id | uuid | YES |  | no |
| aal | auth.aal_level | YES |  | no |
| not_after | timestamp with time zone | YES |  | no |
| refreshed_at | timestamp without time zone | YES |  | no |
| user_agent | text | YES |  | no |
| ip | inet | YES |  | no |
| tag | text | YES |  | no |
| oauth_client_id | uuid | YES |  | no |
| refresh_token_hmac_key | text | YES |  | no |
| refresh_token_counter | bigint | YES |  | no |
| scopes | text | YES |  | no |

#### Constraints

- sessions_oauth_client_id_fkey (f): FOREIGN KEY (oauth_client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE
- sessions_pkey (p): PRIMARY KEY (id)
- sessions_scopes_length (c): CHECK (char_length(scopes) <= 4096)
- sessions_user_id_fkey (f): FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE

#### Relationships (FK)

- oauth_client_id -> auth.oauth_clients.id
- user_id -> auth.users.id [SENSITIVE]

### auth.sso_domains

- Description: Primary records for sso domains.
- RLS enabled: true
- RLS forced: false

#### Columns

| Column | Type | Nullable | Default | Sensitive |
|---|---|---|---|---|
| id | uuid | NO |  | no |
| sso_provider_id | uuid | NO |  | no |
| domain | text | NO |  | no |
| created_at | timestamp with time zone | YES |  | no |
| updated_at | timestamp with time zone | YES |  | no |

#### Constraints

- domain not empty (c): CHECK (char_length(domain) > 0)
- sso_domains_pkey (p): PRIMARY KEY (id)
- sso_domains_sso_provider_id_fkey (f): FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE

#### Relationships (FK)

- sso_provider_id -> auth.sso_providers.id

### auth.sso_providers

- Description: Primary records for sso providers.
- RLS enabled: true
- RLS forced: false

#### Columns

| Column | Type | Nullable | Default | Sensitive |
|---|---|---|---|---|
| id | uuid | NO |  | no |
| resource_id | text | YES |  | no |
| created_at | timestamp with time zone | YES |  | no |
| updated_at | timestamp with time zone | YES |  | no |
| disabled | boolean | YES |  | no |

#### Constraints

- resource_id not empty (c): CHECK (resource_id = NULL::text OR char_length(resource_id) > 0)
- sso_providers_pkey (p): PRIMARY KEY (id)

#### Relationships (FK)

- None

### auth.users

- Description: Primary records for users.
- RLS enabled: true
- RLS forced: false

#### Columns

| Column | Type | Nullable | Default | Sensitive |
|---|---|---|---|---|
| instance_id | uuid | YES |  | no |
| id | uuid | NO |  | no |
| aud | character varying(255) | YES |  | no |
| role | character varying(255) | YES |  | no |
| email | character varying(255) | YES |  | no |
| encrypted_password | character varying(255) | YES |  | no |
| email_confirmed_at | timestamp with time zone | YES |  | no |
| invited_at | timestamp with time zone | YES |  | no |
| confirmation_token | character varying(255) | YES |  | no |
| confirmation_sent_at | timestamp with time zone | YES |  | no |
| recovery_token | character varying(255) | YES |  | no |
| recovery_sent_at | timestamp with time zone | YES |  | no |
| email_change_token_new | character varying(255) | YES |  | no |
| email_change | character varying(255) | YES |  | no |
| email_change_sent_at | timestamp with time zone | YES |  | no |
| last_sign_in_at | timestamp with time zone | YES |  | no |
| raw_app_meta_data | jsonb | YES |  | no |
| raw_user_meta_data | jsonb | YES |  | no |
| is_super_admin | boolean | YES |  | no |
| created_at | timestamp with time zone | YES |  | no |
| updated_at | timestamp with time zone | YES |  | no |
| phone | text | YES | NULL::character varying | no |
| phone_confirmed_at | timestamp with time zone | YES |  | no |
| phone_change | text | YES | ''::character varying | no |
| phone_change_token | character varying(255) | YES | ''::character varying | no |
| phone_change_sent_at | timestamp with time zone | YES |  | no |
| confirmed_at | timestamp with time zone | YES | LEAST(email_confirmed_at, phone_confirmed_at) | no |
| email_change_token_current | character varying(255) | YES | ''::character varying | no |
| email_change_confirm_status | smallint | YES | 0 | no |
| banned_until | timestamp with time zone | YES |  | no |
| reauthentication_token | character varying(255) | YES | ''::character varying | no |
| reauthentication_sent_at | timestamp with time zone | YES |  | no |
| is_sso_user | boolean | NO | false | no |
| deleted_at | timestamp with time zone | YES |  | no |
| is_anonymous | boolean | NO | false | no |

#### Constraints

- users_email_change_confirm_status_check (c): CHECK (email_change_confirm_status >= 0 AND email_change_confirm_status <= 2)
- users_phone_key (u): UNIQUE (phone)
- users_pkey (p): PRIMARY KEY (id)

#### Relationships (FK)

- None

### public.appointment_notes

- Description: Primary records for appointment notes.
- RLS enabled: true
- RLS forced: false

#### Columns

| Column | Type | Nullable | Default | Sensitive |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | no |
| appointment_id | uuid | NO |  | no |
| author_id | uuid | NO |  | no |
| created_at | timestamp with time zone | NO | now() | no |
| note_enc | bytea | YES |  | no |
| note_nonce | bytea | YES |  | no |
| note_kid | text | YES |  | no |
| note_ver | smallint | YES |  | no |
| note_hash | bytea | YES |  | no |

#### Constraints

- appointment_notes_appointment_id_fkey (f): FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE
- appointment_notes_author_id_fkey (f): FOREIGN KEY (author_id) REFERENCES profiles(id) ON DELETE CASCADE
- appointment_notes_note_kid_fkey (f): FOREIGN KEY (note_kid) REFERENCES encryption_key_registry(key_id)
- appointment_notes_pkey (p): PRIMARY KEY (id)

#### Relationships (FK)

- appointment_id -> public.appointments.id
- author_id -> public.profiles.id
- note_kid -> public.encryption_key_registry.key_id

### public.appointments

- Description: Primary records for appointments.
- RLS enabled: true
- RLS forced: false

#### Columns

| Column | Type | Nullable | Default | Sensitive |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | no |
| doctor_id | uuid | NO |  | yes |
| patient_id | uuid | NO |  | yes |
| status | appointment_status | NO | 'requested'::appointment_status | no |
| mode | visit_mode | NO | 'in_person'::visit_mode | no |
| start_at | timestamp with time zone | NO |  | no |
| end_at | timestamp with time zone | NO |  | no |
| location_text | text | YES |  | no |
| location | jsonb | YES |  | no |
| created_by | uuid | NO |  | no |
| created_at | timestamp with time zone | NO | now() | no |
| updated_at | timestamp with time zone | NO | now() | no |
| reason_enc | bytea | YES |  | no |
| reason_nonce | bytea | YES |  | no |
| reason_kid | text | YES |  | no |
| reason_ver | smallint | YES |  | no |
| symptoms_enc | bytea | YES |  | no |
| symptoms_nonce | bytea | YES |  | no |
| symptoms_kid | text | YES |  | no |
| symptoms_ver | smallint | YES |  | no |

#### Constraints

- appointments_created_by_fkey (f): FOREIGN KEY (created_by) REFERENCES profiles(id)
- appointments_doctor_id_fkey (f): FOREIGN KEY (doctor_id) REFERENCES profiles(id) ON DELETE CASCADE
- appointments_patient_id_fkey (f): FOREIGN KEY (patient_id) REFERENCES profiles(id) ON DELETE CASCADE
- appointments_pkey (p): PRIMARY KEY (id)
- chk_end_after_start (c): CHECK (end_at > start_at)

#### Relationships (FK)

- created_by -> public.profiles.id
- doctor_id -> public.profiles.id [SENSITIVE]
- patient_id -> public.profiles.id [SENSITIVE]

### public.care_links

- Description: Primary records for care links.
- RLS enabled: true
- RLS forced: false

#### Columns

| Column | Type | Nullable | Default | Sensitive |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | no |
| doctor_id | uuid | NO |  | yes |
| patient_id | uuid | NO |  | yes |
| status | text | NO | 'active'::text | no |
| created_by | uuid | YES |  | no |
| created_at | timestamp with time zone | NO | now() | no |

#### Constraints

- care_links_created_by_fkey (f): FOREIGN KEY (created_by) REFERENCES profiles(id)
- care_links_doctor_id_fkey (f): FOREIGN KEY (doctor_id) REFERENCES profiles(id) ON DELETE CASCADE
- care_links_doctor_id_patient_id_key (u): UNIQUE (doctor_id, patient_id)
- care_links_patient_id_fkey (f): FOREIGN KEY (patient_id) REFERENCES profiles(id) ON DELETE CASCADE
- care_links_pkey (p): PRIMARY KEY (id)

#### Relationships (FK)

- created_by -> public.profiles.id
- doctor_id -> public.profiles.id [SENSITIVE]
- patient_id -> public.profiles.id [SENSITIVE]

### public.conversation_participants

- Description: Primary records for conversation participants.
- RLS enabled: true
- RLS forced: false

#### Columns

| Column | Type | Nullable | Default | Sensitive |
|---|---|---|---|---|
| conversation_id | uuid | NO |  | no |
| user_id | uuid | NO |  | yes |
| role_in_chat | text | YES |  | no |
| joined_at | timestamp with time zone | NO | now() | no |
| last_read_at | timestamp with time zone | YES | now() | no |

#### Constraints

- conversation_participants_conversation_id_fkey (f): FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
- conversation_participants_pkey (p): PRIMARY KEY (conversation_id, user_id)
- conversation_participants_user_id_fkey (f): FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE

#### Relationships (FK)

- conversation_id -> public.conversations.id
- user_id -> public.profiles.id [SENSITIVE]

### public.conversations

- Description: Primary records for conversations.
- RLS enabled: true
- RLS forced: false

#### Columns

| Column | Type | Nullable | Default | Sensitive |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | no |
| created_at | timestamp with time zone | NO | now() | no |
| last_message_at | timestamp with time zone | YES |  | no |
| last_message_text | text | YES |  | no |
| metadata | jsonb | YES | '{}'::jsonb | no |

#### Constraints

- conversations_pkey (p): PRIMARY KEY (id)

#### Relationships (FK)

- None

### public.doctor_insurances

- Description: Primary records for doctor insurances.
- RLS enabled: true
- RLS forced: false

#### Columns

| Column | Type | Nullable | Default | Sensitive |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | no |
| doctor_id | uuid | NO |  | yes |
| insurance_provider | text | NO |  | no |
| created_at | timestamp with time zone | NO | now() | no |

#### Constraints

- doctor_insurances_doctor_id_fkey (f): FOREIGN KEY (doctor_id) REFERENCES doctor_profiles(doctor_id) ON DELETE CASCADE
- doctor_insurances_pkey (p): PRIMARY KEY (id)
- doctor_insurances_unique (u): UNIQUE (doctor_id, insurance_provider)

#### Relationships (FK)

- doctor_id -> public.doctor_profiles.doctor_id [SENSITIVE]

### public.doctor_patient_consent

- Description: Primary records for doctor patient consent.
- RLS enabled: true
- RLS forced: false

#### Columns

| Column | Type | Nullable | Default | Sensitive |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | no |
| doctor_id | uuid | NO |  | yes |
| patient_id | uuid | NO |  | yes |
| status | text | NO | 'requested'::text | no |
| share_basic_profile | boolean | NO | false | no |
| share_contact | boolean | NO | false | no |
| share_documents | boolean | NO | false | no |
| share_appointments | boolean | NO | false | no |
| share_medical_notes | boolean | NO | false | no |
| request_reason | text | YES |  | no |
| access_expires_at | timestamp with time zone | YES |  | no |
| requested_at | timestamp with time zone | NO | now() | no |
| responded_at | timestamp with time zone | YES |  | no |
| created_at | timestamp with time zone | NO | now() | no |
| updated_at | timestamp with time zone | NO | now() | no |

#### Constraints

- doctor_patient_consent_doctor_id_fkey (f): FOREIGN KEY (doctor_id) REFERENCES profiles(id) ON DELETE CASCADE
- doctor_patient_consent_patient_id_fkey (f): FOREIGN KEY (patient_id) REFERENCES profiles(id) ON DELETE CASCADE
- doctor_patient_consent_pkey (p): PRIMARY KEY (id)
- doctor_patient_consent_status_check (c): CHECK (status = ANY (ARRAY['requested'::text, 'accepted'::text, 'rejected'::text, 'revoked'::text]))
- uq_doctor_patient_consent (u): UNIQUE (doctor_id, patient_id)

#### Relationships (FK)

- doctor_id -> public.profiles.id [SENSITIVE]
- patient_id -> public.profiles.id [SENSITIVE]

### public.doctor_profiles

- Description: Primary records for doctor profiles.
- RLS enabled: true
- RLS forced: false

#### Columns

| Column | Type | Nullable | Default | Sensitive |
|---|---|---|---|---|
| doctor_id | uuid | NO |  | yes |
| professional_license | text | YES |  | no |
| specialty | text | YES |  | no |
| clinic_name | text | YES |  | no |
| bio | text | YES |  | no |
| years_experience | integer | YES |  | no |
| consultation_price_mxn | integer | YES |  | no |
| address_text | text | YES |  | no |
| location | jsonb | YES |  | no |
| created_at | timestamp with time zone | NO | now() | no |
| updated_at | timestamp with time zone | NO | now() | no |
| cedula_general | text | YES |  | no |
| cedula_especialidad | text | YES |  | no |
| is_sep_verified | boolean | NO | false | no |
| verification_date | timestamp with time zone | YES |  | no |
| slug | text | NO |  | no |
| languages | text[] | YES | ARRAY['Español'::text] | no |
| education | jsonb | YES | '[]'::jsonb | no |
| illnesses_treated | text[] | YES | '{}'::text[] | no |
| city | text | YES |  | no |
| state | text | YES |  | no |
| zipcode | text | YES |  | no |
| accepts_video | boolean | NO | false | no |
| slot_duration_min | integer | NO | 30 | no |
| accepted_insurances | text[] | YES |  | no |
| consultation_mode | text | YES | 'in-person'::text | no |

#### Constraints

- doctor_profiles_doctor_id_fkey (f): FOREIGN KEY (doctor_id) REFERENCES profiles(id) ON DELETE CASCADE
- doctor_profiles_pkey (p): PRIMARY KEY (doctor_id)

#### Relationships (FK)

- doctor_id -> public.profiles.id [SENSITIVE]

### public.doctor_schedules

- Description: Primary records for doctor schedules.
- RLS enabled: true
- RLS forced: false

#### Columns

| Column | Type | Nullable | Default | Sensitive |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | no |
| doctor_id | uuid | NO |  | yes |
| day_of_week | smallint | NO |  | no |
| open_time | time without time zone | NO |  | no |
| close_time | time without time zone | NO |  | no |
| is_active | boolean | NO | true | no |
| created_at | timestamp with time zone | NO | now() | no |
| updated_at | timestamp with time zone | NO | now() | no |

#### Constraints

- doctor_schedules_day_of_week_check (c): CHECK (day_of_week >= 0 AND day_of_week <= 6)
- doctor_schedules_doctor_day_key (u): UNIQUE (doctor_id, day_of_week)
- doctor_schedules_doctor_id_fkey (f): FOREIGN KEY (doctor_id) REFERENCES doctor_profiles(doctor_id) ON DELETE CASCADE
- doctor_schedules_pkey (p): PRIMARY KEY (id)

#### Relationships (FK)

- doctor_id -> public.doctor_profiles.doctor_id [SENSITIVE]

### public.doctor_services

- Description: Primary records for doctor services.
- RLS enabled: true
- RLS forced: false

#### Columns

| Column | Type | Nullable | Default | Sensitive |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | no |
| doctor_id | uuid | NO |  | yes |
| name | text | NO |  | no |
| description | text | YES |  | no |
| price | integer | YES |  | no |
| duration | integer | YES | 30 | no |
| is_active | boolean | NO | true | no |
| sort_order | integer | NO | 0 | no |
| created_at | timestamp with time zone | NO | now() | no |
| updated_at | timestamp with time zone | NO | now() | no |

#### Constraints

- doctor_services_doctor_id_fkey (f): FOREIGN KEY (doctor_id) REFERENCES doctor_profiles(doctor_id) ON DELETE CASCADE
- doctor_services_pkey (p): PRIMARY KEY (id)

#### Relationships (FK)

- doctor_id -> public.doctor_profiles.doctor_id [SENSITIVE]

### public.document_folders

- Description: Primary records for document folders.
- RLS enabled: true
- RLS forced: false

#### Columns

| Column | Type | Nullable | Default | Sensitive |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | no |
| owner_id | uuid | NO |  | yes |
| name | text | NO |  | no |
| created_at | timestamp with time zone | NO | now() | no |

#### Constraints

- document_folders_owner_id_fkey (f): FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE CASCADE
- document_folders_pkey (p): PRIMARY KEY (id)

#### Relationships (FK)

- owner_id -> public.profiles.id [SENSITIVE]

### public.document_shares

- Description: Primary records for document shares.
- RLS enabled: true
- RLS forced: false

#### Columns

| Column | Type | Nullable | Default | Sensitive |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | no |
| document_id | uuid | NO |  | no |
| shared_with | uuid | NO |  | no |
| shared_by | uuid | NO |  | no |
| created_at | timestamp with time zone | NO | now() | no |

#### Constraints

- document_shares_document_id_fkey (f): FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
- document_shares_document_id_shared_with_key (u): UNIQUE (document_id, shared_with)
- document_shares_pkey (p): PRIMARY KEY (id)
- document_shares_shared_by_fkey (f): FOREIGN KEY (shared_by) REFERENCES profiles(id) ON DELETE CASCADE
- document_shares_shared_with_fkey (f): FOREIGN KEY (shared_with) REFERENCES profiles(id) ON DELETE CASCADE

#### Relationships (FK)

- document_id -> public.documents.id
- shared_by -> public.profiles.id
- shared_with -> public.profiles.id

### public.documents

- Description: Primary records for documents.
- RLS enabled: true
- RLS forced: false

#### Columns

| Column | Type | Nullable | Default | Sensitive |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | no |
| owner_id | uuid | NO |  | yes |
| patient_id | uuid | YES |  | yes |
| uploaded_by | uuid | YES |  | no |
| folder_id | uuid | YES |  | no |
| title | text | NO |  | no |
| category | doc_category | NO | 'other'::doc_category | no |
| mime_type | text | YES |  | no |
| file_size | integer | YES |  | no |
| notes | text | YES |  | no |
| created_at | timestamp with time zone | NO | now() | no |
| updated_at | timestamp with time zone | NO | now() | no |
| file_path_enc | bytea | YES |  | no |
| file_path_nonce | bytea | YES |  | no |
| file_path_kid | text | YES |  | no |
| file_path_ver | smallint | YES |  | no |
| checksum_enc | bytea | YES |  | no |
| checksum_nonce | bytea | YES |  | no |
| checksum_kid | text | YES |  | no |
| checksum_ver | smallint | YES |  | no |

#### Constraints

- documents_folder_id_fkey (f): FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
- documents_owner_id_fkey (f): FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE CASCADE
- documents_patient_id_fkey (f): FOREIGN KEY (patient_id) REFERENCES profiles(id) ON DELETE SET NULL
- documents_pkey (p): PRIMARY KEY (id)
- documents_uploaded_by_fkey (f): FOREIGN KEY (uploaded_by) REFERENCES profiles(id) ON DELETE SET NULL

#### Relationships (FK)

- folder_id -> public.folders.id
- owner_id -> public.profiles.id [SENSITIVE]
- patient_id -> public.profiles.id [SENSITIVE]
- uploaded_by -> public.profiles.id

### public.encryption_backfill_queue

- Description: Primary records for encryption backfill queue.
- RLS enabled: true
- RLS forced: false

#### Columns

| Column | Type | Nullable | Default | Sensitive |
|---|---|---|---|---|
| id | bigint | NO | nextval('encryption_backfill_queue_id_seq'::regclass) | no |
| target_table | text | NO |  | no |
| target_id | uuid | NO |  | no |
| field_name | text | NO |  | no |
| status | text | NO | 'pending'::text | no |
| attempts | integer | NO | 0 | no |
| last_error | text | YES |  | no |
| locked_by | uuid | YES |  | no |
| locked_at | timestamp with time zone | YES |  | no |
| created_at | timestamp with time zone | NO | now() | no |
| updated_at | timestamp with time zone | NO | now() | no |

#### Constraints

- encryption_backfill_queue_pkey (p): PRIMARY KEY (id)
- encryption_backfill_queue_status_check (c): CHECK (status = ANY (ARRAY['pending'::text, 'processing'::text, 'done'::text, 'error'::text]))
- encryption_backfill_queue_target_table_target_id_field_name_key (u): UNIQUE (target_table, target_id, field_name)

#### Relationships (FK)

- None

### public.encryption_key_registry

- Description: Primary records for encryption key registry.
- RLS enabled: true
- RLS forced: false

#### Columns

| Column | Type | Nullable | Default | Sensitive |
|---|---|---|---|---|
| key_id | text | NO |  | no |
| provider | text | NO |  | no |
| status | text | NO | 'active'::text | no |
| created_at | timestamp with time zone | NO | now() | no |
| rotated_at | timestamp with time zone | YES |  | no |
| retired_at | timestamp with time zone | YES |  | no |

#### Constraints

- encryption_key_registry_pkey (p): PRIMARY KEY (key_id)
- encryption_key_registry_status_check (c): CHECK (status = ANY (ARRAY['active'::text, 'rotating'::text, 'retired'::text]))

#### Relationships (FK)

- None

### public.folders

- Description: Primary records for folders.
- RLS enabled: true
- RLS forced: false

#### Columns

| Column | Type | Nullable | Default | Sensitive |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | no |
| owner_id | uuid | NO |  | yes |
| parent_id | uuid | YES |  | no |
| name | text | NO |  | no |
| color | text | YES | '#33C7BE'::text | no |
| is_favorite | boolean | YES | false | no |
| created_at | timestamp with time zone | YES | now() | no |
| updated_at | timestamp with time zone | YES | now() | no |

#### Constraints

- folders_owner_id_fkey (f): FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE
- folders_parent_id_fkey (f): FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE CASCADE
- folders_pkey (p): PRIMARY KEY (id)

#### Relationships (FK)

- owner_id -> auth.users.id [SENSITIVE]
- parent_id -> public.folders.id

### public.messages

- Description: Primary records for messages.
- RLS enabled: true
- RLS forced: false

#### Columns

| Column | Type | Nullable | Default | Sensitive |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | no |
| conversation_id | uuid | NO |  | no |
| sender_id | uuid | NO |  | no |
| body | text | NO |  | no |
| created_at | timestamp with time zone | NO | now() | no |

#### Constraints

- messages_body_length (c): CHECK (char_length(body) <= 5000)
- messages_body_not_empty (c): CHECK (btrim(body) <> ''::text)
- messages_conversation_id_fkey (f): FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
- messages_pkey (p): PRIMARY KEY (id)
- messages_sender_id_fkey (f): FOREIGN KEY (sender_id) REFERENCES profiles(id) ON DELETE CASCADE

#### Relationships (FK)

- conversation_id -> public.conversations.id
- sender_id -> public.profiles.id

### public.notifications

- Description: Primary records for notifications.
- RLS enabled: true
- RLS forced: false

#### Columns

| Column | Type | Nullable | Default | Sensitive |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | no |
| user_id | uuid | NO |  | yes |
| type | text | NO |  | no |
| title | text | YES |  | no |
| body | text | YES |  | no |
| entity_table | text | YES |  | no |
| entity_id | uuid | YES |  | no |
| is_read | boolean | NO | false | no |
| created_at | timestamp with time zone | NO | now() | no |

#### Constraints

- notifications_pkey (p): PRIMARY KEY (id)
- notifications_user_id_fkey (f): FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE

#### Relationships (FK)

- user_id -> public.profiles.id [SENSITIVE]

### public.patient_notes

- Description: Primary records for patient notes.
- RLS enabled: true
- RLS forced: false

#### Columns

| Column | Type | Nullable | Default | Sensitive |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | no |
| patient_id | uuid | YES |  | yes |
| doctor_id | uuid | YES |  | yes |
| title | text | YES |  | no |
| created_at | timestamp with time zone | YES | now() | no |
| updated_at | timestamp with time zone | YES | now() | no |
| body_enc | bytea | YES |  | no |
| body_nonce | bytea | YES |  | no |
| body_kid | text | YES |  | no |
| body_ver | smallint | YES |  | no |
| body_hash | bytea | YES |  | no |

#### Constraints

- patient_notes_body_kid_fkey (f): FOREIGN KEY (body_kid) REFERENCES encryption_key_registry(key_id)
- patient_notes_doctor_id_fkey (f): FOREIGN KEY (doctor_id) REFERENCES profiles(id) ON DELETE CASCADE
- patient_notes_patient_id_fkey (f): FOREIGN KEY (patient_id) REFERENCES profiles(id) ON DELETE CASCADE
- patient_notes_pkey (p): PRIMARY KEY (id)

#### Relationships (FK)

- body_kid -> public.encryption_key_registry.key_id
- doctor_id -> public.profiles.id [SENSITIVE]
- patient_id -> public.profiles.id [SENSITIVE]

### public.patient_profiles

- Description: Primary records for patient profiles.
- RLS enabled: true
- RLS forced: false

#### Columns

| Column | Type | Nullable | Default | Sensitive |
|---|---|---|---|---|
| patient_id | uuid | NO |  | yes |
| address_text | text | YES |  | no |
| blood_type | text | YES |  | no |
| created_at | timestamp with time zone | NO | now() | no |
| updated_at | timestamp with time zone | NO | now() | no |
| height_cm | integer | YES |  | no |
| weight_kg | integer | YES |  | no |
| insurance_provider | text | YES |  | no |
| preferred_language | text | YES |  | no |
| allergies_enc | bytea | YES |  | no |
| allergies_nonce | bytea | YES |  | no |
| allergies_kid | text | YES |  | no |
| allergies_ver | smallint | YES |  | no |
| chronic_conditions_enc | bytea | YES |  | no |
| chronic_conditions_nonce | bytea | YES |  | no |
| chronic_conditions_kid | text | YES |  | no |
| chronic_conditions_ver | smallint | YES |  | no |
| current_medications_enc | bytea | YES |  | no |
| current_medications_nonce | bytea | YES |  | no |
| current_medications_kid | text | YES |  | no |
| current_medications_ver | smallint | YES |  | no |
| notes_for_doctor_enc | bytea | YES |  | no |
| notes_for_doctor_nonce | bytea | YES |  | no |
| notes_for_doctor_kid | text | YES |  | no |
| notes_for_doctor_ver | smallint | YES |  | no |
| insurance_policy_number_enc | bytea | YES |  | no |
| insurance_policy_number_nonce | bytea | YES |  | no |
| insurance_policy_number_kid | text | YES |  | no |
| insurance_policy_number_ver | smallint | YES |  | no |
| emergency_contact_name_enc | bytea | YES |  | no |
| emergency_contact_name_nonce | bytea | YES |  | no |
| emergency_contact_name_kid | text | YES |  | no |
| emergency_contact_name_ver | smallint | YES |  | no |
| emergency_contact_phone_enc | bytea | YES |  | no |
| emergency_contact_phone_nonce | bytea | YES |  | no |
| emergency_contact_phone_kid | text | YES |  | no |
| emergency_contact_phone_ver | smallint | YES |  | no |

#### Constraints

- patient_profiles_patient_id_fkey (f): FOREIGN KEY (patient_id) REFERENCES profiles(id) ON DELETE CASCADE
- patient_profiles_pkey (p): PRIMARY KEY (patient_id)

#### Relationships (FK)

- patient_id -> public.profiles.id [SENSITIVE]

### public.profiles

- Description: Primary records for profiles.
- RLS enabled: true
- RLS forced: false

#### Columns

| Column | Type | Nullable | Default | Sensitive |
|---|---|---|---|---|
| id | uuid | NO |  | no |
| role | user_role | NO | 'patient'::user_role | no |
| full_name | text | YES |  | no |
| email | text | YES |  | no |
| phone | text | YES |  | no |
| sex | sex_type | NO | 'unspecified'::sex_type | no |
| birthdate | date | YES |  | no |
| avatar_url | text | YES |  | no |
| created_at | timestamp with time zone | NO | now() | no |
| updated_at | timestamp with time zone | NO | now() | no |
| onboarding_completed | boolean | NO | false | no |
| onboarding_step | text | YES |  | no |
| last_seen_at | timestamp with time zone | YES |  | no |

#### Constraints

- profiles_id_fkey (f): FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
- profiles_pkey (p): PRIMARY KEY (id)

#### Relationships (FK)

- id -> auth.users.id

### public.sensitive_access_audit

- Description: Primary records for sensitive access audit.
- RLS enabled: true
- RLS forced: false

#### Columns

| Column | Type | Nullable | Default | Sensitive |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | no |
| actor_id | uuid | NO |  | no |
| action | text | NO |  | no |
| target_table | text | NO |  | no |
| target_id | uuid | YES |  | no |
| reason | text | YES |  | no |
| success | boolean | NO | true | no |
| request_meta | jsonb | NO | '{}'::jsonb | no |
| created_at | timestamp with time zone | NO | now() | no |

#### Constraints

- sensitive_access_audit_pkey (p): PRIMARY KEY (id)

#### Relationships (FK)

- None

### public.specialties

- Description: Primary records for specialties.
- RLS enabled: true
- RLS forced: false

#### Columns

| Column | Type | Nullable | Default | Sensitive |
|---|---|---|---|---|
| slug | text | NO |  | no |
| label | text | NO |  | no |
| grp | text | NO | 'Otros'::text | no |
| sort_order | integer | NO | 999 | no |
| created_at | timestamp with time zone | NO | now() | no |

#### Constraints

- specialties_pkey (p): PRIMARY KEY (slug)

#### Relationships (FK)

- None

### public.user_settings

- Description: Primary records for user settings.
- RLS enabled: true
- RLS forced: false

#### Columns

| Column | Type | Nullable | Default | Sensitive |
|---|---|---|---|---|
| user_id | uuid | NO |  | yes |
| email_notifications | boolean | NO | true | no |
| appointment_reminders | boolean | NO | true | no |
| whatsapp_notifications | boolean | NO | false | no |
| created_at | timestamp with time zone | NO | now() | no |
| updated_at | timestamp with time zone | NO | now() | no |

#### Constraints

- user_settings_pkey (p): PRIMARY KEY (user_id)
- user_settings_user_id_fkey (f): FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE

#### Relationships (FK)

- user_id -> public.profiles.id [SENSITIVE]

### public.user_status

- Description: Primary records for user status.
- RLS enabled: true
- RLS forced: false

#### Columns

| Column | Type | Nullable | Default | Sensitive |
|---|---|---|---|---|
| user_id | uuid | NO |  | yes |
| last_seen_at | timestamp with time zone | NO | now() | no |
| updated_at | timestamp with time zone | NO | now() | no |

#### Constraints

- user_status_pkey (p): PRIMARY KEY (user_id)
- user_status_user_id_fkey (f): FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE

#### Relationships (FK)

- user_id -> auth.users.id [SENSITIVE]

### public.verified_reviews

- Description: Primary records for verified reviews.
- RLS enabled: true
- RLS forced: false

#### Columns

| Column | Type | Nullable | Default | Sensitive |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | no |
| appointment_id | uuid | NO |  | no |
| patient_id | uuid | NO |  | yes |
| doctor_id | uuid | NO |  | yes |
| rating | integer | NO |  | no |
| comment | text | YES |  | no |
| created_at | timestamp with time zone | NO | now() | no |
| rating_punctuality | smallint | YES |  | no |
| rating_attention | smallint | YES |  | no |
| rating_facilities | smallint | YES |  | no |
| is_anonymous | boolean | NO | false | no |
| helpful_count | integer | NO | 0 | no |

#### Constraints

- uq_verified_reviews_appointment (u): UNIQUE (appointment_id)
- verified_reviews_appointment_id_fkey (f): FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE
- verified_reviews_doctor_id_fkey (f): FOREIGN KEY (doctor_id) REFERENCES doctor_profiles(doctor_id) ON DELETE CASCADE
- verified_reviews_patient_id_fkey (f): FOREIGN KEY (patient_id) REFERENCES patient_profiles(patient_id) ON DELETE CASCADE
- verified_reviews_pkey (p): PRIMARY KEY (id)
- verified_reviews_rating_attention_check (c): CHECK (rating_attention >= 1 AND rating_attention <= 5)
- verified_reviews_rating_check (c): CHECK (rating >= 1 AND rating <= 5)
- verified_reviews_rating_facilities_check (c): CHECK (rating_facilities >= 1 AND rating_facilities <= 5)
- verified_reviews_rating_punctuality_check (c): CHECK (rating_punctuality >= 1 AND rating_punctuality <= 5)

#### Relationships (FK)

- appointment_id -> public.appointments.id
- doctor_id -> public.doctor_profiles.doctor_id [SENSITIVE]
- patient_id -> public.patient_profiles.patient_id [SENSITIVE]

### storage.buckets

- Description: Primary records for buckets.
- RLS enabled: true
- RLS forced: false

#### Columns

| Column | Type | Nullable | Default | Sensitive |
|---|---|---|---|---|
| id | text | NO |  | no |
| name | text | NO |  | no |
| owner | uuid | YES |  | no |
| created_at | timestamp with time zone | YES | now() | no |
| updated_at | timestamp with time zone | YES | now() | no |
| public | boolean | YES | false | no |
| avif_autodetection | boolean | YES | false | no |
| file_size_limit | bigint | YES |  | no |
| allowed_mime_types | text[] | YES |  | no |
| owner_id | text | YES |  | yes |
| type | storage.buckettype | NO | 'STANDARD'::storage.buckettype | no |

#### Constraints

- buckets_pkey (p): PRIMARY KEY (id)

#### Relationships (FK)

- None

### storage.buckets_analytics

- Description: Primary records for buckets analytics.
- RLS enabled: true
- RLS forced: false

#### Columns

| Column | Type | Nullable | Default | Sensitive |
|---|---|---|---|---|
| name | text | NO |  | no |
| type | storage.buckettype | NO | 'ANALYTICS'::storage.buckettype | no |
| format | text | NO | 'ICEBERG'::text | no |
| created_at | timestamp with time zone | NO | now() | no |
| updated_at | timestamp with time zone | NO | now() | no |
| id | uuid | NO | gen_random_uuid() | no |
| deleted_at | timestamp with time zone | YES |  | no |

#### Constraints

- buckets_analytics_pkey (p): PRIMARY KEY (id)

#### Relationships (FK)

- None

### storage.buckets_vectors

- Description: Primary records for buckets vectors.
- RLS enabled: true
- RLS forced: false

#### Columns

| Column | Type | Nullable | Default | Sensitive |
|---|---|---|---|---|
| id | text | NO |  | no |
| type | storage.buckettype | NO | 'VECTOR'::storage.buckettype | no |
| created_at | timestamp with time zone | NO | now() | no |
| updated_at | timestamp with time zone | NO | now() | no |

#### Constraints

- buckets_vectors_pkey (p): PRIMARY KEY (id)

#### Relationships (FK)

- None

### storage.migrations

- Description: Primary records for migrations.
- RLS enabled: true
- RLS forced: false

#### Columns

| Column | Type | Nullable | Default | Sensitive |
|---|---|---|---|---|
| id | integer | NO |  | no |
| name | character varying(100) | NO |  | no |
| hash | character varying(40) | NO |  | no |
| executed_at | timestamp without time zone | YES | CURRENT_TIMESTAMP | no |

#### Constraints

- migrations_name_key (u): UNIQUE (name)
- migrations_pkey (p): PRIMARY KEY (id)

#### Relationships (FK)

- None

### storage.objects

- Description: Primary records for objects.
- RLS enabled: true
- RLS forced: false

#### Columns

| Column | Type | Nullable | Default | Sensitive |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | no |
| bucket_id | text | YES |  | no |
| name | text | YES |  | no |
| owner | uuid | YES |  | no |
| created_at | timestamp with time zone | YES | now() | no |
| updated_at | timestamp with time zone | YES | now() | no |
| last_accessed_at | timestamp with time zone | YES | now() | no |
| metadata | jsonb | YES |  | no |
| path_tokens | text[] | YES | string_to_array(name, '/'::text) | no |
| version | text | YES |  | no |
| owner_id | text | YES |  | yes |
| user_metadata | jsonb | YES |  | no |

#### Constraints

- objects_bucketId_fkey (f): FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id)
- objects_pkey (p): PRIMARY KEY (id)

#### Relationships (FK)

- bucket_id -> storage.buckets.id

### storage.s3_multipart_uploads

- Description: Primary records for s3 multipart uploads.
- RLS enabled: true
- RLS forced: false

#### Columns

| Column | Type | Nullable | Default | Sensitive |
|---|---|---|---|---|
| id | text | NO |  | no |
| in_progress_size | bigint | NO | 0 | no |
| upload_signature | text | NO |  | no |
| bucket_id | text | NO |  | no |
| key | text | NO |  | no |
| version | text | NO |  | no |
| owner_id | text | YES |  | yes |
| created_at | timestamp with time zone | NO | now() | no |
| user_metadata | jsonb | YES |  | no |

#### Constraints

- s3_multipart_uploads_bucket_id_fkey (f): FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id)
- s3_multipart_uploads_pkey (p): PRIMARY KEY (id)

#### Relationships (FK)

- bucket_id -> storage.buckets.id

### storage.s3_multipart_uploads_parts

- Description: Primary records for s3 multipart uploads parts.
- RLS enabled: true
- RLS forced: false

#### Columns

| Column | Type | Nullable | Default | Sensitive |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | no |
| upload_id | text | NO |  | no |
| size | bigint | NO | 0 | no |
| part_number | integer | NO |  | no |
| bucket_id | text | NO |  | no |
| key | text | NO |  | no |
| etag | text | NO |  | no |
| owner_id | text | YES |  | yes |
| version | text | NO |  | no |
| created_at | timestamp with time zone | NO | now() | no |

#### Constraints

- s3_multipart_uploads_parts_bucket_id_fkey (f): FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id)
- s3_multipart_uploads_parts_pkey (p): PRIMARY KEY (id)
- s3_multipart_uploads_parts_upload_id_fkey (f): FOREIGN KEY (upload_id) REFERENCES storage.s3_multipart_uploads(id) ON DELETE CASCADE

#### Relationships (FK)

- bucket_id -> storage.buckets.id
- upload_id -> storage.s3_multipart_uploads.id

### storage.vector_indexes

- Description: Primary records for vector indexes.
- RLS enabled: true
- RLS forced: false

#### Columns

| Column | Type | Nullable | Default | Sensitive |
|---|---|---|---|---|
| id | text | NO | gen_random_uuid() | no |
| name | text | NO |  | no |
| bucket_id | text | NO |  | no |
| data_type | text | NO |  | no |
| dimension | integer | NO |  | no |
| distance_metric | text | NO |  | no |
| metadata_configuration | jsonb | YES |  | no |
| created_at | timestamp with time zone | NO | now() | no |
| updated_at | timestamp with time zone | NO | now() | no |

#### Constraints

- vector_indexes_bucket_id_fkey (f): FOREIGN KEY (bucket_id) REFERENCES storage.buckets_vectors(id)
- vector_indexes_pkey (p): PRIMARY KEY (id)

#### Relationships (FK)

- bucket_id -> storage.buckets_vectors.id

## Functions (RPC)

### auth.email()

- Returns: text
- Language: sql
- Security definer: false

```sql
CREATE OR REPLACE FUNCTION auth.email()
 RETURNS text
 LANGUAGE sql
 STABLE
AS $function$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.email', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email')
  )::text
$function$
```

### auth.jwt()

- Returns: jsonb
- Language: sql
- Security definer: false

```sql
CREATE OR REPLACE FUNCTION auth.jwt()
 RETURNS jsonb
 LANGUAGE sql
 STABLE
AS $function$
  select 
    coalesce(
        nullif(current_setting('request.jwt.claim', true), ''),
        nullif(current_setting('request.jwt.claims', true), '')
    )::jsonb
$function$
```

### auth.role()

- Returns: text
- Language: sql
- Security definer: false

```sql
CREATE OR REPLACE FUNCTION auth.role()
 RETURNS text
 LANGUAGE sql
 STABLE
AS $function$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text
$function$
```

### auth.uid()

- Returns: uuid
- Language: sql
- Security definer: false

```sql
CREATE OR REPLACE FUNCTION auth.uid()
 RETURNS uuid
 LANGUAGE sql
 STABLE
AS $function$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$function$
```

### public.can_access_patient(_patient_id uuid)

- Returns: boolean
- Language: sql
- Security definer: true

```sql
CREATE OR REPLACE FUNCTION public.can_access_patient(_patient_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    -- Patient themselves: always
    auth.uid() = _patient_id
    OR
    -- Doctor with accepted consent (at least basic profile scope)
    public.has_consent(_patient_id);
$function$
```

### public.current_role()

- Returns: user_role
- Language: sql
- Security definer: true

```sql
CREATE OR REPLACE FUNCTION public."current_role"()
 RETURNS user_role
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$function$
```

### public.enqueue_encryption_backfill()

- Returns: TABLE(enqueued_rows bigint)
- Language: sql
- Security definer: true

```sql
CREATE OR REPLACE FUNCTION public.enqueue_encryption_backfill()
 RETURNS TABLE(enqueued_rows bigint)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 0::bigint AS enqueued_rows;
$function$
```

### public.generate_doctor_slug(p_doctor_id uuid, p_name text, p_specialty text)

- Returns: text
- Language: plpgsql
- Security definer: false

```sql
CREATE OR REPLACE FUNCTION public.generate_doctor_slug(p_doctor_id uuid, p_name text, p_specialty text)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
  base text;
  candidate text;
  counter int := 0;
BEGIN
  -- Normalise: unaccent → lowercase → replace non-alphanum with hyphens → trim
  base := trim(both '-' from regexp_replace(
    lower(public.unaccent(
      coalesce(p_name, '') || ' ' || coalesce(p_specialty, '')
    )),
    '[^a-z0-9]+', '-', 'g'
  ));

  IF base = '' OR base IS NULL THEN
    base := 'doctor';
  END IF;

  candidate := base;

  WHILE EXISTS (
    SELECT 1 FROM public.doctor_profiles
    WHERE slug = candidate AND doctor_id != p_doctor_id
  ) LOOP
    counter := counter + 1;
    candidate := base || '-' || counter;
  END LOOP;

  RETURN candidate;
END;
$function$
```

### public.get_all_specialties()

- Returns: TABLE(slug text, label text, grp text, sort_order integer)
- Language: sql
- Security definer: true

```sql
CREATE OR REPLACE FUNCTION public.get_all_specialties()
 RETURNS TABLE(slug text, label text, grp text, sort_order integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT s.slug, s.label, s.grp, s.sort_order
  FROM public.specialties s
  ORDER BY s.sort_order, s.label;
$function$
```

### public.get_conversation_between_users(user_a uuid, user_b uuid)

- Returns: TABLE(id uuid)
- Language: sql
- Security definer: true

```sql
CREATE OR REPLACE FUNCTION public.get_conversation_between_users(user_a uuid, user_b uuid)
 RETURNS TABLE(id uuid)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT cp1.conversation_id AS id
  FROM conversation_participants cp1
  JOIN conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
  WHERE cp1.user_id = user_a AND cp2.user_id = user_b
  LIMIT 1;
$function$
```

### public.get_doctor_availability_by_slug(p_slug text, p_start_date date, p_end_date date)

- Returns: TABLE(slot_date date, slot_time time without time zone, slot_ts text)
- Language: plpgsql
- Security definer: true

```sql
CREATE OR REPLACE FUNCTION public.get_doctor_availability_by_slug(p_slug text, p_start_date date, p_end_date date)
 RETURNS TABLE(slot_date date, slot_time time without time zone, slot_ts text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_doctor_id uuid;
  d date;
  sched record;
  t time;
  slot_start_ts timestamptz;
  slot_end_ts timestamptz;
  mexico_tz text := 'America/Mexico_City';
BEGIN
  -- Resolver slug → doctor_id (SECURITY DEFINER bypass RLS)
  SELECT dp.doctor_id INTO v_doctor_id
  FROM doctor_profiles dp
  WHERE dp.slug = p_slug
  LIMIT 1;

  IF v_doctor_id IS NULL THEN
    RETURN; -- Slug no encontrado
  END IF;

  d := p_start_date;

  WHILE d <= p_end_date LOOP
    FOR sched IN
      SELECT ds.open_time, ds.close_time
      FROM doctor_schedules ds
      WHERE ds.doctor_id = v_doctor_id
        AND ds.day_of_week = EXTRACT(DOW FROM d)::int
        AND ds.is_active = true
      ORDER BY ds.open_time
    LOOP
      t := sched.open_time;

      WHILE (t + interval '30 minutes') <= sched.close_time LOOP
        slot_start_ts := (d + t) AT TIME ZONE mexico_tz;
        slot_end_ts   := slot_start_ts + interval '30 minutes';

        IF slot_start_ts > now() THEN
          -- Verificar que NO haya cita activa que se traslape
          IF NOT EXISTS (
            SELECT 1 FROM appointments a
            WHERE a.doctor_id = v_doctor_id
              AND a.status IN ('requested', 'confirmed')
              AND a.start_at::timestamptz < slot_end_ts
              AND a.end_at::timestamptz   > slot_start_ts
          ) THEN
            slot_date := d;
            slot_time := t;
            slot_ts   := to_char((slot_start_ts AT TIME ZONE mexico_tz), 'YYYY-MM-DD"T"HH24:MI:SS');
            RETURN NEXT;
          END IF;
        END IF;

        t := t + interval '30 minutes';
      END LOOP;
    END LOOP;

    d := d + 1;
  END LOOP;
END;
$function$
```

### public.get_doctor_review_summary(p_slug text)

- Returns: TABLE(avg_rating numeric, avg_punctuality numeric, avg_attention numeric, avg_facilities numeric, total_count bigint, stars_5 bigint, stars_4 bigint, stars_3 bigint, stars_2 bigint, stars_1 bigint)
- Language: plpgsql
- Security definer: true

```sql
CREATE OR REPLACE FUNCTION public.get_doctor_review_summary(p_slug text)
 RETURNS TABLE(avg_rating numeric, avg_punctuality numeric, avg_attention numeric, avg_facilities numeric, total_count bigint, stars_5 bigint, stars_4 bigint, stars_3 bigint, stars_2 bigint, stars_1 bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_doctor_id UUID;
BEGIN
  SELECT dp.doctor_id INTO v_doctor_id
  FROM   public.doctor_profiles dp
  WHERE  dp.slug = p_slug
  LIMIT  1;

  IF v_doctor_id IS NULL THEN
    RETURN QUERY SELECT
      0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC,
      0::BIGINT, 0::BIGINT, 0::BIGINT, 0::BIGINT, 0::BIGINT, 0::BIGINT;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    ROUND(AVG(vr.rating)::NUMERIC, 1)                            AS avg_rating,
    ROUND(AVG(vr.rating_punctuality)::NUMERIC, 1)                AS avg_punctuality,
    ROUND(AVG(vr.rating_attention)::NUMERIC, 1)                  AS avg_attention,
    ROUND(AVG(vr.rating_facilities)::NUMERIC, 1)                 AS avg_facilities,
    COUNT(*)                                                      AS total_count,
    COUNT(*) FILTER (WHERE vr.rating = 5)                        AS stars_5,
    COUNT(*) FILTER (WHERE vr.rating = 4)                        AS stars_4,
    COUNT(*) FILTER (WHERE vr.rating = 3)                        AS stars_3,
    COUNT(*) FILTER (WHERE vr.rating = 2)                        AS stars_2,
    COUNT(*) FILTER (WHERE vr.rating = 1)                        AS stars_1
  FROM public.verified_reviews vr
  WHERE vr.doctor_id = v_doctor_id;
END;
$function$
```

### public.get_encryption_backfill_stats()

- Returns: TABLE(target_table text, status text, total bigint)
- Language: sql
- Security definer: true

```sql
CREATE OR REPLACE FUNCTION public.get_encryption_backfill_stats()
 RETURNS TABLE(target_table text, status text, total bigint)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT q.target_table, q.status, COUNT(*)::bigint AS total
  FROM public.encryption_backfill_queue q
  WHERE public.current_role() = 'admin'::public.user_role
  GROUP BY q.target_table, q.status
  ORDER BY q.target_table, q.status;
$function$
```

### public.get_folder_item_count(p_folder_id uuid)

- Returns: bigint
- Language: plpgsql
- Security definer: true

```sql
CREATE OR REPLACE FUNCTION public.get_folder_item_count(p_folder_id uuid)
 RETURNS bigint
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  item_count bigint;
BEGIN
  -- Security: Verify folder belongs to the calling user
  IF NOT EXISTS (
    SELECT 1 FROM folders
    WHERE id = p_folder_id AND owner_id = auth.uid()
  ) THEN
    RETURN 0;
  END IF;

  SELECT COUNT(*) INTO item_count
  FROM documents
  WHERE folder_id = p_folder_id AND owner_id = auth.uid();

  RETURN item_count;
END;
$function$
```

### public.get_public_doctor_by_slug(p_slug text)

- Returns: TABLE(slug text, display_name text, avatar_url text, specialty text, clinic_name text, bio text, years_experience integer, consultation_price integer, address_text text, location jsonb, is_verified boolean, avg_rating numeric, review_count bigint)
- Language: plpgsql
- Security definer: true

```sql
CREATE OR REPLACE FUNCTION public.get_public_doctor_by_slug(p_slug text)
 RETURNS TABLE(slug text, display_name text, avatar_url text, specialty text, clinic_name text, bio text, years_experience integer, consultation_price integer, address_text text, location jsonb, is_verified boolean, avg_rating numeric, review_count bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    dp.slug,
    p.full_name          AS display_name,
    p.avatar_url,
    dp.specialty,
    dp.clinic_name,
    dp.bio,
    dp.years_experience,
    dp.consultation_price_mxn AS consultation_price,
    dp.address_text,
    dp.location,
    dp.is_sep_verified   AS is_verified,
    coalesce(round(avg(vr.rating)::numeric, 1), 0) AS avg_rating,
    count(vr.id)         AS review_count
  FROM public.doctor_profiles dp
  JOIN public.profiles p ON p.id = dp.doctor_id
  LEFT JOIN public.verified_reviews vr ON vr.doctor_id = dp.doctor_id
  WHERE dp.slug = p_slug
    AND p.role = 'doctor'
    AND p.onboarding_completed = true
  GROUP BY
    dp.doctor_id, dp.slug, p.full_name, p.avatar_url,
    dp.specialty, dp.clinic_name, dp.bio, dp.years_experience,
    dp.consultation_price_mxn, dp.address_text, dp.location,
    dp.is_sep_verified
  LIMIT 1;
END;
$function$
```

### public.get_public_doctor_detail(p_slug text)

- Returns: TABLE(slug text, display_name text, avatar_url text, specialty text, clinic_name text, bio text, years_experience integer, consultation_price numeric, address_text text, city text, location jsonb, is_verified boolean, avg_rating numeric, review_count integer, languages text[], accepts_video boolean, next_available_slot text, education jsonb, illnesses_treated jsonb, services jsonb, insurances jsonb)
- Language: plpgsql
- Security definer: true

```sql
CREATE OR REPLACE FUNCTION public.get_public_doctor_detail(p_slug text)
 RETURNS TABLE(slug text, display_name text, avatar_url text, specialty text, clinic_name text, bio text, years_experience integer, consultation_price numeric, address_text text, city text, location jsonb, is_verified boolean, avg_rating numeric, review_count integer, languages text[], accepts_video boolean, next_available_slot text, education jsonb, illnesses_treated jsonb, services jsonb, insurances jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH doc_profile AS (
    SELECT
      dp.doctor_id,
      dp.slug,
      p.full_name    AS display_name,
      p.avatar_url,
      dp.specialty,
      dp.clinic_name,
      dp.bio,
      dp.years_experience,
      dp.consultation_price_mxn,
      dp.address_text,
      dp.location,
      dp.consultation_mode,
      COALESCE(dp.accepted_insurances, ARRAY[]::TEXT[]) AS accepted_insurances
    FROM doctor_profiles dp
    JOIN profiles p ON p.id = dp.doctor_id
    WHERE dp.slug = p_slug
    LIMIT 1
  ),
  review_stats AS (
    SELECT
      ROUND(AVG(vr.rating)::NUMERIC, 1) AS avg_r,
      COUNT(*)::INTEGER                  AS rev_count
    FROM public.verified_reviews vr
    JOIN doc_profile doc ON doc.doctor_id = vr.doctor_id
  ),
  services_aggr AS (
    SELECT
      ds.doctor_id,
      jsonb_agg(
        jsonb_build_object(
          'name',        ds.name,
          'price',       ds.price,
          'duration',    ds.duration,
          'description', ds.description
        ) ORDER BY ds.sort_order
      ) AS services_json
    FROM doctor_services ds
    WHERE ds.is_active = true
    GROUP BY ds.doctor_id
  )
  SELECT
    doc.slug::TEXT,
    doc.display_name::TEXT,
    doc.avatar_url::TEXT,
    doc.specialty::TEXT,
    doc.clinic_name::TEXT,
    doc.bio::TEXT,
    doc.years_experience::INTEGER,
    doc.consultation_price_mxn::NUMERIC,
    doc.address_text::TEXT,
    NULL::TEXT                                              AS city,
    doc.location::JSONB,
    false::BOOLEAN                                          AS is_verified,
    COALESCE(rs.avg_r,    0)::NUMERIC                       AS avg_rating,
    COALESCE(rs.rev_count, 0)::INTEGER                      AS review_count,
    ARRAY['Español']::TEXT[]                                AS languages,
    (doc.consultation_mode IN ('video', 'both'))::BOOLEAN   AS accepts_video,
    NULL::TEXT                                              AS next_available_slot,
    '[]'::JSONB                                             AS education,
    '[]'::JSONB                                             AS illnesses_treated,
    COALESCE(sa.services_json, '[]'::JSONB)                 AS services,
    to_jsonb(doc.accepted_insurances)                       AS insurances
  FROM   doc_profile doc
  CROSS JOIN review_stats rs
  LEFT JOIN services_aggr sa ON sa.doctor_id = doc.doctor_id;
END;
$function$
```

### public.get_public_doctor_reviews(p_slug text, p_limit integer, p_offset integer)

- Returns: TABLE(id uuid, rating smallint, rating_punctuality smallint, rating_attention smallint, rating_facilities smallint, comment text, reviewer text, is_anonymous boolean, created_at timestamp with time zone, helpful_count integer, total_count bigint)
- Language: plpgsql
- Security definer: true

```sql
CREATE OR REPLACE FUNCTION public.get_public_doctor_reviews(p_slug text, p_limit integer DEFAULT 10, p_offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, rating smallint, rating_punctuality smallint, rating_attention smallint, rating_facilities smallint, comment text, reviewer text, is_anonymous boolean, created_at timestamp with time zone, helpful_count integer, total_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_doctor_id UUID;
BEGIN
  SELECT dp.doctor_id INTO v_doctor_id
  FROM   public.doctor_profiles dp
  WHERE  dp.slug = p_slug
  LIMIT  1;

  IF v_doctor_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    vr.id,
    vr.rating,
    vr.rating_punctuality,
    vr.rating_attention,
    vr.rating_facilities,
    vr.comment,
    CASE WHEN vr.is_anonymous THEN 'Anónimo'
         ELSE COALESCE(pr.full_name, 'Paciente')
    END::TEXT                                                    AS reviewer,
    vr.is_anonymous,
    vr.created_at,
    vr.helpful_count,
    COUNT(*) OVER ()                                             AS total_count
  FROM   public.verified_reviews vr
  LEFT JOIN public.profiles pr ON pr.id = vr.patient_id AND NOT vr.is_anonymous
  WHERE  vr.doctor_id = v_doctor_id
  ORDER BY vr.created_at DESC
  LIMIT  p_limit
  OFFSET p_offset;
END;
$function$
```

### public.get_public_insurance_providers()

- Returns: TABLE(insurance_provider text, doctor_count bigint)
- Language: sql
- Security definer: true

```sql
CREATE OR REPLACE FUNCTION public.get_public_insurance_providers()
 RETURNS TABLE(insurance_provider text, doctor_count bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT di.insurance_provider, count(DISTINCT di.doctor_id) AS doctor_count
  FROM doctor_insurances di
  JOIN doctor_profiles dp ON dp.doctor_id = di.doctor_id
  JOIN profiles p ON p.id = dp.doctor_id
  WHERE p.role = 'doctor' AND p.onboarding_completed = true
  GROUP BY di.insurance_provider
  ORDER BY doctor_count DESC;
$function$
```

### public.get_public_specialties()

- Returns: TABLE(specialty text, doctor_count bigint)
- Language: sql
- Security definer: true

```sql
CREATE OR REPLACE FUNCTION public.get_public_specialties()
 RETURNS TABLE(specialty text, doctor_count bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT dp.specialty, count(*) AS doctor_count
  FROM public.doctor_profiles dp
  JOIN public.profiles p ON p.id = dp.doctor_id
  WHERE p.role = 'doctor'
    AND p.onboarding_completed = true
    AND dp.specialty IS NOT NULL
  GROUP BY dp.specialty
  ORDER BY doctor_count DESC;
$function$
```

### public.get_reviewable_appointments()

- Returns: TABLE(appointment_id uuid, doctor_id uuid, doctor_name text, doctor_slug text, doctor_avatar text, specialty text, start_at timestamp with time zone, already_reviewed boolean)
- Language: plpgsql
- Security definer: true

```sql
CREATE OR REPLACE FUNCTION public.get_reviewable_appointments()
 RETURNS TABLE(appointment_id uuid, doctor_id uuid, doctor_name text, doctor_slug text, doctor_avatar text, specialty text, start_at timestamp with time zone, already_reviewed boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_patient_id UUID;
BEGIN
  v_patient_id := auth.uid();
  IF v_patient_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    a.id                            AS appointment_id,
    a.doctor_id                     AS doctor_id,
    pr.full_name::TEXT              AS doctor_name,
    dp.slug::TEXT                   AS doctor_slug,
    pr.avatar_url::TEXT             AS doctor_avatar,
    dp.specialty::TEXT              AS specialty,
    a.start_at                      AS start_at,
    (vr.id IS NOT NULL)::BOOLEAN    AS already_reviewed
  FROM   public.appointments a
  JOIN   public.profiles      pr ON pr.id = a.doctor_id
  JOIN   public.doctor_profiles dp ON dp.doctor_id = a.doctor_id
  LEFT JOIN public.verified_reviews vr ON vr.appointment_id = a.id
  WHERE  a.patient_id = v_patient_id
    AND  a.status = 'completed'
  ORDER BY a.start_at DESC;
END;
$function$
```

### public.get_unread_total(p_user_id uuid)

- Returns: bigint
- Language: sql
- Security definer: true

```sql
CREATE OR REPLACE FUNCTION public.get_unread_total(p_user_id uuid)
 RETURNS bigint
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(SUM(cnt), 0)::bigint
  FROM (
    SELECT COUNT(*) AS cnt
    FROM messages m
    JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
    WHERE cp.user_id = p_user_id
      AND m.sender_id != p_user_id
      AND m.created_at > cp.last_read_at
  ) sub;
$function$
```

### public.gin_extract_query_trgm(text, internal, smallint, internal, internal, internal, internal)

- Returns: internal
- Language: c
- Security definer: false

```sql
CREATE OR REPLACE FUNCTION public.gin_extract_query_trgm(text, internal, smallint, internal, internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gin_extract_query_trgm$function$
```

### public.gin_extract_value_trgm(text, internal)

- Returns: internal
- Language: c
- Security definer: false

```sql
CREATE OR REPLACE FUNCTION public.gin_extract_value_trgm(text, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gin_extract_value_trgm$function$
```

### public.gin_trgm_consistent(internal, smallint, text, integer, internal, internal, internal, internal)

- Returns: boolean
- Language: c
- Security definer: false

```sql
CREATE OR REPLACE FUNCTION public.gin_trgm_consistent(internal, smallint, text, integer, internal, internal, internal, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gin_trgm_consistent$function$
```

### public.gin_trgm_triconsistent(internal, smallint, text, integer, internal, internal, internal)

- Returns: "char"
- Language: c
- Security definer: false

```sql
CREATE OR REPLACE FUNCTION public.gin_trgm_triconsistent(internal, smallint, text, integer, internal, internal, internal)
 RETURNS "char"
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gin_trgm_triconsistent$function$
```

### public.gtrgm_compress(internal)

- Returns: internal
- Language: c
- Security definer: false

```sql
CREATE OR REPLACE FUNCTION public.gtrgm_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_compress$function$
```

### public.gtrgm_consistent(internal, text, smallint, oid, internal)

- Returns: boolean
- Language: c
- Security definer: false

```sql
CREATE OR REPLACE FUNCTION public.gtrgm_consistent(internal, text, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_consistent$function$
```

### public.gtrgm_decompress(internal)

- Returns: internal
- Language: c
- Security definer: false

```sql
CREATE OR REPLACE FUNCTION public.gtrgm_decompress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_decompress$function$
```

### public.gtrgm_distance(internal, text, smallint, oid, internal)

- Returns: double precision
- Language: c
- Security definer: false

```sql
CREATE OR REPLACE FUNCTION public.gtrgm_distance(internal, text, smallint, oid, internal)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_distance$function$
```

### public.gtrgm_in(cstring)

- Returns: gtrgm
- Language: c
- Security definer: false

```sql
CREATE OR REPLACE FUNCTION public.gtrgm_in(cstring)
 RETURNS gtrgm
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_in$function$
```

### public.gtrgm_options(internal)

- Returns: void
- Language: c
- Security definer: false

```sql
CREATE OR REPLACE FUNCTION public.gtrgm_options(internal)
 RETURNS void
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE
AS '$libdir/pg_trgm', $function$gtrgm_options$function$
```

### public.gtrgm_out(gtrgm)

- Returns: cstring
- Language: c
- Security definer: false

```sql
CREATE OR REPLACE FUNCTION public.gtrgm_out(gtrgm)
 RETURNS cstring
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_out$function$
```

### public.gtrgm_penalty(internal, internal, internal)

- Returns: internal
- Language: c
- Security definer: false

```sql
CREATE OR REPLACE FUNCTION public.gtrgm_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_penalty$function$
```

### public.gtrgm_picksplit(internal, internal)

- Returns: internal
- Language: c
- Security definer: false

```sql
CREATE OR REPLACE FUNCTION public.gtrgm_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_picksplit$function$
```

### public.gtrgm_same(gtrgm, gtrgm, internal)

- Returns: internal
- Language: c
- Security definer: false

```sql
CREATE OR REPLACE FUNCTION public.gtrgm_same(gtrgm, gtrgm, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_same$function$
```

### public.gtrgm_union(internal, internal)

- Returns: gtrgm
- Language: c
- Security definer: false

```sql
CREATE OR REPLACE FUNCTION public.gtrgm_union(internal, internal)
 RETURNS gtrgm
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_union$function$
```

### public.handle_new_message()

- Returns: trigger
- Language: plpgsql
- Security definer: true

```sql
CREATE OR REPLACE FUNCTION public.handle_new_message()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    UPDATE public.conversations
    SET 
        last_message_at = NEW.created_at,
        last_message_text = NEW.body
    WHERE id = NEW.conversation_id;
    
    RETURN NEW;
END;
$function$
```

### public.handle_new_user()

- Returns: trigger
- Language: plpgsql
- Security definer: true

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _requested_role text;
  _safe_role public.user_role;
BEGIN
  _requested_role := new.raw_user_meta_data->>'role';

  -- Only allow 'patient' or 'doctor' via self-registration
  IF _requested_role IN ('patient', 'doctor') THEN
    _safe_role := _requested_role::public.user_role;
  ELSE
    _safe_role := 'patient'::public.user_role;
  END IF;

  INSERT INTO public.profiles (
    id, email, full_name, role, onboarding_completed, onboarding_step
  )
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    _safe_role,
    false,
    'role'
  )
  ON CONFLICT (id) DO UPDATE SET
    role = COALESCE(profiles.role, _safe_role),
    onboarding_completed = COALESCE(profiles.onboarding_completed, false),
    onboarding_step = COALESCE(profiles.onboarding_step, 'role');

  RETURN new;
END $function$
```

### public.handle_updated_at()

- Returns: trigger
- Language: plpgsql
- Security definer: false

```sql
CREATE OR REPLACE FUNCTION public.handle_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$
```

### public.has_consent(_patient_id uuid)

- Returns: boolean
- Language: sql
- Security definer: true

```sql
CREATE OR REPLACE FUNCTION public.has_consent(_patient_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.doctor_patient_consent
    WHERE doctor_id  = auth.uid()
      AND patient_id = _patient_id
      AND status     = 'accepted'
      AND (access_expires_at IS NULL OR access_expires_at > now())
  );
$function$
```

### public.has_patient_scope(_patient_id uuid, _scope text)

- Returns: boolean
- Language: plpgsql
- Security definer: true

```sql
CREATE OR REPLACE FUNCTION public.has_patient_scope(_patient_id uuid, _scope text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN (
    SELECT CASE _scope
      WHEN 'share_basic_profile'  THEN share_basic_profile
      WHEN 'share_contact'        THEN share_contact
      WHEN 'share_documents'      THEN share_documents
      WHEN 'share_appointments'   THEN share_appointments
      WHEN 'share_medical_notes'  THEN share_medical_notes
      ELSE false
    END
    FROM public.doctor_patient_consent
    WHERE doctor_id  = auth.uid()
      AND patient_id = _patient_id
      AND status     = 'accepted'
      AND (access_expires_at IS NULL OR access_expires_at > now())
  );
END;
$function$
```

### public.increment_review_helpful(p_review_id uuid)

- Returns: void
- Language: sql
- Security definer: true

```sql
CREATE OR REPLACE FUNCTION public.increment_review_helpful(p_review_id uuid)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  UPDATE public.verified_reviews
  SET    helpful_count = helpful_count + 1
  WHERE  id = p_review_id;
$function$
```

### public.is_conversation_participant(_conversation_id uuid)

- Returns: boolean
- Language: sql
- Security definer: true

```sql
CREATE OR REPLACE FUNCTION public.is_conversation_participant(_conversation_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = _conversation_id
      AND user_id = auth.uid()
  );
$function$
```

### public.is_doctor()

- Returns: boolean
- Language: sql
- Security definer: true

```sql
CREATE OR REPLACE FUNCTION public.is_doctor()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT public.current_role() = 'doctor';
$function$
```

### public.is_participant_of(conv_id uuid)

- Returns: boolean
- Language: sql
- Security definer: true

```sql
CREATE OR REPLACE FUNCTION public.is_participant_of(conv_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = conv_id AND user_id = auth.uid()
  );
$function$
```

### public.is_patient()

- Returns: boolean
- Language: sql
- Security definer: true

```sql
CREATE OR REPLACE FUNCTION public.is_patient()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT public.current_role() = 'patient';
$function$
```

### public.is_peer_in_conversation(_peer_id uuid)

- Returns: boolean
- Language: sql
- Security definer: true

```sql
CREATE OR REPLACE FUNCTION public.is_peer_in_conversation(_peer_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.conversation_participants cp1
    JOIN public.conversation_participants cp2
      ON cp1.conversation_id = cp2.conversation_id
    WHERE cp1.user_id = auth.uid()
      AND cp2.user_id = _peer_id
  );
$function$
```

### public.mark_conversation_read(p_conversation_id uuid, p_user_id uuid)

- Returns: void
- Language: plpgsql
- Security definer: true

```sql
CREATE OR REPLACE FUNCTION public.mark_conversation_read(p_conversation_id uuid, p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE conversation_participants
  SET last_read_at = now()
  WHERE conversation_id = p_conversation_id AND user_id = p_user_id;
END;
$function$
```

### public.prevent_role_change()

- Returns: trigger
- Language: plpgsql
- Security definer: true

```sql
CREATE OR REPLACE FUNCTION public.prevent_role_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    -- Only allow role change during onboarding (first-time selection)
    IF OLD.onboarding_completed = true THEN
      RAISE EXCEPTION 'Role cannot be changed after onboarding is complete';
    END IF;
  END IF;
  RETURN NEW;
END $function$
```

### public.search_doctors_advanced(p_query text, p_city text, p_specialty text, p_insurance text, p_accepts_video boolean, p_available_from text, p_available_to text, p_sort text, p_limit integer, p_offset integer)

- Returns: TABLE(slug text, display_name text, avatar_url text, specialty text, clinic_name text, bio text, years_experience integer, consultation_price numeric, address_text text, city text, location jsonb, is_verified boolean, avg_rating numeric, review_count integer, languages text[], accepts_video boolean, next_available_slot text, total_count integer)
- Language: plpgsql
- Security definer: true

```sql
CREATE OR REPLACE FUNCTION public.search_doctors_advanced(p_query text DEFAULT NULL::text, p_city text DEFAULT NULL::text, p_specialty text DEFAULT NULL::text, p_insurance text DEFAULT NULL::text, p_accepts_video boolean DEFAULT NULL::boolean, p_available_from text DEFAULT NULL::text, p_available_to text DEFAULT NULL::text, p_sort text DEFAULT 'rating'::text, p_limit integer DEFAULT 20, p_offset integer DEFAULT 0)
 RETURNS TABLE(slug text, display_name text, avatar_url text, specialty text, clinic_name text, bio text, years_experience integer, consultation_price numeric, address_text text, city text, location jsonb, is_verified boolean, avg_rating numeric, review_count integer, languages text[], accepts_video boolean, next_available_slot text, total_count integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total_count INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER INTO v_total_count
  FROM   doctor_profiles dp
  JOIN   profiles p ON p.id = dp.doctor_id
  WHERE
    ((p_query IS NULL) OR (
      p.full_name ILIKE '%' || p_query || '%' OR
      dp.specialty ILIKE '%' || p_query || '%' OR
      dp.bio ILIKE '%' || p_query || '%'
    ))
    AND ((p_specialty IS NULL OR p_specialty = '') OR dp.specialty = p_specialty)
    AND ((p_city IS NULL OR p_city = '') OR (
      dp.address_text ILIKE '%' || p_city || '%' OR
      (dp.location->>'city') ILIKE '%' || p_city || '%'
    ))
    AND ((p_insurance IS NULL OR p_insurance = '') OR p_insurance = ANY(dp.accepted_insurances))
    AND (
      p_accepts_video IS NULL OR
      (p_accepts_video = true  AND dp.consultation_mode IN ('video', 'both')) OR
      (p_accepts_video = false AND dp.consultation_mode IN ('in-person', 'both'))
    );

  RETURN QUERY
  WITH review_stats AS (
    SELECT
      vr.doctor_id,
      ROUND(AVG(vr.rating)::NUMERIC, 1) AS avg_r,
      COUNT(*)::INTEGER                  AS rev_count
    FROM public.verified_reviews vr
    GROUP BY vr.doctor_id
  )
  SELECT
    dp.slug::TEXT,
    p.full_name::TEXT                                     AS display_name,
    p.avatar_url::TEXT,
    dp.specialty::TEXT,
    dp.clinic_name::TEXT,
    dp.bio::TEXT,
    dp.years_experience::INTEGER,
    dp.consultation_price_mxn::NUMERIC                    AS consultation_price,
    dp.address_text::TEXT,
    NULL::TEXT                                            AS city,
    dp.location::JSONB,
    false::BOOLEAN                                        AS is_verified,
    COALESCE(rs.avg_r, 0)::NUMERIC                        AS avg_rating,
    COALESCE(rs.rev_count, 0)::INTEGER                    AS review_count,
    ARRAY['Español']::TEXT[]                              AS languages,
    (dp.consultation_mode IN ('video', 'both'))::BOOLEAN  AS accepts_video,
    NULL::TEXT                                            AS next_available_slot,
    v_total_count::INTEGER                                AS total_count
  FROM   doctor_profiles dp
  JOIN   profiles p  ON p.id = dp.doctor_id
  LEFT JOIN review_stats rs ON rs.doctor_id = dp.doctor_id
  WHERE
    ((p_query IS NULL) OR (
      p.full_name ILIKE '%' || p_query || '%' OR
      dp.specialty ILIKE '%' || p_query || '%' OR
      dp.bio ILIKE '%' || p_query || '%'
    ))
    AND ((p_specialty IS NULL OR p_specialty = '') OR dp.specialty = p_specialty)
    AND ((p_city IS NULL OR p_city = '') OR (
      dp.address_text ILIKE '%' || p_city || '%' OR
      (dp.location->>'city') ILIKE '%' || p_city || '%'
    ))
    AND ((p_insurance IS NULL OR p_insurance = '') OR p_insurance = ANY(dp.accepted_insurances))
    AND (
      p_accepts_video IS NULL OR
      (p_accepts_video = true  AND dp.consultation_mode IN ('video', 'both')) OR
      (p_accepts_video = false AND dp.consultation_mode IN ('in-person', 'both'))
    )
  ORDER BY
    CASE WHEN p_sort = 'rating'     THEN COALESCE(rs.avg_r, 0) END DESC NULLS LAST,
    CASE WHEN p_sort = 'experience' THEN dp.years_experience    END DESC NULLS LAST,
    CASE WHEN p_sort = 'price_asc'  THEN dp.consultation_price_mxn END ASC  NULLS LAST,
    CASE WHEN p_sort = 'price_desc' THEN dp.consultation_price_mxn END DESC NULLS LAST,
    CASE WHEN p_sort = 'name'       THEN p.full_name            END ASC,
    p.full_name ASC
  LIMIT  p_limit
  OFFSET p_offset;
END;
$function$
```

### public.search_public_doctors(p_query text, p_specialty text, p_sort text, p_limit integer, p_offset integer)

- Returns: TABLE(slug text, display_name text, avatar_url text, specialty text, clinic_name text, bio text, years_experience integer, consultation_price integer, address_text text, location jsonb, is_verified boolean, avg_rating numeric, review_count bigint, total_count bigint)
- Language: plpgsql
- Security definer: true

```sql
CREATE OR REPLACE FUNCTION public.search_public_doctors(p_query text DEFAULT NULL::text, p_specialty text DEFAULT NULL::text, p_sort text DEFAULT 'rating'::text, p_limit integer DEFAULT 20, p_offset integer DEFAULT 0)
 RETURNS TABLE(slug text, display_name text, avatar_url text, specialty text, clinic_name text, bio text, years_experience integer, consultation_price integer, address_text text, location jsonb, is_verified boolean, avg_rating numeric, review_count bigint, total_count bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _safe_query text;
  _uq text;
BEGIN
  IF p_query IS NOT NULL AND p_query <> '' THEN
    _safe_query := replace(replace(replace(p_query, '\', '\\'), '%', '\%'), '_', '\_');
    _uq := unaccent(_safe_query);
  ELSE
    _safe_query := NULL;
    _uq := NULL;
  END IF;

  p_limit  := LEAST(COALESCE(p_limit, 20), 50);
  p_offset := GREATEST(COALESCE(p_offset, 0), 0);

  RETURN QUERY
  SELECT
    dp.slug,
    p.full_name          AS display_name,
    p.avatar_url,
    dp.specialty,
    dp.clinic_name,
    dp.bio,
    dp.years_experience,
    dp.consultation_price_mxn AS consultation_price,
    dp.address_text,
    dp.location,
    dp.is_sep_verified   AS is_verified,
    coalesce(round(avg(vr.rating)::numeric, 1), 0) AS avg_rating,
    count(vr.id)         AS review_count,
    count(*) OVER()      AS total_count
  FROM public.doctor_profiles dp
  JOIN public.profiles p ON p.id = dp.doctor_id
  LEFT JOIN public.verified_reviews vr ON vr.doctor_id = dp.doctor_id
  WHERE p.role = 'doctor'
    AND p.onboarding_completed = true
    AND (
      _uq IS NULL
      OR unaccent(p.full_name)    ILIKE '%' || _uq || '%'
      OR unaccent(replace(dp.specialty, '_', ' ')) ILIKE '%' || _uq || '%'
      OR unaccent(dp.clinic_name) ILIKE '%' || _uq || '%'
      OR unaccent(dp.address_text) ILIKE '%' || _uq || '%'
    )
    AND (p_specialty IS NULL OR dp.specialty = p_specialty)
  GROUP BY
    dp.doctor_id, dp.slug, p.full_name, p.avatar_url,
    dp.specialty, dp.clinic_name, dp.bio, dp.years_experience,
    dp.consultation_price_mxn, dp.address_text, dp.location,
    dp.is_sep_verified
  ORDER BY
    CASE WHEN p_sort = 'rating'     THEN coalesce(avg(vr.rating), 0) END DESC,
    CASE WHEN p_sort = 'experience' THEN dp.years_experience         END DESC NULLS LAST,
    CASE WHEN p_sort = 'name'       THEN p.full_name                 END ASC,
    p.full_name ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$function$
```

### public.set_limit(real)

- Returns: real
- Language: c
- Security definer: false

```sql
CREATE OR REPLACE FUNCTION public.set_limit(real)
 RETURNS real
 LANGUAGE c
 STRICT
AS '$libdir/pg_trgm', $function$set_limit$function$
```

### public.set_updated_at()

- Returns: trigger
- Language: plpgsql
- Security definer: false

```sql
CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
```

### public.show_limit()

- Returns: real
- Language: c
- Security definer: false

```sql
CREATE OR REPLACE FUNCTION public.show_limit()
 RETURNS real
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$show_limit$function$
```

### public.show_trgm(text)

- Returns: text[]
- Language: c
- Security definer: false

```sql
CREATE OR REPLACE FUNCTION public.show_trgm(text)
 RETURNS text[]
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$show_trgm$function$
```

### public.similarity(text, text)

- Returns: real
- Language: c
- Security definer: false

```sql
CREATE OR REPLACE FUNCTION public.similarity(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$similarity$function$
```

### public.similarity_dist(text, text)

- Returns: real
- Language: c
- Security definer: false

```sql
CREATE OR REPLACE FUNCTION public.similarity_dist(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$similarity_dist$function$
```

### public.similarity_op(text, text)

- Returns: boolean
- Language: c
- Security definer: false

```sql
CREATE OR REPLACE FUNCTION public.similarity_op(text, text)
 RETURNS boolean
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$similarity_op$function$
```

### public.start_new_conversation(other_user_id uuid)

- Returns: uuid
- Language: plpgsql
- Security definer: true

```sql
CREATE OR REPLACE FUNCTION public.start_new_conversation(other_user_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_conv_id uuid;
  existing_conv_id uuid;
BEGIN
  -- Check if conversation already exists
  SELECT cp1.conversation_id INTO existing_conv_id
  FROM conversation_participants cp1
  JOIN conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
  WHERE cp1.user_id = auth.uid() AND cp2.user_id = other_user_id
  LIMIT 1;

  IF existing_conv_id IS NOT NULL THEN
    RETURN existing_conv_id;
  END IF;

  -- Create new conversation
  INSERT INTO conversations (created_at, last_message_at)
  VALUES (now(), now())
  RETURNING conversations.id INTO new_conv_id;

  -- Add both participants
  INSERT INTO conversation_participants (conversation_id, user_id, last_read_at)
  VALUES
    (new_conv_id, auth.uid(), now()),
    (new_conv_id, other_user_id, now());

  RETURN new_conv_id;
END;
$function$
```

### public.strict_word_similarity(text, text)

- Returns: real
- Language: c
- Security definer: false

```sql
CREATE OR REPLACE FUNCTION public.strict_word_similarity(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$strict_word_similarity$function$
```

### public.strict_word_similarity_commutator_op(text, text)

- Returns: boolean
- Language: c
- Security definer: false

```sql
CREATE OR REPLACE FUNCTION public.strict_word_similarity_commutator_op(text, text)
 RETURNS boolean
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$strict_word_similarity_commutator_op$function$
```

### public.strict_word_similarity_dist_commutator_op(text, text)

- Returns: real
- Language: c
- Security definer: false

```sql
CREATE OR REPLACE FUNCTION public.strict_word_similarity_dist_commutator_op(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$strict_word_similarity_dist_commutator_op$function$
```

### public.strict_word_similarity_dist_op(text, text)

- Returns: real
- Language: c
- Security definer: false

```sql
CREATE OR REPLACE FUNCTION public.strict_word_similarity_dist_op(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$strict_word_similarity_dist_op$function$
```

### public.strict_word_similarity_op(text, text)

- Returns: boolean
- Language: c
- Security definer: false

```sql
CREATE OR REPLACE FUNCTION public.strict_word_similarity_op(text, text)
 RETURNS boolean
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$strict_word_similarity_op$function$
```

### public.submit_verified_review(p_appointment_id uuid, p_rating integer, p_rating_punctuality integer, p_rating_attention integer, p_rating_facilities integer, p_comment text, p_is_anonymous boolean)

- Returns: uuid
- Language: plpgsql
- Security definer: true

```sql
CREATE OR REPLACE FUNCTION public.submit_verified_review(p_appointment_id uuid, p_rating integer, p_rating_punctuality integer DEFAULT NULL::integer, p_rating_attention integer DEFAULT NULL::integer, p_rating_facilities integer DEFAULT NULL::integer, p_comment text DEFAULT NULL::text, p_is_anonymous boolean DEFAULT false)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_patient_id      UUID;
  v_doctor_id       UUID;
  v_appt_status     TEXT;
  v_existing_review UUID;
  v_new_id          UUID;
BEGIN
  -- Verificar autenticación
  v_patient_id := auth.uid();
  IF v_patient_id IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  -- Obtener datos de la cita
  SELECT doctor_id, status
  INTO   v_doctor_id, v_appt_status
  FROM   public.appointments
  WHERE  id = p_appointment_id
    AND  patient_id = v_patient_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cita no encontrada o no pertenece al usuario';
  END IF;

  IF v_appt_status <> 'completed' THEN
    RAISE EXCEPTION 'Solo se pueden reseñar citas completadas (estado actual: %)', v_appt_status;
  END IF;

  -- Verificar que no exista una reseña previa
  SELECT id INTO v_existing_review
  FROM   public.verified_reviews
  WHERE  appointment_id = p_appointment_id;

  IF FOUND THEN
    RAISE EXCEPTION 'Ya existe una reseña para esta cita';
  END IF;

  -- Insertar reseña
  INSERT INTO public.verified_reviews (
    appointment_id,
    patient_id,
    doctor_id,
    rating,
    rating_punctuality,
    rating_attention,
    rating_facilities,
    comment,
    is_anonymous
  ) VALUES (
    p_appointment_id,
    v_patient_id,
    v_doctor_id,
    p_rating::SMALLINT,
    p_rating_punctuality::SMALLINT,
    p_rating_attention::SMALLINT,
    p_rating_facilities::SMALLINT,
    p_comment,
    p_is_anonymous
  )
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$function$
```

### public.trg_doctor_slug()

- Returns: trigger
- Language: plpgsql
- Security definer: false

```sql
CREATE OR REPLACE FUNCTION public.trg_doctor_slug()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  doc_name text;
BEGIN
  SELECT full_name INTO doc_name
  FROM public.profiles
  WHERE id = NEW.doctor_id;

  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := public.generate_doctor_slug(NEW.doctor_id, doc_name, NEW.specialty);
  END IF;

  RETURN NEW;
END;
$function$
```

### public.unaccent(regdictionary, text)

- Returns: text
- Language: c
- Security definer: false

```sql
CREATE OR REPLACE FUNCTION public.unaccent(regdictionary, text)
 RETURNS text
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/unaccent', $function$unaccent_dict$function$
```

### public.unaccent(text)

- Returns: text
- Language: c
- Security definer: false

```sql
CREATE OR REPLACE FUNCTION public.unaccent(text)
 RETURNS text
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/unaccent', $function$unaccent_dict$function$
```

### public.unaccent_init(internal)

- Returns: internal
- Language: c
- Security definer: false

```sql
CREATE OR REPLACE FUNCTION public.unaccent_init(internal)
 RETURNS internal
 LANGUAGE c
 PARALLEL SAFE
AS '$libdir/unaccent', $function$unaccent_init$function$
```

### public.unaccent_lexize(internal, internal, internal, internal)

- Returns: internal
- Language: c
- Security definer: false

```sql
CREATE OR REPLACE FUNCTION public.unaccent_lexize(internal, internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 PARALLEL SAFE
AS '$libdir/unaccent', $function$unaccent_lexize$function$
```

### public.update_updated_at_column()

- Returns: trigger
- Language: plpgsql
- Security definer: false

```sql
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
```

### public.word_similarity(text, text)

- Returns: real
- Language: c
- Security definer: false

```sql
CREATE OR REPLACE FUNCTION public.word_similarity(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$word_similarity$function$
```

### public.word_similarity_commutator_op(text, text)

- Returns: boolean
- Language: c
- Security definer: false

```sql
CREATE OR REPLACE FUNCTION public.word_similarity_commutator_op(text, text)
 RETURNS boolean
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$word_similarity_commutator_op$function$
```

### public.word_similarity_dist_commutator_op(text, text)

- Returns: real
- Language: c
- Security definer: false

```sql
CREATE OR REPLACE FUNCTION public.word_similarity_dist_commutator_op(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$word_similarity_dist_commutator_op$function$
```

### public.word_similarity_dist_op(text, text)

- Returns: real
- Language: c
- Security definer: false

```sql
CREATE OR REPLACE FUNCTION public.word_similarity_dist_op(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$word_similarity_dist_op$function$
```

### public.word_similarity_op(text, text)

- Returns: boolean
- Language: c
- Security definer: false

```sql
CREATE OR REPLACE FUNCTION public.word_similarity_op(text, text)
 RETURNS boolean
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$word_similarity_op$function$
```

### storage.can_insert_object(bucketid text, name text, owner uuid, metadata jsonb)

- Returns: void
- Language: plpgsql
- Security definer: false

```sql
CREATE OR REPLACE FUNCTION storage.can_insert_object(bucketid text, name text, owner uuid, metadata jsonb)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  INSERT INTO "storage"."objects" ("bucket_id", "name", "owner", "metadata") VALUES (bucketid, name, owner, metadata);
  -- hack to rollback the successful insert
  RAISE sqlstate 'PT200' using
  message = 'ROLLBACK',
  detail = 'rollback successful insert';
END
$function$
```

### storage.delete_leaf_prefixes(bucket_ids text[], names text[])

- Returns: void
- Language: plpgsql
- Security definer: true

```sql
CREATE OR REPLACE FUNCTION storage.delete_leaf_prefixes(bucket_ids text[], names text[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_rows_deleted integer;
BEGIN
    LOOP
        WITH candidates AS (
            SELECT DISTINCT
                t.bucket_id,
                unnest(storage.get_prefixes(t.name)) AS name
            FROM unnest(bucket_ids, names) AS t(bucket_id, name)
        ),
        uniq AS (
             SELECT
                 bucket_id,
                 name,
                 storage.get_level(name) AS level
             FROM candidates
             WHERE name <> ''
             GROUP BY bucket_id, name
        ),
        leaf AS (
             SELECT
                 p.bucket_id,
                 p.name,
                 p.level
             FROM storage.prefixes AS p
                  JOIN uniq AS u
                       ON u.bucket_id = p.bucket_id
                           AND u.name = p.name
                           AND u.level = p.level
             WHERE NOT EXISTS (
                 SELECT 1
                 FROM storage.objects AS o
                 WHERE o.bucket_id = p.bucket_id
                   AND o.level = p.level + 1
                   AND o.name COLLATE "C" LIKE p.name || '/%'
             )
             AND NOT EXISTS (
                 SELECT 1
                 FROM storage.prefixes AS c
                 WHERE c.bucket_id = p.bucket_id
                   AND c.level = p.level + 1
                   AND c.name COLLATE "C" LIKE p.name || '/%'
             )
        )
        DELETE
        FROM storage.prefixes AS p
            USING leaf AS l
        WHERE p.bucket_id = l.bucket_id
          AND p.name = l.name
          AND p.level = l.level;

        GET DIAGNOSTICS v_rows_deleted = ROW_COUNT;
        EXIT WHEN v_rows_deleted = 0;
    END LOOP;
END;
$function$
```

### storage.enforce_bucket_name_length()

- Returns: trigger
- Language: plpgsql
- Security definer: false

```sql
CREATE OR REPLACE FUNCTION storage.enforce_bucket_name_length()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
    if length(new.name) > 100 then
        raise exception 'bucket name "%" is too long (% characters). Max is 100.', new.name, length(new.name);
    end if;
    return new;
end;
$function$
```

### storage.extension(name text)

- Returns: text
- Language: plpgsql
- Security definer: false

```sql
CREATE OR REPLACE FUNCTION storage.extension(name text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
DECLARE
    _parts text[];
    _filename text;
BEGIN
    SELECT string_to_array(name, '/') INTO _parts;
    SELECT _parts[array_length(_parts,1)] INTO _filename;
    RETURN reverse(split_part(reverse(_filename), '.', 1));
END
$function$
```

### storage.filename(name text)

- Returns: text
- Language: plpgsql
- Security definer: false

```sql
CREATE OR REPLACE FUNCTION storage.filename(name text)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
_parts text[];
BEGIN
	select string_to_array(name, '/') into _parts;
	return _parts[array_length(_parts,1)];
END
$function$
```

### storage.foldername(name text)

- Returns: text[]
- Language: plpgsql
- Security definer: false

```sql
CREATE OR REPLACE FUNCTION storage.foldername(name text)
 RETURNS text[]
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
DECLARE
    _parts text[];
BEGIN
    -- Split on "/" to get path segments
    SELECT string_to_array(name, '/') INTO _parts;
    -- Return everything except the last segment
    RETURN _parts[1 : array_length(_parts,1) - 1];
END
$function$
```

### storage.get_common_prefix(p_key text, p_prefix text, p_delimiter text)

- Returns: text
- Language: sql
- Security definer: false

```sql
CREATE OR REPLACE FUNCTION storage.get_common_prefix(p_key text, p_prefix text, p_delimiter text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
SELECT CASE
    WHEN position(p_delimiter IN substring(p_key FROM length(p_prefix) + 1)) > 0
    THEN left(p_key, length(p_prefix) + position(p_delimiter IN substring(p_key FROM length(p_prefix) + 1)))
    ELSE NULL
END;
$function$
```

### storage.get_level(name text)

- Returns: integer
- Language: sql
- Security definer: false

```sql
CREATE OR REPLACE FUNCTION storage.get_level(name text)
 RETURNS integer
 LANGUAGE sql
 IMMUTABLE STRICT
AS $function$
SELECT array_length(string_to_array("name", '/'), 1);
$function$
```

### storage.get_prefix(name text)

- Returns: text
- Language: sql
- Security definer: false

```sql
CREATE OR REPLACE FUNCTION storage.get_prefix(name text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE STRICT
AS $function$
SELECT
    CASE WHEN strpos("name", '/') > 0 THEN
             regexp_replace("name", '[\/]{1}[^\/]+\/?$', '')
         ELSE
             ''
        END;
$function$
```

### storage.get_prefixes(name text)

- Returns: text[]
- Language: plpgsql
- Security definer: false

```sql
CREATE OR REPLACE FUNCTION storage.get_prefixes(name text)
 RETURNS text[]
 LANGUAGE plpgsql
 IMMUTABLE STRICT
AS $function$
DECLARE
    parts text[];
    prefixes text[];
    prefix text;
BEGIN
    -- Split the name into parts by '/'
    parts := string_to_array("name", '/');
    prefixes := '{}';

    -- Construct the prefixes, stopping one level below the last part
    FOR i IN 1..array_length(parts, 1) - 1 LOOP
            prefix := array_to_string(parts[1:i], '/');
            prefixes := array_append(prefixes, prefix);
    END LOOP;

    RETURN prefixes;
END;
$function$
```

### storage.get_size_by_bucket()

- Returns: TABLE(size bigint, bucket_id text)
- Language: plpgsql
- Security definer: false

```sql
CREATE OR REPLACE FUNCTION storage.get_size_by_bucket()
 RETURNS TABLE(size bigint, bucket_id text)
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
    return query
        select sum((metadata->>'size')::bigint) as size, obj.bucket_id
        from "storage".objects as obj
        group by obj.bucket_id;
END
$function$
```

### storage.list_multipart_uploads_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer, next_key_token text, next_upload_token text)

- Returns: TABLE(key text, id text, created_at timestamp with time zone)
- Language: plpgsql
- Security definer: false

```sql
CREATE OR REPLACE FUNCTION storage.list_multipart_uploads_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, next_key_token text DEFAULT ''::text, next_upload_token text DEFAULT ''::text)
 RETURNS TABLE(key text, id text, created_at timestamp with time zone)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY EXECUTE
        'SELECT DISTINCT ON(key COLLATE "C") * from (
            SELECT
                CASE
                    WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                        substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1)))
                    ELSE
                        key
                END AS key, id, created_at
            FROM
                storage.s3_multipart_uploads
            WHERE
                bucket_id = $5 AND
                key ILIKE $1 || ''%'' AND
                CASE
                    WHEN $4 != '''' AND $6 = '''' THEN
                        CASE
                            WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                                substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1))) COLLATE "C" > $4
                            ELSE
                                key COLLATE "C" > $4
                            END
                    ELSE
                        true
                END AND
                CASE
                    WHEN $6 != '''' THEN
                        id COLLATE "C" > $6
                    ELSE
                        true
                    END
            ORDER BY
                key COLLATE "C" ASC, created_at ASC) as e order by key COLLATE "C" LIMIT $3'
        USING prefix_param, delimiter_param, max_keys, next_key_token, bucket_id, next_upload_token;
END;
$function$
```

### storage.list_objects_with_delimiter(_bucket_id text, prefix_param text, delimiter_param text, max_keys integer, start_after text, next_token text, sort_order text)

- Returns: TABLE(name text, id uuid, metadata jsonb, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone)
- Language: plpgsql
- Security definer: false

```sql
CREATE OR REPLACE FUNCTION storage.list_objects_with_delimiter(_bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, start_after text DEFAULT ''::text, next_token text DEFAULT ''::text, sort_order text DEFAULT 'asc'::text)
 RETURNS TABLE(name text, id uuid, metadata jsonb, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
    v_peek_name TEXT;
    v_current RECORD;
    v_common_prefix TEXT;

    -- Configuration
    v_is_asc BOOLEAN;
    v_prefix TEXT;
    v_start TEXT;
    v_upper_bound TEXT;
    v_file_batch_size INT;

    -- Seek state
    v_next_seek TEXT;
    v_count INT := 0;

    -- Dynamic SQL for batch query only
    v_batch_query TEXT;

BEGIN
    -- ========================================================================
    -- INITIALIZATION
    -- ========================================================================
    v_is_asc := lower(coalesce(sort_order, 'asc')) = 'asc';
    v_prefix := coalesce(prefix_param, '');
    v_start := CASE WHEN coalesce(next_token, '') <> '' THEN next_token ELSE coalesce(start_after, '') END;
    v_file_batch_size := LEAST(GREATEST(max_keys * 2, 100), 1000);

    -- Calculate upper bound for prefix filtering (bytewise, using COLLATE "C")
    IF v_prefix = '' THEN
        v_upper_bound := NULL;
    ELSIF right(v_prefix, 1) = delimiter_param THEN
        v_upper_bound := left(v_prefix, -1) || chr(ascii(delimiter_param) + 1);
    ELSE
        v_upper_bound := left(v_prefix, -1) || chr(ascii(right(v_prefix, 1)) + 1);
    END IF;

    -- Build batch query (dynamic SQL - called infrequently, amortized over many rows)
    IF v_is_asc THEN
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" >= $2 ' ||
                'AND o.name COLLATE "C" < $3 ORDER BY o.name COLLATE "C" ASC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" >= $2 ' ||
                'ORDER BY o.name COLLATE "C" ASC LIMIT $4';
        END IF;
    ELSE
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" < $2 ' ||
                'AND o.name COLLATE "C" >= $3 ORDER BY o.name COLLATE "C" DESC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" < $2 ' ||
                'ORDER BY o.name COLLATE "C" DESC LIMIT $4';
        END IF;
    END IF;

    -- ========================================================================
    -- SEEK INITIALIZATION: Determine starting position
    -- ========================================================================
    IF v_start = '' THEN
        IF v_is_asc THEN
            v_next_seek := v_prefix;
        ELSE
            -- DESC without cursor: find the last item in range
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_prefix AND o.name COLLATE "C" < v_upper_bound
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix <> '' THEN
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            END IF;

            IF v_next_seek IS NOT NULL THEN
                v_next_seek := v_next_seek || delimiter_param;
            ELSE
                RETURN;
            END IF;
        END IF;
    ELSE
        -- Cursor provided: determine if it refers to a folder or leaf
        IF EXISTS (
            SELECT 1 FROM storage.objects o
            WHERE o.bucket_id = _bucket_id
              AND o.name COLLATE "C" LIKE v_start || delimiter_param || '%'
            LIMIT 1
        ) THEN
            -- Cursor refers to a folder
            IF v_is_asc THEN
                v_next_seek := v_start || chr(ascii(delimiter_param) + 1);
            ELSE
                v_next_seek := v_start || delimiter_param;
            END IF;
        ELSE
            -- Cursor refers to a leaf object
            IF v_is_asc THEN
                v_next_seek := v_start || delimiter_param;
            ELSE
                v_next_seek := v_start;
            END IF;
        END IF;
    END IF;

    -- ========================================================================
    -- MAIN LOOP: Hybrid peek-then-batch algorithm
    -- Uses STATIC SQL for peek (hot path) and DYNAMIC SQL for batch
    -- ========================================================================
    LOOP
        EXIT WHEN v_count >= max_keys;

        -- STEP 1: PEEK using STATIC SQL (plan cached, very fast)
        IF v_is_asc THEN
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_next_seek AND o.name COLLATE "C" < v_upper_bound
                ORDER BY o.name COLLATE "C" ASC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_next_seek
                ORDER BY o.name COLLATE "C" ASC LIMIT 1;
            END IF;
        ELSE
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix <> '' THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            END IF;
        END IF;

        EXIT WHEN v_peek_name IS NULL;

        -- STEP 2: Check if this is a FOLDER or FILE
        v_common_prefix := storage.get_common_prefix(v_peek_name, v_prefix, delimiter_param);

        IF v_common_prefix IS NOT NULL THEN
            -- FOLDER: Emit and skip to next folder (no heap access needed)
            name := rtrim(v_common_prefix, delimiter_param);
            id := NULL;
            updated_at := NULL;
            created_at := NULL;
            last_accessed_at := NULL;
            metadata := NULL;
            RETURN NEXT;
            v_count := v_count + 1;

            -- Advance seek past the folder range
            IF v_is_asc THEN
                v_next_seek := left(v_common_prefix, -1) || chr(ascii(delimiter_param) + 1);
            ELSE
                v_next_seek := v_common_prefix;
            END IF;
        ELSE
            -- FILE: Batch fetch using DYNAMIC SQL (overhead amortized over many rows)
            -- For ASC: upper_bound is the exclusive upper limit (< condition)
            -- For DESC: prefix is the inclusive lower limit (>= condition)
            FOR v_current IN EXECUTE v_batch_query USING _bucket_id, v_next_seek,
                CASE WHEN v_is_asc THEN COALESCE(v_upper_bound, v_prefix) ELSE v_prefix END, v_file_batch_size
            LOOP
                v_common_prefix := storage.get_common_prefix(v_current.name, v_prefix, delimiter_param);

                IF v_common_prefix IS NOT NULL THEN
                    -- Hit a folder: exit batch, let peek handle it
                    v_next_seek := v_current.name;
                    EXIT;
                END IF;

                -- Emit file
                name := v_current.name;
                id := v_current.id;
                updated_at := v_current.updated_at;
                created_at := v_current.created_at;
                last_accessed_at := v_current.last_accessed_at;
                metadata := v_current.metadata;
                RETURN NEXT;
                v_count := v_count + 1;

                -- Advance seek past this file
                IF v_is_asc THEN
                    v_next_seek := v_current.name || delimiter_param;
                ELSE
                    v_next_seek := v_current.name;
                END IF;

                EXIT WHEN v_count >= max_keys;
            END LOOP;
        END IF;
    END LOOP;
END;
$function$
```

### storage.operation()

- Returns: text
- Language: plpgsql
- Security definer: false

```sql
CREATE OR REPLACE FUNCTION storage.operation()
 RETURNS text
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
    RETURN current_setting('storage.operation', true);
END;
$function$
```

### storage.protect_delete()

- Returns: trigger
- Language: plpgsql
- Security definer: false

```sql
CREATE OR REPLACE FUNCTION storage.protect_delete()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Check if storage.allow_delete_query is set to 'true'
    IF COALESCE(current_setting('storage.allow_delete_query', true), 'false') != 'true' THEN
        RAISE EXCEPTION 'Direct deletion from storage tables is not allowed. Use the Storage API instead.'
            USING HINT = 'This prevents accidental data loss from orphaned objects.',
                  ERRCODE = '42501';
    END IF;
    RETURN NULL;
END;
$function$
```

### storage.search(prefix text, bucketname text, limits integer, levels integer, offsets integer, search text, sortcolumn text, sortorder text)

- Returns: TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
- Language: plpgsql
- Security definer: false

```sql
CREATE OR REPLACE FUNCTION storage.search(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text)
 RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
    v_peek_name TEXT;
    v_current RECORD;
    v_common_prefix TEXT;
    v_delimiter CONSTANT TEXT := '/';

    -- Configuration
    v_limit INT;
    v_prefix TEXT;
    v_prefix_lower TEXT;
    v_is_asc BOOLEAN;
    v_order_by TEXT;
    v_sort_order TEXT;
    v_upper_bound TEXT;
    v_file_batch_size INT;

    -- Dynamic SQL for batch query only
    v_batch_query TEXT;

    -- Seek state
    v_next_seek TEXT;
    v_count INT := 0;
    v_skipped INT := 0;
BEGIN
    -- ========================================================================
    -- INITIALIZATION
    -- ========================================================================
    v_limit := LEAST(coalesce(limits, 100), 1500);
    v_prefix := coalesce(prefix, '') || coalesce(search, '');
    v_prefix_lower := lower(v_prefix);
    v_is_asc := lower(coalesce(sortorder, 'asc')) = 'asc';
    v_file_batch_size := LEAST(GREATEST(v_limit * 2, 100), 1000);

    -- Validate sort column
    CASE lower(coalesce(sortcolumn, 'name'))
        WHEN 'name' THEN v_order_by := 'name';
        WHEN 'updated_at' THEN v_order_by := 'updated_at';
        WHEN 'created_at' THEN v_order_by := 'created_at';
        WHEN 'last_accessed_at' THEN v_order_by := 'last_accessed_at';
        ELSE v_order_by := 'name';
    END CASE;

    v_sort_order := CASE WHEN v_is_asc THEN 'asc' ELSE 'desc' END;

    -- ========================================================================
    -- NON-NAME SORTING: Use path_tokens approach (unchanged)
    -- ========================================================================
    IF v_order_by != 'name' THEN
        RETURN QUERY EXECUTE format(
            $sql$
            WITH folders AS (
                SELECT path_tokens[$1] AS folder
                FROM storage.objects
                WHERE objects.name ILIKE $2 || '%%'
                  AND bucket_id = $3
                  AND array_length(objects.path_tokens, 1) <> $1
                GROUP BY folder
                ORDER BY folder %s
            )
            (SELECT folder AS "name",
                   NULL::uuid AS id,
                   NULL::timestamptz AS updated_at,
                   NULL::timestamptz AS created_at,
                   NULL::timestamptz AS last_accessed_at,
                   NULL::jsonb AS metadata FROM folders)
            UNION ALL
            (SELECT path_tokens[$1] AS "name",
                   id, updated_at, created_at, last_accessed_at, metadata
             FROM storage.objects
             WHERE objects.name ILIKE $2 || '%%'
               AND bucket_id = $3
               AND array_length(objects.path_tokens, 1) = $1
             ORDER BY %I %s)
            LIMIT $4 OFFSET $5
            $sql$, v_sort_order, v_order_by, v_sort_order
        ) USING levels, v_prefix, bucketname, v_limit, offsets;
        RETURN;
    END IF;

    -- ========================================================================
    -- NAME SORTING: Hybrid skip-scan with batch optimization
    -- ========================================================================

    -- Calculate upper bound for prefix filtering
    IF v_prefix_lower = '' THEN
        v_upper_bound := NULL;
    ELSIF right(v_prefix_lower, 1) = v_delimiter THEN
        v_upper_bound := left(v_prefix_lower, -1) || chr(ascii(v_delimiter) + 1);
    ELSE
        v_upper_bound := left(v_prefix_lower, -1) || chr(ascii(right(v_prefix_lower, 1)) + 1);
    END IF;

    -- Build batch query (dynamic SQL - called infrequently, amortized over many rows)
    IF v_is_asc THEN
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" >= $2 ' ||
                'AND lower(o.name) COLLATE "C" < $3 ORDER BY lower(o.name) COLLATE "C" ASC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" >= $2 ' ||
                'ORDER BY lower(o.name) COLLATE "C" ASC LIMIT $4';
        END IF;
    ELSE
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" < $2 ' ||
                'AND lower(o.name) COLLATE "C" >= $3 ORDER BY lower(o.name) COLLATE "C" DESC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" < $2 ' ||
                'ORDER BY lower(o.name) COLLATE "C" DESC LIMIT $4';
        END IF;
    END IF;

    -- Initialize seek position
    IF v_is_asc THEN
        v_next_seek := v_prefix_lower;
    ELSE
        -- DESC: find the last item in range first (static SQL)
        IF v_upper_bound IS NOT NULL THEN
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_prefix_lower AND lower(o.name) COLLATE "C" < v_upper_bound
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        ELSIF v_prefix_lower <> '' THEN
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_prefix_lower
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        ELSE
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        END IF;

        IF v_peek_name IS NOT NULL THEN
            v_next_seek := lower(v_peek_name) || v_delimiter;
        ELSE
            RETURN;
        END IF;
    END IF;

    -- ========================================================================
    -- MAIN LOOP: Hybrid peek-then-batch algorithm
    -- Uses STATIC SQL for peek (hot path) and DYNAMIC SQL for batch
    -- ========================================================================
    LOOP
        EXIT WHEN v_count >= v_limit;

        -- STEP 1: PEEK using STATIC SQL (plan cached, very fast)
        IF v_is_asc THEN
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_next_seek AND lower(o.name) COLLATE "C" < v_upper_bound
                ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_next_seek
                ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
            END IF;
        ELSE
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek AND lower(o.name) COLLATE "C" >= v_prefix_lower
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix_lower <> '' THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek AND lower(o.name) COLLATE "C" >= v_prefix_lower
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            END IF;
        END IF;

        EXIT WHEN v_peek_name IS NULL;

        -- STEP 2: Check if this is a FOLDER or FILE
        v_common_prefix := storage.get_common_prefix(lower(v_peek_name), v_prefix_lower, v_delimiter);

        IF v_common_prefix IS NOT NULL THEN
            -- FOLDER: Handle offset, emit if needed, skip to next folder
            IF v_skipped < offsets THEN
                v_skipped := v_skipped + 1;
            ELSE
                name := split_part(rtrim(storage.get_common_prefix(v_peek_name, v_prefix, v_delimiter), v_delimiter), v_delimiter, levels);
                id := NULL;
                updated_at := NULL;
                created_at := NULL;
                last_accessed_at := NULL;
                metadata := NULL;
                RETURN NEXT;
                v_count := v_count + 1;
            END IF;

            -- Advance seek past the folder range
            IF v_is_asc THEN
                v_next_seek := lower(left(v_common_prefix, -1)) || chr(ascii(v_delimiter) + 1);
            ELSE
                v_next_seek := lower(v_common_prefix);
            END IF;
        ELSE
            -- FILE: Batch fetch using DYNAMIC SQL (overhead amortized over many rows)
            -- For ASC: upper_bound is the exclusive upper limit (< condition)
            -- For DESC: prefix_lower is the inclusive lower limit (>= condition)
            FOR v_current IN EXECUTE v_batch_query
                USING bucketname, v_next_seek,
                    CASE WHEN v_is_asc THEN COALESCE(v_upper_bound, v_prefix_lower) ELSE v_prefix_lower END, v_file_batch_size
            LOOP
                v_common_prefix := storage.get_common_prefix(lower(v_current.name), v_prefix_lower, v_delimiter);

                IF v_common_prefix IS NOT NULL THEN
                    -- Hit a folder: exit batch, let peek handle it
                    v_next_seek := lower(v_current.name);
                    EXIT;
                END IF;

                -- Handle offset skipping
                IF v_skipped < offsets THEN
                    v_skipped := v_skipped + 1;
                ELSE
                    -- Emit file
                    name := split_part(v_current.name, v_delimiter, levels);
                    id := v_current.id;
                    updated_at := v_current.updated_at;
                    created_at := v_current.created_at;
                    last_accessed_at := v_current.last_accessed_at;
                    metadata := v_current.metadata;
                    RETURN NEXT;
                    v_count := v_count + 1;
                END IF;

                -- Advance seek past this file
                IF v_is_asc THEN
                    v_next_seek := lower(v_current.name) || v_delimiter;
                ELSE
                    v_next_seek := lower(v_current.name);
                END IF;

                EXIT WHEN v_count >= v_limit;
            END LOOP;
        END IF;
    END LOOP;
END;
$function$
```

### storage.search_by_timestamp(p_prefix text, p_bucket_id text, p_limit integer, p_level integer, p_start_after text, p_sort_order text, p_sort_column text, p_sort_column_after text)

- Returns: TABLE(key text, name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
- Language: plpgsql
- Security definer: false

```sql
CREATE OR REPLACE FUNCTION storage.search_by_timestamp(p_prefix text, p_bucket_id text, p_limit integer, p_level integer, p_start_after text, p_sort_order text, p_sort_column text, p_sort_column_after text)
 RETURNS TABLE(key text, name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
    v_cursor_op text;
    v_query text;
    v_prefix text;
BEGIN
    v_prefix := coalesce(p_prefix, '');

    IF p_sort_order = 'asc' THEN
        v_cursor_op := '>';
    ELSE
        v_cursor_op := '<';
    END IF;

    v_query := format($sql$
        WITH raw_objects AS (
            SELECT
                o.name AS obj_name,
                o.id AS obj_id,
                o.updated_at AS obj_updated_at,
                o.created_at AS obj_created_at,
                o.last_accessed_at AS obj_last_accessed_at,
                o.metadata AS obj_metadata,
                storage.get_common_prefix(o.name, $1, '/') AS common_prefix
            FROM storage.objects o
            WHERE o.bucket_id = $2
              AND o.name COLLATE "C" LIKE $1 || '%%'
        ),
        -- Aggregate common prefixes (folders)
        -- Both created_at and updated_at use MIN(obj_created_at) to match the old prefixes table behavior
        aggregated_prefixes AS (
            SELECT
                rtrim(common_prefix, '/') AS name,
                NULL::uuid AS id,
                MIN(obj_created_at) AS updated_at,
                MIN(obj_created_at) AS created_at,
                NULL::timestamptz AS last_accessed_at,
                NULL::jsonb AS metadata,
                TRUE AS is_prefix
            FROM raw_objects
            WHERE common_prefix IS NOT NULL
            GROUP BY common_prefix
        ),
        leaf_objects AS (
            SELECT
                obj_name AS name,
                obj_id AS id,
                obj_updated_at AS updated_at,
                obj_created_at AS created_at,
                obj_last_accessed_at AS last_accessed_at,
                obj_metadata AS metadata,
                FALSE AS is_prefix
            FROM raw_objects
            WHERE common_prefix IS NULL
        ),
        combined AS (
            SELECT * FROM aggregated_prefixes
            UNION ALL
            SELECT * FROM leaf_objects
        ),
        filtered AS (
            SELECT *
            FROM combined
            WHERE (
                $5 = ''
                OR ROW(
                    date_trunc('milliseconds', %I),
                    name COLLATE "C"
                ) %s ROW(
                    COALESCE(NULLIF($6, '')::timestamptz, 'epoch'::timestamptz),
                    $5
                )
            )
        )
        SELECT
            split_part(name, '/', $3) AS key,
            name,
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
        FROM filtered
        ORDER BY
            COALESCE(date_trunc('milliseconds', %I), 'epoch'::timestamptz) %s,
            name COLLATE "C" %s
        LIMIT $4
    $sql$,
        p_sort_column,
        v_cursor_op,
        p_sort_column,
        p_sort_order,
        p_sort_order
    );

    RETURN QUERY EXECUTE v_query
    USING v_prefix, p_bucket_id, p_level, p_limit, p_start_after, p_sort_column_after;
END;
$function$
```

### storage.search_legacy_v1(prefix text, bucketname text, limits integer, levels integer, offsets integer, search text, sortcolumn text, sortorder text)

- Returns: TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
- Language: plpgsql
- Security definer: false

```sql
CREATE OR REPLACE FUNCTION storage.search_legacy_v1(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text)
 RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
    v_order_by text;
    v_sort_order text;
begin
    case
        when sortcolumn = 'name' then
            v_order_by = 'name';
        when sortcolumn = 'updated_at' then
            v_order_by = 'updated_at';
        when sortcolumn = 'created_at' then
            v_order_by = 'created_at';
        when sortcolumn = 'last_accessed_at' then
            v_order_by = 'last_accessed_at';
        else
            v_order_by = 'name';
        end case;

    case
        when sortorder = 'asc' then
            v_sort_order = 'asc';
        when sortorder = 'desc' then
            v_sort_order = 'desc';
        else
            v_sort_order = 'asc';
        end case;

    v_order_by = v_order_by || ' ' || v_sort_order;

    return query execute
        'with folders as (
           select path_tokens[$1] as folder
           from storage.objects
             where objects.name ilike $2 || $3 || ''%''
               and bucket_id = $4
               and array_length(objects.path_tokens, 1) <> $1
           group by folder
           order by folder ' || v_sort_order || '
     )
     (select folder as "name",
            null as id,
            null as updated_at,
            null as created_at,
            null as last_accessed_at,
            null as metadata from folders)
     union all
     (select path_tokens[$1] as "name",
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
     from storage.objects
     where objects.name ilike $2 || $3 || ''%''
       and bucket_id = $4
       and array_length(objects.path_tokens, 1) = $1
     order by ' || v_order_by || ')
     limit $5
     offset $6' using levels, prefix, search, bucketname, limits, offsets;
end;
$function$
```

### storage.search_v2(prefix text, bucket_name text, limits integer, levels integer, start_after text, sort_order text, sort_column text, sort_column_after text)

- Returns: TABLE(key text, name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
- Language: plpgsql
- Security definer: false

```sql
CREATE OR REPLACE FUNCTION storage.search_v2(prefix text, bucket_name text, limits integer DEFAULT 100, levels integer DEFAULT 1, start_after text DEFAULT ''::text, sort_order text DEFAULT 'asc'::text, sort_column text DEFAULT 'name'::text, sort_column_after text DEFAULT ''::text)
 RETURNS TABLE(key text, name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
    v_sort_col text;
    v_sort_ord text;
    v_limit int;
BEGIN
    -- Cap limit to maximum of 1500 records
    v_limit := LEAST(coalesce(limits, 100), 1500);

    -- Validate and normalize sort_order
    v_sort_ord := lower(coalesce(sort_order, 'asc'));
    IF v_sort_ord NOT IN ('asc', 'desc') THEN
        v_sort_ord := 'asc';
    END IF;

    -- Validate and normalize sort_column
    v_sort_col := lower(coalesce(sort_column, 'name'));
    IF v_sort_col NOT IN ('name', 'updated_at', 'created_at') THEN
        v_sort_col := 'name';
    END IF;

    -- Route to appropriate implementation
    IF v_sort_col = 'name' THEN
        -- Use list_objects_with_delimiter for name sorting (most efficient: O(k * log n))
        RETURN QUERY
        SELECT
            split_part(l.name, '/', levels) AS key,
            l.name AS name,
            l.id,
            l.updated_at,
            l.created_at,
            l.last_accessed_at,
            l.metadata
        FROM storage.list_objects_with_delimiter(
            bucket_name,
            coalesce(prefix, ''),
            '/',
            v_limit,
            start_after,
            '',
            v_sort_ord
        ) l;
    ELSE
        -- Use aggregation approach for timestamp sorting
        -- Not efficient for large datasets but supports correct pagination
        RETURN QUERY SELECT * FROM storage.search_by_timestamp(
            prefix, bucket_name, v_limit, levels, start_after,
            v_sort_ord, v_sort_col, sort_column_after
        );
    END IF;
END;
$function$
```

### storage.update_updated_at_column()

- Returns: trigger
- Language: plpgsql
- Security definer: false

```sql
CREATE OR REPLACE FUNCTION storage.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW; 
END;
$function$
```

## Policies (RLS)

| Schema | Table | Policy | Command | Roles | Using | With Check |
|---|---|---|---|---|---|---|
| public | appointment_notes | appointment_notes_insert | INSERT | public |  | ((author_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM appointments a
  WHERE ((a.id = appointment_notes.appointment_id) AND ((a.doctor_id = auth.uid()) OR (a.patient_id = auth.uid()) OR ("current_role"() = 'admin'::user_role)))))) |
| public | appointment_notes | appointment_notes_select | SELECT | public | (EXISTS ( SELECT 1
   FROM appointments a
  WHERE ((a.id = appointment_notes.appointment_id) AND ((a.doctor_id = auth.uid()) OR (a.patient_id = auth.uid()) OR ("current_role"() = 'admin'::user_role))))) |  |
| public | appointments | Doctors can insert appointments for their patients | INSERT | authenticated |  | ((auth.uid() = doctor_id) AND (patient_id IS NOT NULL)) |
| public | appointments | Participants can update their own appointments | UPDATE | authenticated | ((auth.uid() = patient_id) OR (auth.uid() = doctor_id)) | ((auth.uid() = patient_id) OR (auth.uid() = doctor_id)) |
| public | appointments | Participants can view their own appointments | SELECT | authenticated | ((auth.uid() = patient_id) OR (auth.uid() = doctor_id)) |  |
| public | appointments | Patients can insert their own appointments | INSERT | authenticated |  | (auth.uid() = patient_id) |
| public | appointments | appointments_insert | INSERT | public |  | ((created_by = auth.uid()) AND ((patient_id = auth.uid()) OR (doctor_id = auth.uid()) OR ("current_role"() = 'admin'::user_role)) AND can_access_patient(patient_id)) |
| public | appointments | appointments_select | SELECT | public | ((doctor_id = auth.uid()) OR (patient_id = auth.uid()) OR ("current_role"() = 'admin'::user_role)) |  |
| public | appointments | appointments_update | UPDATE | public | ((doctor_id = auth.uid()) OR (patient_id = auth.uid()) OR ("current_role"() = 'admin'::user_role)) | ((doctor_id = auth.uid()) OR (patient_id = auth.uid()) OR ("current_role"() = 'admin'::user_role)) |
| public | care_links | care_links_delete | DELETE | authenticated | (patient_id = auth.uid()) |  |
| public | care_links | care_links_insert | INSERT | authenticated |  | (patient_id = auth.uid()) |
| public | care_links | care_links_select | SELECT | authenticated | ((patient_id = auth.uid()) OR (doctor_id = auth.uid())) |  |
| public | care_links | care_links_update | UPDATE | authenticated | (patient_id = auth.uid()) | (patient_id = auth.uid()) |
| public | conversation_participants | cp_insert | INSERT | public |  | ((auth.uid() IS NOT NULL) AND (("current_role"() = 'admin'::user_role) OR ((user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM conversation_participants cp
  WHERE ((cp.conversation_id = conversation_participants.conversation_id) AND (cp.user_id = auth.uid()))))))) |
| public | conversation_participants | cp_select_own | SELECT | public | (user_id = auth.uid()) |  |
| public | conversation_participants | cp_update_own | UPDATE | public | (user_id = auth.uid()) |  |
| public | conversations | conv_insert | INSERT | public |  | true |
| public | conversations | conv_select | SELECT | public | is_participant_of(id) |  |
| public | conversations | conv_update | UPDATE | public | is_participant_of(id) |  |
| public | doctor_insurances | doctor_insurances_delete | DELETE | authenticated | (auth.uid() = doctor_id) |  |
| public | doctor_insurances | doctor_insurances_insert | INSERT | authenticated |  | (auth.uid() = doctor_id) |
| public | doctor_insurances | doctor_insurances_select | SELECT | authenticated | true |  |
| public | doctor_patient_consent | dpc_delete | DELETE | authenticated | (patient_id = auth.uid()) |  |
| public | doctor_patient_consent | dpc_insert | INSERT | authenticated |  | ((doctor_id = auth.uid()) AND (status = 'requested'::text)) |
| public | doctor_patient_consent | dpc_select | SELECT | authenticated | ((doctor_id = auth.uid()) OR (patient_id = auth.uid())) |  |
| public | doctor_patient_consent | dpc_update_doctor | UPDATE | authenticated | (doctor_id = auth.uid()) | ((doctor_id = auth.uid()) AND (status = 'revoked'::text)) |
| public | doctor_patient_consent | dpc_update_patient | UPDATE | authenticated | (patient_id = auth.uid()) | (patient_id = auth.uid()) |
| public | doctor_profiles | Doctor profiles are viewable by everyone | SELECT | authenticated | true |  |
| public | doctor_profiles | doctor_profiles_insert_own | INSERT | authenticated |  | (doctor_id = auth.uid()) |
| public | doctor_profiles | doctor_profiles_public_read | SELECT | public | true |  |
| public | doctor_profiles | doctor_profiles_read | SELECT | public | ((doctor_id = auth.uid()) OR ("current_role"() = 'admin'::user_role)) |  |
| public | doctor_profiles | doctor_profiles_update_own | UPDATE | authenticated | (doctor_id = auth.uid()) | (doctor_id = auth.uid()) |
| public | doctor_profiles | doctor_profiles_upsert | ALL | public | ((doctor_id = auth.uid()) OR ("current_role"() = 'admin'::user_role)) | ((doctor_id = auth.uid()) OR ("current_role"() = 'admin'::user_role)) |
| public | doctor_schedules | Public profiles are viewable by everyone. | SELECT | public | true |  |
| public | doctor_schedules | schedules_delete | DELETE | authenticated | (auth.uid() = doctor_id) |  |
| public | doctor_schedules | schedules_insert | INSERT | authenticated |  | (auth.uid() = doctor_id) |
| public | doctor_schedules | schedules_update | UPDATE | authenticated | (auth.uid() = doctor_id) | (auth.uid() = doctor_id) |
| public | doctor_services | doctor_services_delete | DELETE | authenticated | (auth.uid() = doctor_id) |  |
| public | doctor_services | doctor_services_insert | INSERT | authenticated |  | (auth.uid() = doctor_id) |
| public | doctor_services | doctor_services_select | SELECT | authenticated | true |  |
| public | doctor_services | doctor_services_update | UPDATE | authenticated | (auth.uid() = doctor_id) | (auth.uid() = doctor_id) |
| public | document_folders | folders_select_own | SELECT | public | ((owner_id = auth.uid()) OR ("current_role"() = 'admin'::user_role)) |  |
| public | document_folders | folders_write_own | ALL | public | ((owner_id = auth.uid()) OR ("current_role"() = 'admin'::user_role)) | ((owner_id = auth.uid()) OR ("current_role"() = 'admin'::user_role)) |
| public | document_shares | doc_shares_insert | INSERT | public |  | ((shared_by = auth.uid()) AND (("current_role"() = 'admin'::user_role) OR (EXISTS ( SELECT 1
   FROM documents d
  WHERE ((d.id = document_shares.document_id) AND (d.owner_id = auth.uid())))))) |
| public | document_shares | doc_shares_select | SELECT | public | ((shared_with = auth.uid()) OR (shared_by = auth.uid()) OR ("current_role"() = 'admin'::user_role)) |  |
| public | document_shares | docshares_delete | DELETE | authenticated | (shared_by = auth.uid()) |  |
| public | document_shares | docshares_insert | INSERT | authenticated |  | (shared_by = auth.uid()) |
| public | document_shares | docshares_select | SELECT | authenticated | ((shared_by = auth.uid()) OR (shared_with = auth.uid())) |  |
| public | document_shares | document_shares_select_participants | SELECT | public | ((shared_with = auth.uid()) OR (shared_by = auth.uid())) |  |
| public | documents | Users can delete their own documents | DELETE | public | (auth.uid() = owner_id) |  |
| public | documents | Users can upload their own documents | INSERT | public |  | (auth.uid() = owner_id) |
| public | documents | Users can view their own documents | SELECT | public | (auth.uid() = owner_id) |  |
| public | documents | documents_delete_owner | DELETE | authenticated | (owner_id = auth.uid()) |  |
| public | documents | documents_insert | INSERT | public |  | ((owner_id = auth.uid()) OR ("current_role"() = 'admin'::user_role)) |
| public | documents | documents_insert_owner | INSERT | authenticated |  | ((owner_id = auth.uid()) OR (uploaded_by = auth.uid())) |
| public | documents | documents_select | SELECT | public | ((owner_id = auth.uid()) OR ("current_role"() = 'admin'::user_role) OR ((patient_id IS NOT NULL) AND can_access_patient(patient_id)) OR (EXISTS ( SELECT 1
   FROM document_shares ds
  WHERE ((ds.document_id = documents.id) AND (ds.shared_with = auth.uid()))))) |  |
| public | documents | documents_select_doctor_patient | SELECT | authenticated | (is_doctor() AND has_patient_scope(patient_id, 'share_documents'::text)) |  |
| public | documents | documents_select_owner | SELECT | authenticated | ((owner_id = auth.uid()) OR (uploaded_by = auth.uid()) OR (patient_id = auth.uid())) |  |
| public | documents | documents_select_shared_with | SELECT | public | ((owner_id = auth.uid()) OR (id IN ( SELECT document_shares.document_id
   FROM document_shares
  WHERE (document_shares.shared_with = auth.uid())))) |  |
| public | documents | documents_update | UPDATE | public | ((owner_id = auth.uid()) OR ("current_role"() = 'admin'::user_role)) | ((owner_id = auth.uid()) OR ("current_role"() = 'admin'::user_role)) |
| public | documents | documents_update_owner | UPDATE | authenticated | (owner_id = auth.uid()) |  |
| public | encryption_backfill_queue | encryption_backfill_queue_admin_read | SELECT | public | ("current_role"() = 'admin'::user_role) |  |
| public | encryption_backfill_queue | encryption_backfill_queue_admin_write | ALL | public | ("current_role"() = 'admin'::user_role) | ("current_role"() = 'admin'::user_role) |
| public | encryption_key_registry | encryption_key_registry_admin_read | SELECT | public | ("current_role"() = 'admin'::user_role) |  |
| public | encryption_key_registry | encryption_key_registry_admin_write | ALL | public | ("current_role"() = 'admin'::user_role) | ("current_role"() = 'admin'::user_role) |
| public | folders | Users can create their own folders | INSERT | public |  | (auth.uid() = owner_id) |
| public | folders | Users can delete their own folders | DELETE | public | (auth.uid() = owner_id) |  |
| public | folders | Users can update their own folders | UPDATE | public | (auth.uid() = owner_id) |  |
| public | folders | Users can view their own folders | SELECT | public | (auth.uid() = owner_id) |  |
| public | messages | msg_insert | INSERT | public |  | ((sender_id = auth.uid()) AND is_participant_of(conversation_id)) |
| public | messages | msg_select | SELECT | public | is_participant_of(conversation_id) |  |
| public | notifications | notifications_delete_own | DELETE | authenticated | (user_id = auth.uid()) |  |
| public | notifications | notifications_insert_system | INSERT | authenticated |  | (user_id = auth.uid()) |
| public | notifications | notifications_select_own | SELECT | authenticated | (user_id = auth.uid()) |  |
| public | notifications | notifications_update_own | UPDATE | authenticated | (user_id = auth.uid()) |  |
| public | patient_notes | Doctors can delete their own clinical notes | DELETE | authenticated | (auth.uid() = doctor_id) |  |
| public | patient_notes | Doctors can insert their own clinical notes | INSERT | authenticated |  | ((auth.uid() = doctor_id) AND has_patient_scope(patient_id, 'share_medical_notes'::text)) |
| public | patient_notes | Doctors can update their own clinical notes | UPDATE | authenticated | (auth.uid() = doctor_id) |  |
| public | patient_notes | Doctors can view their own clinical notes | SELECT | authenticated | (auth.uid() = doctor_id) |  |
| public | patient_notes | patients_read_own_notes | SELECT | authenticated | (auth.uid() = patient_id) |  |
| public | patient_profiles | Patients can insert their own profile | INSERT | public |  | (auth.uid() = patient_id) |
| public | patient_profiles | Patients can update their own profile | UPDATE | public | (auth.uid() = patient_id) |  |
| public | patient_profiles | Patients can view their own profile | SELECT | public | (auth.uid() = patient_id) |  |
| public | patient_profiles | patient_profiles_insert | INSERT | authenticated |  | (auth.uid() = patient_id) |
| public | patient_profiles | patient_profiles_read | SELECT | public | ((patient_id = auth.uid()) OR ("current_role"() = 'admin'::user_role)) |  |
| public | patient_profiles | patient_profiles_select | SELECT | authenticated | ((auth.uid() = patient_id) OR has_patient_scope(patient_id, 'share_basic_profile'::text)) |  |
| public | patient_profiles | patient_profiles_update | UPDATE | authenticated | (auth.uid() = patient_id) |  |
| public | patient_profiles | patient_profiles_upsert | ALL | public | ((patient_id = auth.uid()) OR ("current_role"() = 'admin'::user_role)) | ((patient_id = auth.uid()) OR ("current_role"() = 'admin'::user_role)) |
| public | profiles | Users can read counterpart profiles via appointments | SELECT | public | ((auth.uid() = id) OR (EXISTS ( SELECT 1
   FROM appointments
  WHERE (((appointments.doctor_id = auth.uid()) AND (appointments.patient_id = profiles.id)) OR ((appointments.patient_id = auth.uid()) AND (appointments.doctor_id = profiles.id)))))) |  |
| public | profiles | Users can read own profile | SELECT | public | (auth.uid() = id) |  |
| public | profiles | Users can update own profile | UPDATE | public | (auth.uid() = id) |  |
| public | profiles | profiles_read_own | SELECT | public | ((id = auth.uid()) OR ("current_role"() = 'admin'::user_role)) |  |
| public | profiles | profiles_select_consented_patient | SELECT | authenticated | (EXISTS ( SELECT 1
   FROM doctor_patient_consent dpc
  WHERE ((dpc.doctor_id = auth.uid()) AND (dpc.patient_id = profiles.id) AND (dpc.status = 'accepted'::text) AND ((dpc.access_expires_at IS NULL) OR (dpc.access_expires_at > now()))))) |  |
| public | profiles | profiles_select_conversation_peer | SELECT | authenticated | is_peer_in_conversation(id) |  |
| public | profiles | profiles_select_doctors | SELECT | authenticated | (role = 'doctor'::user_role) |  |
| public | profiles | profiles_select_own | SELECT | authenticated | (id = auth.uid()) |  |
| public | profiles | profiles_update_own_safe | UPDATE | authenticated | (id = auth.uid()) | (id = auth.uid()) |
| public | sensitive_access_audit | sensitive_access_audit_admin_read | SELECT | public | ("current_role"() = 'admin'::user_role) |  |
| public | sensitive_access_audit | sensitive_access_audit_insert_self | INSERT | public |  | ((auth.uid() IS NOT NULL) AND (actor_id = auth.uid())) |
| public | specialties | specialties_public_read | SELECT | public | true |  |
| public | user_settings | Users can insert own settings | INSERT | public |  | (auth.uid() = user_id) |
| public | user_settings | Users can update own settings | UPDATE | public | (auth.uid() = user_id) | (auth.uid() = user_id) |
| public | user_settings | Users can view own settings | SELECT | public | (auth.uid() = user_id) |  |
| public | user_status | Users can manage their own status | ALL | authenticated | (auth.uid() = user_id) | (auth.uid() = user_id) |
| public | user_status | Users can view status of chat participants | SELECT | authenticated | (EXISTS ( SELECT 1
   FROM (conversation_participants buddy
     JOIN conversation_participants me ON ((buddy.conversation_id = me.conversation_id)))
  WHERE ((me.user_id = auth.uid()) AND (buddy.user_id = user_status.user_id)))) |  |
| public | verified_reviews | reviews_insert | INSERT | authenticated |  | ((auth.uid() = patient_id) AND (EXISTS ( SELECT 1
   FROM appointments a
  WHERE ((a.id = verified_reviews.appointment_id) AND (a.patient_id = auth.uid()) AND (a.status = 'completed'::appointment_status))))) |
| public | verified_reviews | reviews_insert_own | INSERT | public |  | (patient_id = auth.uid()) |
| public | verified_reviews | reviews_read_all | SELECT | public | true |  |
| public | verified_reviews | reviews_select | SELECT | authenticated | true |  |
| public | verified_reviews | verified_reviews_insert_patient | INSERT | public |  | ((auth.uid() IS NOT NULL) AND (patient_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM appointments a
  WHERE ((a.id = verified_reviews.appointment_id) AND (a.patient_id = auth.uid()) AND (a.status = 'completed'::appointment_status))))) |
| public | verified_reviews | verified_reviews_select_public | SELECT | public | true |  |
| storage | objects | Avatar images are publicly accessible | SELECT | public | (bucket_id = 'avatars'::text) |  |
| storage | objects | Users can delete their own avatar | DELETE | public | ((bucket_id = 'avatars'::text) AND (auth.role() = 'authenticated'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)) |  |
| storage | objects | Users can delete their own documents | DELETE | authenticated | ((bucket_id = 'documents'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)) |  |
| storage | objects | Users can read their own documents | SELECT | authenticated | ((bucket_id = 'documents'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)) |  |
| storage | objects | Users can update their own avatar | UPDATE | public | ((bucket_id = 'avatars'::text) AND (auth.role() = 'authenticated'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)) |  |
| storage | objects | Users can update their own documents | UPDATE | authenticated | ((bucket_id = 'documents'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)) | ((bucket_id = 'documents'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)) |
| storage | objects | Users can upload their own avatar | INSERT | public |  | ((bucket_id = 'avatars'::text) AND (auth.role() = 'authenticated'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)) |
| storage | objects | Users can upload their own documents | INSERT | authenticated |  | ((bucket_id = 'documents'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)) |
| storage | objects | documents_bucket_read_shared | SELECT | public | ((bucket_id = 'documents'::text) AND (EXISTS ( SELECT 1
   FROM documents d
  WHERE ((split_part(objects.name, '/'::text, 1) = (d.owner_id)::text) AND (split_part(objects.name, '/'::text, 2) = (d.id)::text) AND ((d.owner_id = auth.uid()) OR (d.id IN ( SELECT ds.document_id
           FROM document_shares ds
          WHERE (ds.shared_with = auth.uid())))))))) |  |
| storage | objects | documents_delete_own | DELETE | authenticated | ((bucket_id = 'documents'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)) |  |
| storage | objects | documents_insert_own | INSERT | authenticated |  | ((bucket_id = 'documents'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)) |
| storage | objects | documents_select_own | SELECT | authenticated | ((bucket_id = 'documents'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)) |  |
| storage | objects | documents_update_own | UPDATE | authenticated | ((bucket_id = 'documents'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)) |  |

## Triggers

- None

## Views

- None
## Indexes

| Schema | Table | Index | Definition |
|---|---|---|---|
| auth | audit_log_entries | audit_log_entries_pkey | CREATE UNIQUE INDEX audit_log_entries_pkey ON auth.audit_log_entries USING btree (id) |
| auth | audit_log_entries | audit_logs_instance_id_idx | CREATE INDEX audit_logs_instance_id_idx ON auth.audit_log_entries USING btree (instance_id) |
| auth | custom_oauth_providers | custom_oauth_providers_created_at_idx | CREATE INDEX custom_oauth_providers_created_at_idx ON auth.custom_oauth_providers USING btree (created_at) |
| auth | custom_oauth_providers | custom_oauth_providers_enabled_idx | CREATE INDEX custom_oauth_providers_enabled_idx ON auth.custom_oauth_providers USING btree (enabled) |
| auth | custom_oauth_providers | custom_oauth_providers_identifier_idx | CREATE INDEX custom_oauth_providers_identifier_idx ON auth.custom_oauth_providers USING btree (identifier) |
| auth | custom_oauth_providers | custom_oauth_providers_identifier_key | CREATE UNIQUE INDEX custom_oauth_providers_identifier_key ON auth.custom_oauth_providers USING btree (identifier) |
| auth | custom_oauth_providers | custom_oauth_providers_pkey | CREATE UNIQUE INDEX custom_oauth_providers_pkey ON auth.custom_oauth_providers USING btree (id) |
| auth | custom_oauth_providers | custom_oauth_providers_provider_type_idx | CREATE INDEX custom_oauth_providers_provider_type_idx ON auth.custom_oauth_providers USING btree (provider_type) |
| auth | flow_state | flow_state_created_at_idx | CREATE INDEX flow_state_created_at_idx ON auth.flow_state USING btree (created_at DESC) |
| auth | flow_state | flow_state_pkey | CREATE UNIQUE INDEX flow_state_pkey ON auth.flow_state USING btree (id) |
| auth | flow_state | idx_auth_code | CREATE INDEX idx_auth_code ON auth.flow_state USING btree (auth_code) |
| auth | flow_state | idx_user_id_auth_method | CREATE INDEX idx_user_id_auth_method ON auth.flow_state USING btree (user_id, authentication_method) |
| auth | identities | identities_email_idx | CREATE INDEX identities_email_idx ON auth.identities USING btree (email text_pattern_ops) |
| auth | identities | identities_pkey | CREATE UNIQUE INDEX identities_pkey ON auth.identities USING btree (id) |
| auth | identities | identities_provider_id_provider_unique | CREATE UNIQUE INDEX identities_provider_id_provider_unique ON auth.identities USING btree (provider_id, provider) |
| auth | identities | identities_user_id_idx | CREATE INDEX identities_user_id_idx ON auth.identities USING btree (user_id) |
| auth | instances | instances_pkey | CREATE UNIQUE INDEX instances_pkey ON auth.instances USING btree (id) |
| auth | mfa_amr_claims | amr_id_pk | CREATE UNIQUE INDEX amr_id_pk ON auth.mfa_amr_claims USING btree (id) |
| auth | mfa_amr_claims | mfa_amr_claims_session_id_authentication_method_pkey | CREATE UNIQUE INDEX mfa_amr_claims_session_id_authentication_method_pkey ON auth.mfa_amr_claims USING btree (session_id, authentication_method) |
| auth | mfa_challenges | mfa_challenge_created_at_idx | CREATE INDEX mfa_challenge_created_at_idx ON auth.mfa_challenges USING btree (created_at DESC) |
| auth | mfa_challenges | mfa_challenges_pkey | CREATE UNIQUE INDEX mfa_challenges_pkey ON auth.mfa_challenges USING btree (id) |
| auth | mfa_factors | factor_id_created_at_idx | CREATE INDEX factor_id_created_at_idx ON auth.mfa_factors USING btree (user_id, created_at) |
| auth | mfa_factors | mfa_factors_last_challenged_at_key | CREATE UNIQUE INDEX mfa_factors_last_challenged_at_key ON auth.mfa_factors USING btree (last_challenged_at) |
| auth | mfa_factors | mfa_factors_pkey | CREATE UNIQUE INDEX mfa_factors_pkey ON auth.mfa_factors USING btree (id) |
| auth | mfa_factors | mfa_factors_user_friendly_name_unique | CREATE UNIQUE INDEX mfa_factors_user_friendly_name_unique ON auth.mfa_factors USING btree (friendly_name, user_id) WHERE (TRIM(BOTH FROM friendly_name) <> ''::text) |
| auth | mfa_factors | mfa_factors_user_id_idx | CREATE INDEX mfa_factors_user_id_idx ON auth.mfa_factors USING btree (user_id) |
| auth | mfa_factors | unique_phone_factor_per_user | CREATE UNIQUE INDEX unique_phone_factor_per_user ON auth.mfa_factors USING btree (user_id, phone) |
| auth | oauth_authorizations | oauth_auth_pending_exp_idx | CREATE INDEX oauth_auth_pending_exp_idx ON auth.oauth_authorizations USING btree (expires_at) WHERE (status = 'pending'::auth.oauth_authorization_status) |
| auth | oauth_authorizations | oauth_authorizations_authorization_code_key | CREATE UNIQUE INDEX oauth_authorizations_authorization_code_key ON auth.oauth_authorizations USING btree (authorization_code) |
| auth | oauth_authorizations | oauth_authorizations_authorization_id_key | CREATE UNIQUE INDEX oauth_authorizations_authorization_id_key ON auth.oauth_authorizations USING btree (authorization_id) |
| auth | oauth_authorizations | oauth_authorizations_pkey | CREATE UNIQUE INDEX oauth_authorizations_pkey ON auth.oauth_authorizations USING btree (id) |
| auth | oauth_client_states | idx_oauth_client_states_created_at | CREATE INDEX idx_oauth_client_states_created_at ON auth.oauth_client_states USING btree (created_at) |
| auth | oauth_client_states | oauth_client_states_pkey | CREATE UNIQUE INDEX oauth_client_states_pkey ON auth.oauth_client_states USING btree (id) |
| auth | oauth_clients | oauth_clients_deleted_at_idx | CREATE INDEX oauth_clients_deleted_at_idx ON auth.oauth_clients USING btree (deleted_at) |
| auth | oauth_clients | oauth_clients_pkey | CREATE UNIQUE INDEX oauth_clients_pkey ON auth.oauth_clients USING btree (id) |
| auth | oauth_consents | oauth_consents_active_client_idx | CREATE INDEX oauth_consents_active_client_idx ON auth.oauth_consents USING btree (client_id) WHERE (revoked_at IS NULL) |
| auth | oauth_consents | oauth_consents_active_user_client_idx | CREATE INDEX oauth_consents_active_user_client_idx ON auth.oauth_consents USING btree (user_id, client_id) WHERE (revoked_at IS NULL) |
| auth | oauth_consents | oauth_consents_pkey | CREATE UNIQUE INDEX oauth_consents_pkey ON auth.oauth_consents USING btree (id) |
| auth | oauth_consents | oauth_consents_user_client_unique | CREATE UNIQUE INDEX oauth_consents_user_client_unique ON auth.oauth_consents USING btree (user_id, client_id) |
| auth | oauth_consents | oauth_consents_user_order_idx | CREATE INDEX oauth_consents_user_order_idx ON auth.oauth_consents USING btree (user_id, granted_at DESC) |
| auth | one_time_tokens | one_time_tokens_pkey | CREATE UNIQUE INDEX one_time_tokens_pkey ON auth.one_time_tokens USING btree (id) |
| auth | one_time_tokens | one_time_tokens_relates_to_hash_idx | CREATE INDEX one_time_tokens_relates_to_hash_idx ON auth.one_time_tokens USING hash (relates_to) |
| auth | one_time_tokens | one_time_tokens_token_hash_hash_idx | CREATE INDEX one_time_tokens_token_hash_hash_idx ON auth.one_time_tokens USING hash (token_hash) |
| auth | one_time_tokens | one_time_tokens_user_id_token_type_key | CREATE UNIQUE INDEX one_time_tokens_user_id_token_type_key ON auth.one_time_tokens USING btree (user_id, token_type) |
| auth | refresh_tokens | refresh_tokens_instance_id_idx | CREATE INDEX refresh_tokens_instance_id_idx ON auth.refresh_tokens USING btree (instance_id) |
| auth | refresh_tokens | refresh_tokens_instance_id_user_id_idx | CREATE INDEX refresh_tokens_instance_id_user_id_idx ON auth.refresh_tokens USING btree (instance_id, user_id) |
| auth | refresh_tokens | refresh_tokens_parent_idx | CREATE INDEX refresh_tokens_parent_idx ON auth.refresh_tokens USING btree (parent) |
| auth | refresh_tokens | refresh_tokens_pkey | CREATE UNIQUE INDEX refresh_tokens_pkey ON auth.refresh_tokens USING btree (id) |
| auth | refresh_tokens | refresh_tokens_session_id_revoked_idx | CREATE INDEX refresh_tokens_session_id_revoked_idx ON auth.refresh_tokens USING btree (session_id, revoked) |
| auth | refresh_tokens | refresh_tokens_token_unique | CREATE UNIQUE INDEX refresh_tokens_token_unique ON auth.refresh_tokens USING btree (token) |
| auth | refresh_tokens | refresh_tokens_updated_at_idx | CREATE INDEX refresh_tokens_updated_at_idx ON auth.refresh_tokens USING btree (updated_at DESC) |
| auth | saml_providers | saml_providers_entity_id_key | CREATE UNIQUE INDEX saml_providers_entity_id_key ON auth.saml_providers USING btree (entity_id) |
| auth | saml_providers | saml_providers_pkey | CREATE UNIQUE INDEX saml_providers_pkey ON auth.saml_providers USING btree (id) |
| auth | saml_providers | saml_providers_sso_provider_id_idx | CREATE INDEX saml_providers_sso_provider_id_idx ON auth.saml_providers USING btree (sso_provider_id) |
| auth | saml_relay_states | saml_relay_states_created_at_idx | CREATE INDEX saml_relay_states_created_at_idx ON auth.saml_relay_states USING btree (created_at DESC) |
| auth | saml_relay_states | saml_relay_states_for_email_idx | CREATE INDEX saml_relay_states_for_email_idx ON auth.saml_relay_states USING btree (for_email) |
| auth | saml_relay_states | saml_relay_states_pkey | CREATE UNIQUE INDEX saml_relay_states_pkey ON auth.saml_relay_states USING btree (id) |
| auth | saml_relay_states | saml_relay_states_sso_provider_id_idx | CREATE INDEX saml_relay_states_sso_provider_id_idx ON auth.saml_relay_states USING btree (sso_provider_id) |
| auth | schema_migrations | schema_migrations_pkey | CREATE UNIQUE INDEX schema_migrations_pkey ON auth.schema_migrations USING btree (version) |
| auth | sessions | sessions_not_after_idx | CREATE INDEX sessions_not_after_idx ON auth.sessions USING btree (not_after DESC) |
| auth | sessions | sessions_oauth_client_id_idx | CREATE INDEX sessions_oauth_client_id_idx ON auth.sessions USING btree (oauth_client_id) |
| auth | sessions | sessions_pkey | CREATE UNIQUE INDEX sessions_pkey ON auth.sessions USING btree (id) |
| auth | sessions | sessions_user_id_idx | CREATE INDEX sessions_user_id_idx ON auth.sessions USING btree (user_id) |
| auth | sessions | user_id_created_at_idx | CREATE INDEX user_id_created_at_idx ON auth.sessions USING btree (user_id, created_at) |
| auth | sso_domains | sso_domains_domain_idx | CREATE UNIQUE INDEX sso_domains_domain_idx ON auth.sso_domains USING btree (lower(domain)) |
| auth | sso_domains | sso_domains_pkey | CREATE UNIQUE INDEX sso_domains_pkey ON auth.sso_domains USING btree (id) |
| auth | sso_domains | sso_domains_sso_provider_id_idx | CREATE INDEX sso_domains_sso_provider_id_idx ON auth.sso_domains USING btree (sso_provider_id) |
| auth | sso_providers | sso_providers_pkey | CREATE UNIQUE INDEX sso_providers_pkey ON auth.sso_providers USING btree (id) |
| auth | sso_providers | sso_providers_resource_id_idx | CREATE UNIQUE INDEX sso_providers_resource_id_idx ON auth.sso_providers USING btree (lower(resource_id)) |
| auth | sso_providers | sso_providers_resource_id_pattern_idx | CREATE INDEX sso_providers_resource_id_pattern_idx ON auth.sso_providers USING btree (resource_id text_pattern_ops) |
| auth | users | confirmation_token_idx | CREATE UNIQUE INDEX confirmation_token_idx ON auth.users USING btree (confirmation_token) WHERE ((confirmation_token)::text !~ '^[0-9 ]*$'::text) |
| auth | users | email_change_token_current_idx | CREATE UNIQUE INDEX email_change_token_current_idx ON auth.users USING btree (email_change_token_current) WHERE ((email_change_token_current)::text !~ '^[0-9 ]*$'::text) |
| auth | users | email_change_token_new_idx | CREATE UNIQUE INDEX email_change_token_new_idx ON auth.users USING btree (email_change_token_new) WHERE ((email_change_token_new)::text !~ '^[0-9 ]*$'::text) |
| auth | users | reauthentication_token_idx | CREATE UNIQUE INDEX reauthentication_token_idx ON auth.users USING btree (reauthentication_token) WHERE ((reauthentication_token)::text !~ '^[0-9 ]*$'::text) |
| auth | users | recovery_token_idx | CREATE UNIQUE INDEX recovery_token_idx ON auth.users USING btree (recovery_token) WHERE ((recovery_token)::text !~ '^[0-9 ]*$'::text) |
| auth | users | users_email_partial_key | CREATE UNIQUE INDEX users_email_partial_key ON auth.users USING btree (email) WHERE (is_sso_user = false) |
| auth | users | users_instance_id_email_idx | CREATE INDEX users_instance_id_email_idx ON auth.users USING btree (instance_id, lower((email)::text)) |
| auth | users | users_instance_id_idx | CREATE INDEX users_instance_id_idx ON auth.users USING btree (instance_id) |
| auth | users | users_is_anonymous_idx | CREATE INDEX users_is_anonymous_idx ON auth.users USING btree (is_anonymous) |
| auth | users | users_phone_key | CREATE UNIQUE INDEX users_phone_key ON auth.users USING btree (phone) |
| auth | users | users_pkey | CREATE UNIQUE INDEX users_pkey ON auth.users USING btree (id) |
| public | appointment_notes | appointment_notes_appt_idx | CREATE INDEX appointment_notes_appt_idx ON public.appointment_notes USING btree (appointment_id) |
| public | appointment_notes | appointment_notes_pkey | CREATE UNIQUE INDEX appointment_notes_pkey ON public.appointment_notes USING btree (id) |
| public | appointments | appointments_doctor_time_idx | CREATE INDEX appointments_doctor_time_idx ON public.appointments USING btree (doctor_id, start_at) |
| public | appointments | appointments_patient_time_idx | CREATE INDEX appointments_patient_time_idx ON public.appointments USING btree (patient_id, start_at) |
| public | appointments | appointments_pkey | CREATE UNIQUE INDEX appointments_pkey ON public.appointments USING btree (id) |
| public | appointments | idx_appointments_doctor_start_status | CREATE INDEX idx_appointments_doctor_start_status ON public.appointments USING btree (doctor_id, start_at, status) |
| public | appointments | idx_unique_doctor_slot | CREATE UNIQUE INDEX idx_unique_doctor_slot ON public.appointments USING btree (doctor_id, start_at) WHERE (status = ANY (ARRAY['requested'::appointment_status, 'confirmed'::appointment_status])) |
| public | care_links | care_links_doctor_id_patient_id_key | CREATE UNIQUE INDEX care_links_doctor_id_patient_id_key ON public.care_links USING btree (doctor_id, patient_id) |
| public | care_links | care_links_doctor_idx | CREATE INDEX care_links_doctor_idx ON public.care_links USING btree (doctor_id) |
| public | care_links | care_links_patient_idx | CREATE INDEX care_links_patient_idx ON public.care_links USING btree (patient_id) |
| public | care_links | care_links_pkey | CREATE UNIQUE INDEX care_links_pkey ON public.care_links USING btree (id) |
| public | conversation_participants | conv_participants_user_idx | CREATE INDEX conv_participants_user_idx ON public.conversation_participants USING btree (user_id) |
| public | conversation_participants | conversation_participants_pkey | CREATE UNIQUE INDEX conversation_participants_pkey ON public.conversation_participants USING btree (conversation_id, user_id) |
| public | conversation_participants | idx_conv_participants_user_id | CREATE INDEX idx_conv_participants_user_id ON public.conversation_participants USING btree (user_id) |
| public | conversation_participants | idx_participants_user_id | CREATE INDEX idx_participants_user_id ON public.conversation_participants USING btree (user_id) |
| public | conversations | conversations_pkey | CREATE UNIQUE INDEX conversations_pkey ON public.conversations USING btree (id) |
| public | conversations | idx_conversations_last_message_at | CREATE INDEX idx_conversations_last_message_at ON public.conversations USING btree (last_message_at DESC) |
| public | doctor_insurances | doctor_insurances_pkey | CREATE UNIQUE INDEX doctor_insurances_pkey ON public.doctor_insurances USING btree (id) |
| public | doctor_insurances | doctor_insurances_unique | CREATE UNIQUE INDEX doctor_insurances_unique ON public.doctor_insurances USING btree (doctor_id, insurance_provider) |
| public | doctor_insurances | idx_doctor_insurances_doctor_id | CREATE INDEX idx_doctor_insurances_doctor_id ON public.doctor_insurances USING btree (doctor_id) |
| public | doctor_insurances | idx_doctor_insurances_provider | CREATE INDEX idx_doctor_insurances_provider ON public.doctor_insurances USING btree (insurance_provider) |
| public | doctor_patient_consent | doctor_patient_consent_pkey | CREATE UNIQUE INDEX doctor_patient_consent_pkey ON public.doctor_patient_consent USING btree (id) |
| public | doctor_patient_consent | idx_dpc_doctor_id | CREATE INDEX idx_dpc_doctor_id ON public.doctor_patient_consent USING btree (doctor_id) |
| public | doctor_patient_consent | idx_dpc_patient_id | CREATE INDEX idx_dpc_patient_id ON public.doctor_patient_consent USING btree (patient_id) |
| public | doctor_patient_consent | idx_dpc_status | CREATE INDEX idx_dpc_status ON public.doctor_patient_consent USING btree (status) |
| public | doctor_patient_consent | uq_doctor_patient_consent | CREATE UNIQUE INDEX uq_doctor_patient_consent ON public.doctor_patient_consent USING btree (doctor_id, patient_id) |
| public | doctor_profiles | doctor_profiles_pkey | CREATE UNIQUE INDEX doctor_profiles_pkey ON public.doctor_profiles USING btree (doctor_id) |
| public | doctor_profiles | idx_doctor_profiles_city | CREATE INDEX idx_doctor_profiles_city ON public.doctor_profiles USING btree (city) |
| public | doctor_profiles | idx_doctor_profiles_illnesses | CREATE INDEX idx_doctor_profiles_illnesses ON public.doctor_profiles USING gin (illnesses_treated) |
| public | doctor_profiles | idx_doctor_profiles_is_sep_verified | CREATE INDEX idx_doctor_profiles_is_sep_verified ON public.doctor_profiles USING btree (is_sep_verified) WHERE (is_sep_verified = true) |
| public | doctor_profiles | idx_doctor_profiles_languages | CREATE INDEX idx_doctor_profiles_languages ON public.doctor_profiles USING gin (languages) |
| public | doctor_profiles | idx_doctor_profiles_slug | CREATE UNIQUE INDEX idx_doctor_profiles_slug ON public.doctor_profiles USING btree (slug) |
| public | doctor_profiles | idx_doctor_profiles_specialty | CREATE INDEX idx_doctor_profiles_specialty ON public.doctor_profiles USING btree (specialty) |
| public | doctor_schedules | doctor_schedules_doctor_day_key | CREATE UNIQUE INDEX doctor_schedules_doctor_day_key ON public.doctor_schedules USING btree (doctor_id, day_of_week) |
| public | doctor_schedules | doctor_schedules_pkey | CREATE UNIQUE INDEX doctor_schedules_pkey ON public.doctor_schedules USING btree (id) |
| public | doctor_schedules | idx_doctor_schedules_doctor_day | CREATE INDEX idx_doctor_schedules_doctor_day ON public.doctor_schedules USING btree (doctor_id, day_of_week) WHERE (is_active = true) |
| public | doctor_schedules | idx_doctor_schedules_doctor_id | CREATE INDEX idx_doctor_schedules_doctor_id ON public.doctor_schedules USING btree (doctor_id) |
| public | doctor_services | doctor_services_pkey | CREATE UNIQUE INDEX doctor_services_pkey ON public.doctor_services USING btree (id) |
| public | doctor_services | idx_doctor_services_doctor_id | CREATE INDEX idx_doctor_services_doctor_id ON public.doctor_services USING btree (doctor_id) |
| public | document_folders | doc_folders_owner_idx | CREATE INDEX doc_folders_owner_idx ON public.document_folders USING btree (owner_id) |
| public | document_folders | document_folders_pkey | CREATE UNIQUE INDEX document_folders_pkey ON public.document_folders USING btree (id) |
| public | document_shares | doc_shares_with_idx | CREATE INDEX doc_shares_with_idx ON public.document_shares USING btree (shared_with) |
| public | document_shares | document_shares_document_id_shared_with_key | CREATE UNIQUE INDEX document_shares_document_id_shared_with_key ON public.document_shares USING btree (document_id, shared_with) |
| public | document_shares | document_shares_pkey | CREATE UNIQUE INDEX document_shares_pkey ON public.document_shares USING btree (id) |
| public | documents | documents_folder_idx | CREATE INDEX documents_folder_idx ON public.documents USING btree (folder_id) |
| public | documents | documents_owner_idx | CREATE INDEX documents_owner_idx ON public.documents USING btree (owner_id) |
| public | documents | documents_patient_idx | CREATE INDEX documents_patient_idx ON public.documents USING btree (patient_id) |
| public | documents | documents_pkey | CREATE UNIQUE INDEX documents_pkey ON public.documents USING btree (id) |
| public | encryption_backfill_queue | encryption_backfill_queue_pkey | CREATE UNIQUE INDEX encryption_backfill_queue_pkey ON public.encryption_backfill_queue USING btree (id) |
| public | encryption_backfill_queue | encryption_backfill_queue_target_table_target_id_field_name_key | CREATE UNIQUE INDEX encryption_backfill_queue_target_table_target_id_field_name_key ON public.encryption_backfill_queue USING btree (target_table, target_id, field_name) |
| public | encryption_backfill_queue | idx_encryption_backfill_queue_status | CREATE INDEX idx_encryption_backfill_queue_status ON public.encryption_backfill_queue USING btree (status, updated_at DESC) |
| public | encryption_backfill_queue | idx_encryption_backfill_queue_target | CREATE INDEX idx_encryption_backfill_queue_target ON public.encryption_backfill_queue USING btree (target_table, target_id) |
| public | encryption_key_registry | encryption_key_registry_pkey | CREATE UNIQUE INDEX encryption_key_registry_pkey ON public.encryption_key_registry USING btree (key_id) |
| public | folders | folders_pkey | CREATE UNIQUE INDEX folders_pkey ON public.folders USING btree (id) |
| public | messages | idx_messages_conversation_id | CREATE INDEX idx_messages_conversation_id ON public.messages USING btree (conversation_id) |
| public | messages | idx_messages_created_at | CREATE INDEX idx_messages_created_at ON public.messages USING btree (created_at) |
| public | messages | idx_messages_created_at_desc | CREATE INDEX idx_messages_created_at_desc ON public.messages USING btree (conversation_id, created_at DESC) |
| public | messages | messages_conv_time_idx | CREATE INDEX messages_conv_time_idx ON public.messages USING btree (conversation_id, created_at) |
| public | messages | messages_pkey | CREATE UNIQUE INDEX messages_pkey ON public.messages USING btree (id) |
| public | notifications | notifications_pkey | CREATE UNIQUE INDEX notifications_pkey ON public.notifications USING btree (id) |
| public | notifications | notifications_user_read_idx | CREATE INDEX notifications_user_read_idx ON public.notifications USING btree (user_id, is_read, created_at DESC) |
| public | patient_notes | idx_patient_notes_doctor_id | CREATE INDEX idx_patient_notes_doctor_id ON public.patient_notes USING btree (doctor_id) |
| public | patient_notes | idx_patient_notes_patient_id | CREATE INDEX idx_patient_notes_patient_id ON public.patient_notes USING btree (patient_id) |
| public | patient_notes | patient_notes_pkey | CREATE UNIQUE INDEX patient_notes_pkey ON public.patient_notes USING btree (id) |
| public | patient_profiles | patient_profiles_pkey | CREATE UNIQUE INDEX patient_profiles_pkey ON public.patient_profiles USING btree (patient_id) |
| public | profiles | idx_profiles_fullname_trgm | CREATE INDEX idx_profiles_fullname_trgm ON public.profiles USING gin (full_name gin_trgm_ops) |
| public | profiles | idx_profiles_role_onboarding | CREATE INDEX idx_profiles_role_onboarding ON public.profiles USING btree (role, onboarding_completed) |
| public | profiles | profiles_onboarding_idx | CREATE INDEX profiles_onboarding_idx ON public.profiles USING btree (onboarding_completed) |
| public | profiles | profiles_pkey | CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id) |
| public | profiles | profiles_role_idx | CREATE INDEX profiles_role_idx ON public.profiles USING btree (role) |
| public | sensitive_access_audit | sensitive_access_audit_pkey | CREATE UNIQUE INDEX sensitive_access_audit_pkey ON public.sensitive_access_audit USING btree (id) |
| public | specialties | specialties_pkey | CREATE UNIQUE INDEX specialties_pkey ON public.specialties USING btree (slug) |
| public | user_settings | user_settings_pkey | CREATE UNIQUE INDEX user_settings_pkey ON public.user_settings USING btree (user_id) |
| public | user_status | user_status_pkey | CREATE UNIQUE INDEX user_status_pkey ON public.user_status USING btree (user_id) |
| public | verified_reviews | idx_verified_reviews_doctor | CREATE INDEX idx_verified_reviews_doctor ON public.verified_reviews USING btree (doctor_id) |
| public | verified_reviews | idx_verified_reviews_patient | CREATE INDEX idx_verified_reviews_patient ON public.verified_reviews USING btree (patient_id) |
| public | verified_reviews | uq_verified_reviews_appointment | CREATE UNIQUE INDEX uq_verified_reviews_appointment ON public.verified_reviews USING btree (appointment_id) |
| public | verified_reviews | verified_reviews_pkey | CREATE UNIQUE INDEX verified_reviews_pkey ON public.verified_reviews USING btree (id) |
| storage | buckets | bname | CREATE UNIQUE INDEX bname ON storage.buckets USING btree (name) |
| storage | buckets | buckets_pkey | CREATE UNIQUE INDEX buckets_pkey ON storage.buckets USING btree (id) |
| storage | buckets_analytics | buckets_analytics_pkey | CREATE UNIQUE INDEX buckets_analytics_pkey ON storage.buckets_analytics USING btree (id) |
| storage | buckets_analytics | buckets_analytics_unique_name_idx | CREATE UNIQUE INDEX buckets_analytics_unique_name_idx ON storage.buckets_analytics USING btree (name) WHERE (deleted_at IS NULL) |
| storage | buckets_vectors | buckets_vectors_pkey | CREATE UNIQUE INDEX buckets_vectors_pkey ON storage.buckets_vectors USING btree (id) |
| storage | migrations | migrations_name_key | CREATE UNIQUE INDEX migrations_name_key ON storage.migrations USING btree (name) |
| storage | migrations | migrations_pkey | CREATE UNIQUE INDEX migrations_pkey ON storage.migrations USING btree (id) |
| storage | objects | bucketid_objname | CREATE UNIQUE INDEX bucketid_objname ON storage.objects USING btree (bucket_id, name) |
| storage | objects | idx_objects_bucket_id_name | CREATE INDEX idx_objects_bucket_id_name ON storage.objects USING btree (bucket_id, name COLLATE "C") |
| storage | objects | idx_objects_bucket_id_name_lower | CREATE INDEX idx_objects_bucket_id_name_lower ON storage.objects USING btree (bucket_id, lower(name) COLLATE "C") |
| storage | objects | name_prefix_search | CREATE INDEX name_prefix_search ON storage.objects USING btree (name text_pattern_ops) |
| storage | objects | objects_pkey | CREATE UNIQUE INDEX objects_pkey ON storage.objects USING btree (id) |
| storage | s3_multipart_uploads | idx_multipart_uploads_list | CREATE INDEX idx_multipart_uploads_list ON storage.s3_multipart_uploads USING btree (bucket_id, key, created_at) |
| storage | s3_multipart_uploads | s3_multipart_uploads_pkey | CREATE UNIQUE INDEX s3_multipart_uploads_pkey ON storage.s3_multipart_uploads USING btree (id) |
| storage | s3_multipart_uploads_parts | s3_multipart_uploads_parts_pkey | CREATE UNIQUE INDEX s3_multipart_uploads_parts_pkey ON storage.s3_multipart_uploads_parts USING btree (id) |
| storage | vector_indexes | vector_indexes_name_bucket_id_idx | CREATE UNIQUE INDEX vector_indexes_name_bucket_id_idx ON storage.vector_indexes USING btree (name, bucket_id) |
| storage | vector_indexes | vector_indexes_pkey | CREATE UNIQUE INDEX vector_indexes_pkey ON storage.vector_indexes USING btree (id) |

## Storage

### Buckets

| ID | Name | Public | File Size Limit | Allowed Mime Types |
|---|---|---|---|---|
| documents | documents | false |  |  |
| avatars | avatars | false |  |  |

### Storage Policies (storage.objects)

- Avatar images are publicly accessible (SELECT)
  - USING: (bucket_id = 'avatars'::text)
- Users can delete their own avatar (DELETE)
  - USING: ((bucket_id = 'avatars'::text) AND (auth.role() = 'authenticated'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text))
- Users can delete their own documents (DELETE)
  - USING: ((bucket_id = 'documents'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text))
- Users can read their own documents (SELECT)
  - USING: ((bucket_id = 'documents'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text))
- Users can update their own avatar (UPDATE)
  - USING: ((bucket_id = 'avatars'::text) AND (auth.role() = 'authenticated'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text))
- Users can update their own documents (UPDATE)
  - USING: ((bucket_id = 'documents'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text))
  - WITH CHECK: ((bucket_id = 'documents'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text))
- Users can upload their own avatar (INSERT)
  - WITH CHECK: ((bucket_id = 'avatars'::text) AND (auth.role() = 'authenticated'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text))
- Users can upload their own documents (INSERT)
  - WITH CHECK: ((bucket_id = 'documents'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text))
- documents_bucket_read_shared (SELECT)
  - USING: ((bucket_id = 'documents'::text) AND (EXISTS ( SELECT 1
   FROM documents d
  WHERE ((split_part(objects.name, '/'::text, 1) = (d.owner_id)::text) AND (split_part(objects.name, '/'::text, 2) = (d.id)::text) AND ((d.owner_id = auth.uid()) OR (d.id IN ( SELECT ds.document_id
           FROM document_shares ds
          WHERE (ds.shared_with = auth.uid()))))))))
- documents_delete_own (DELETE)
  - USING: ((bucket_id = 'documents'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text))
- documents_insert_own (INSERT)
  - WITH CHECK: ((bucket_id = 'documents'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text))
- documents_select_own (SELECT)
  - USING: ((bucket_id = 'documents'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text))
- documents_update_own (UPDATE)
  - USING: ((bucket_id = 'documents'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text))
