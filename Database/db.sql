-- =========================
-- HealthPal.mx - Supabase DB
-- =========================

-- Extensions
create extension if not exists pgcrypto;

-- ==============
-- ENUMS
-- ==============
do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum ('patient', 'doctor', 'admin');
  end if;

  if not exists (select 1 from pg_type where typname = 'sex_type') then
    create type public.sex_type as enum ('male', 'female', 'other', 'unspecified');
  end if;

  if not exists (select 1 from pg_type where typname = 'appointment_status') then
    create type public.appointment_status as enum
      ('requested','confirmed','completed','cancelled','rejected','no_show');
  end if;

  if not exists (select 1 from pg_type where typname = 'visit_mode') then
    create type public.visit_mode as enum ('in_person','video','phone');
  end if;

  if not exists (select 1 from pg_type where typname = 'doc_category') then
    create type public.doc_category as enum
      ('radiology','prescription','history','lab','insurance','other');
  end if;
end $$;

-- ==============
-- PROFILES
-- ==============
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null default 'patient',
  full_name text,
  email text,
  phone text,
  sex public.sex_type not null default 'unspecified',
  birthdate date,
  avatar_url text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles(role);

-- Doctor extended profile (config doctor)
create table if not exists public.doctor_profiles (
  doctor_id uuid primary key references public.profiles(id) on delete cascade,
  professional_license text,     -- cédula profesional
  specialty text,
  clinic_name text,
  bio text,
  years_experience int,
  consultation_price_mxn int,
  address_text text,             -- dirección mostrada (simple)
  location jsonb,                -- opcional: {lat, lng}
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Patient extended profile (config patient)
create table if not exists public.patient_profiles (
  patient_id uuid primary key references public.profiles(id) on delete cascade,
  address_text text,
  emergency_contact_name text,
  emergency_contact_phone text,
  blood_type text,
  allergies text,
  chronic_conditions text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- updated_at trigger helper
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_doctor_profiles_updated_at on public.doctor_profiles;
create trigger trg_doctor_profiles_updated_at
before update on public.doctor_profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_patient_profiles_updated_at on public.patient_profiles;
create trigger trg_patient_profiles_updated_at
before update on public.patient_profiles
for each row execute function public.set_updated_at();

-- Auto-create profile on auth signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;

  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- ==============
-- DOCTOR <-> PATIENT RELATION (Care team)
-- ==============
create table if not exists public.care_links (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.profiles(id) on delete cascade,
  patient_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'active', -- active | pending | blocked
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (doctor_id, patient_id)
);

create index if not exists care_links_doctor_idx on public.care_links(doctor_id);
create index if not exists care_links_patient_idx on public.care_links(patient_id);

-- ==============
-- APPOINTMENTS (Consultas + Calendario)
-- ==============
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.profiles(id) on delete cascade,
  patient_id uuid not null references public.profiles(id) on delete cascade,

  status public.appointment_status not null default 'requested',
  mode public.visit_mode not null default 'in_person',

  start_at timestamptz not null,
  end_at timestamptz not null,

  reason text,          -- motivo (dolor, seguimiento, etc.)
  symptoms text,        -- info adicional
  location_text text,   -- para “presencial”
  location jsonb,       -- opcional {lat,lng}

  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint chk_end_after_start check (end_at > start_at)
);

create index if not exists appointments_doctor_time_idx on public.appointments(doctor_id, start_at);
create index if not exists appointments_patient_time_idx on public.appointments(patient_id, start_at);

drop trigger if exists trg_appointments_updated_at on public.appointments;
create trigger trg_appointments_updated_at
before update on public.appointments
for each row execute function public.set_updated_at();

-- Optional: notes for an appointment
create table if not exists public.appointment_notes (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  note text not null,
  created_at timestamptz not null default now()
);

create index if not exists appointment_notes_appt_idx on public.appointment_notes(appointment_id);

-- ==============
-- MESSAGING (Chats)
-- ==============
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  last_message_at timestamptz
);

create table if not exists public.conversation_participants (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_in_chat text, -- optional
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create index if not exists conv_participants_user_idx
on public.conversation_participants(user_id);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists messages_conv_time_idx
on public.messages(conversation_id, created_at);

-- ==============
-- DOCUMENTS (Lista/Grid + Detalle + Share)
-- ==============
create table if not exists public.document_folders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create index if not exists doc_folders_owner_idx on public.document_folders(owner_id);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),

  owner_id uuid not null references public.profiles(id) on delete cascade,
  patient_id uuid references public.profiles(id) on delete set null,  -- normalmente = owner si es paciente
  uploaded_by uuid references public.profiles(id) on delete set null, -- doctor/patient

  folder_id uuid references public.document_folders(id) on delete set null,

  title text not null,
  category public.doc_category not null default 'other',

  file_path text not null,     -- path en Supabase Storage
  mime_type text,
  file_size int,
  checksum text,

  notes text,                  -- “Notas” del panel derecho
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists documents_owner_idx on public.documents(owner_id);
create index if not exists documents_patient_idx on public.documents(patient_id);
create index if not exists documents_folder_idx on public.documents(folder_id);

drop trigger if exists trg_documents_updated_at on public.documents;
create trigger trg_documents_updated_at
before update on public.documents
for each row execute function public.set_updated_at();

-- Document sharing (doctor <-> patient)
create table if not exists public.document_shares (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  shared_with uuid not null references public.profiles(id) on delete cascade,
  shared_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (document_id, shared_with)
);

create index if not exists doc_shares_with_idx on public.document_shares(shared_with);

-- ==============
-- NOTIFICATIONS (pendientes)
-- ==============
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null, -- 'message' | 'document' | 'appointment'
  title text,
  body text,
  entity_table text,
  entity_id uuid,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_read_idx
on public.notifications(user_id, is_read, created_at desc);

-- ==========================================
-- RLS HELPERS
-- ==========================================
create or replace function public.current_role()
returns public.user_role
language sql stable as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_doctor()
returns boolean
language sql stable as $$
  select (public.current_role() = 'doctor' or public.current_role() = 'admin')
$$;

create or replace function public.is_patient()
returns boolean
language sql stable as $$
  select (public.current_role() = 'patient' or public.current_role() = 'admin')
$$;

create or replace function public.can_access_patient(_patient_id uuid)
returns boolean
language sql stable as $$
  select
    auth.uid() = _patient_id
    or public.current_role() = 'admin'
    or exists (
      select 1 from public.care_links cl
      where cl.patient_id = _patient_id
        and cl.doctor_id = auth.uid()
        and cl.status = 'active'
    )
$$;

-- ==========================================
-- ENABLE RLS + POLICIES
-- ==========================================
alter table public.profiles enable row level security;
alter table public.doctor_profiles enable row level security;
alter table public.patient_profiles enable row level security;
alter table public.care_links enable row level security;
alter table public.appointments enable row level security;
alter table public.appointment_notes enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;
alter table public.document_folders enable row level security;
alter table public.documents enable row level security;
alter table public.document_shares enable row level security;
alter table public.notifications enable row level security;

-- PROFILES: each user can read/update own profile; admin can read all
drop policy if exists "profiles_read_own" on public.profiles;
create policy "profiles_read_own"
on public.profiles for select
using (id = auth.uid() or public.current_role() = 'admin');

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
using (id = auth.uid() or public.current_role() = 'admin')
with check (id = auth.uid() or public.current_role() = 'admin');

-- Doctor/Patient profile tables
drop policy if exists "doctor_profiles_read" on public.doctor_profiles;
create policy "doctor_profiles_read"
on public.doctor_profiles for select
using (doctor_id = auth.uid() or public.current_role() = 'admin');

drop policy if exists "doctor_profiles_upsert" on public.doctor_profiles;
create policy "doctor_profiles_upsert"
on public.doctor_profiles for all
using (doctor_id = auth.uid() or public.current_role() = 'admin')
with check (doctor_id = auth.uid() or public.current_role() = 'admin');

drop policy if exists "patient_profiles_read" on public.patient_profiles;
create policy "patient_profiles_read"
on public.patient_profiles for select
using (patient_id = auth.uid() or public.current_role() = 'admin');

drop policy if exists "patient_profiles_upsert" on public.patient_profiles;
create policy "patient_profiles_upsert"
on public.patient_profiles for all
using (patient_id = auth.uid() or public.current_role() = 'admin')
with check (patient_id = auth.uid() or public.current_role() = 'admin');

-- CARE LINKS
drop policy if exists "care_links_select" on public.care_links;
create policy "care_links_select"
on public.care_links for select
using (
  doctor_id = auth.uid()
  or patient_id = auth.uid()
  or public.current_role() = 'admin'
);

drop policy if exists "care_links_insert" on public.care_links;
create policy "care_links_insert"
on public.care_links for insert
with check (
  created_by = auth.uid()
  and (doctor_id = auth.uid() or patient_id = auth.uid() or public.current_role() = 'admin')
);

drop policy if exists "care_links_update" on public.care_links;
create policy "care_links_update"
on public.care_links for update
using (
  doctor_id = auth.uid()
  or patient_id = auth.uid()
  or public.current_role() = 'admin'
)
with check (
  doctor_id = auth.uid()
  or patient_id = auth.uid()
  or public.current_role() = 'admin'
);

-- APPOINTMENTS
drop policy if exists "appointments_select" on public.appointments;
create policy "appointments_select"
on public.appointments for select
using (
  doctor_id = auth.uid()
  or patient_id = auth.uid()
  or public.current_role() = 'admin'
);

drop policy if exists "appointments_insert" on public.appointments;
create policy "appointments_insert"
on public.appointments for insert
with check (
  created_by = auth.uid()
  and (patient_id = auth.uid() or doctor_id = auth.uid() or public.current_role() = 'admin')
  and public.can_access_patient(patient_id)
);

drop policy if exists "appointments_update" on public.appointments;
create policy "appointments_update"
on public.appointments for update
using (
  doctor_id = auth.uid()
  or patient_id = auth.uid()
  or public.current_role() = 'admin'
)
with check (
  doctor_id = auth.uid()
  or patient_id = auth.uid()
  or public.current_role() = 'admin'
);

-- APPOINTMENT NOTES (doctor or patient in that appointment)
drop policy if exists "appointment_notes_select" on public.appointment_notes;
create policy "appointment_notes_select"
on public.appointment_notes for select
using (
  exists (
    select 1 from public.appointments a
    where a.id = appointment_id
      and (a.doctor_id = auth.uid() or a.patient_id = auth.uid() or public.current_role() = 'admin')
  )
);

drop policy if exists "appointment_notes_insert" on public.appointment_notes;
create policy "appointment_notes_insert"
on public.appointment_notes for insert
with check (
  author_id = auth.uid()
  and exists (
    select 1 from public.appointments a
    where a.id = appointment_id
      and (a.doctor_id = auth.uid() or a.patient_id = auth.uid() or public.current_role() = 'admin')
  )
);

-- CONVERSATIONS / PARTICIPANTS / MESSAGES
drop policy if exists "conversations_select" on public.conversations;
create policy "conversations_select"
on public.conversations for select
using (
  exists (
    select 1 from public.conversation_participants cp
    where cp.conversation_id = id and cp.user_id = auth.uid()
  )
);

drop policy if exists "conversation_participants_select" on public.conversation_participants;
create policy "conversation_participants_select"
on public.conversation_participants for select
using (user_id = auth.uid());

drop policy if exists "messages_select" on public.messages;
create policy "messages_select"
on public.messages for select
using (
  exists (
    select 1 from public.conversation_participants cp
    where cp.conversation_id = conversation_id and cp.user_id = auth.uid()
  )
);

drop policy if exists "messages_insert" on public.messages;
create policy "messages_insert"
on public.messages for insert
with check (
  sender_id = auth.uid()
  and exists (
    select 1 from public.conversation_participants cp
    where cp.conversation_id = conversation_id and cp.user_id = auth.uid()
  )
);

-- DOCUMENT FOLDERS
drop policy if exists "folders_select_own" on public.document_folders;
create policy "folders_select_own"
on public.document_folders for select
using (owner_id = auth.uid() or public.current_role() = 'admin');

drop policy if exists "folders_write_own" on public.document_folders;
create policy "folders_write_own"
on public.document_folders for all
using (owner_id = auth.uid() or public.current_role() = 'admin')
with check (owner_id = auth.uid() or public.current_role() = 'admin');

-- DOCUMENTS
drop policy if exists "documents_select" on public.documents;
create policy "documents_select"
on public.documents for select
using (
  owner_id = auth.uid()
  or public.current_role() = 'admin'
  or (patient_id is not null and public.can_access_patient(patient_id))
  or exists (
    select 1 from public.document_shares ds
    where ds.document_id = id and ds.shared_with = auth.uid()
  )
);

drop policy if exists "documents_insert" on public.documents;
create policy "documents_insert"
on public.documents for insert
with check (
  owner_id = auth.uid()
  or public.current_role() = 'admin'
);

drop policy if exists "documents_update" on public.documents;
create policy "documents_update"
on public.documents for update
using (
  owner_id = auth.uid()
  or public.current_role() = 'admin'
)
with check (
  owner_id = auth.uid()
  or public.current_role() = 'admin'
);

-- DOCUMENT SHARES
drop policy if exists "doc_shares_select" on public.document_shares;
create policy "doc_shares_select"
on public.document_shares for select
using (
  shared_with = auth.uid()
  or shared_by = auth.uid()
  or public.current_role() = 'admin'
);

drop policy if exists "doc_shares_insert" on public.document_shares;
create policy "doc_shares_insert"
on public.document_shares for insert
with check (
  shared_by = auth.uid()
  and (
    public.current_role() = 'admin'
    or exists (
      select 1 from public.documents d
      where d.id = document_id and d.owner_id = auth.uid()
    )
  )
);

-- NOTIFICATIONS
drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
on public.notifications for select
using (user_id = auth.uid() or public.current_role() = 'admin');

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
on public.notifications for update
using (user_id = auth.uid() or public.current_role() = 'admin')
with check (user_id = auth.uid() or public.current_role() = 'admin');

-- =========================================
-- STORAGE POLICIES (avatars + documents)
-- (SIN ALTER TABLE storage.objects)
-- =========================================

-- =========================
-- 1) AVATARS (bucket público)
-- Convención: avatars/{user_id}/avatar.png
-- =========================

drop policy if exists "avatars_insert_own_folder" on storage.objects;
create policy "avatars_insert_own_folder"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and name like (auth.uid()::text || '/%')
);

drop policy if exists "avatars_update_own_folder" on storage.objects;
create policy "avatars_update_own_folder"
on storage.objects for update
to authenticated
using (
  bucket_id = 'avatars'
  and name like (auth.uid()::text || '/%')
)
with check (
  bucket_id = 'avatars'
  and name like (auth.uid()::text || '/%')
);

drop policy if exists "avatars_delete_own_folder" on storage.objects;
create policy "avatars_delete_own_folder"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'avatars'
  and name like (auth.uid()::text || '/%')
);

-- Nota: lectura pública de avatars la controla el bucket "Public = ON".
-- Si lo pusiste público, no necesitas policy de SELECT.


-- =========================
-- 2) DOCUMENTS (bucket privado)
-- Convención: documents/{owner_id}/{document_id}/{filename}
-- =========================

-- Insert: SOLO el dueño puede subir dentro de su carpeta
drop policy if exists "documents_insert_owner_folder" on storage.objects;
create policy "documents_insert_owner_folder"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'documents'
  and name ~ '^[0-9a-fA-F-]{36}/[0-9a-fA-F-]{36}/.+'
  and split_part(name, '/', 1) = auth.uid()::text
);

-- Select: dueño OR compartido OR doctor relacionado (care_links activo) OR admin
drop policy if exists "documents_select_owner_or_authorized" on storage.objects;
create policy "documents_select_owner_or_authorized"
on storage.objects for select
to authenticated
using (
  bucket_id = 'documents'
  and name ~ '^[0-9a-fA-F-]{36}/[0-9a-fA-F-]{36}/.+'
  and (
    -- (1) dueño
    split_part(name, '/', 1) = auth.uid()::text

    -- (2) compartido explícitamente
    or exists (
      select 1
      from public.document_shares ds
      where ds.document_id = split_part(name, '/', 2)::uuid
        and ds.shared_with = auth.uid()
    )

    -- (3) doctor relacionado con el paciente (owner_id)
    or exists (
      select 1
      from public.care_links cl
      where cl.status = 'active'
        and cl.doctor_id = auth.uid()
        and cl.patient_id = split_part(name, '/', 1)::uuid
    )

    -- (4) admin
    or public.current_role() = 'admin'
  )
);

-- Update: SOLO el dueño
drop policy if exists "documents_update_owner_only" on storage.objects;
create policy "documents_update_owner_only"
on storage.objects for update
to authenticated
using (
  bucket_id = 'documents'
  and name ~ '^[0-9a-fA-F-]{36}/[0-9a-fA-F-]{36}/.+'
  and split_part(name, '/', 1) = auth.uid()::text
)
with check (
  bucket_id = 'documents'
  and name ~ '^[0-9a-fA-F-]{36}/[0-9a-fA-F-]{36}/.+'
  and split_part(name, '/', 1) = auth.uid()::text
);

-- Delete: SOLO el dueño
drop policy if exists "documents_delete_owner_only" on storage.objects;
create policy "documents_delete_owner_only"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'documents'
  and name ~ '^[0-9a-fA-F-]{36}/[0-9a-fA-F-]{36}/.+'
  and split_part(name, '/', 1) = auth.uid()::text
);
    