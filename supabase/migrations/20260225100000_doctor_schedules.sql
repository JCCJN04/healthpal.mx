-- =============================================================================
-- DOCTOR SCHEDULES — Weekly availability table
-- =============================================================================
-- Stores the regular weekly hours for each doctor.
-- day_of_week: 0 = Sunday, 1 = Monday ... 6 = Saturday

CREATE TABLE IF NOT EXISTS public.doctor_schedules (
  id             uuid        NOT NULL DEFAULT gen_random_uuid(),
  doctor_id      uuid        NOT NULL REFERENCES public.doctor_profiles(doctor_id) ON DELETE CASCADE,
  day_of_week    smallint    NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  open_time      time        NOT NULL,
  close_time     time        NOT NULL,
  is_active      boolean     NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT doctor_schedules_pkey PRIMARY KEY (id),
  CONSTRAINT doctor_schedules_doctor_day_key UNIQUE (doctor_id, day_of_week)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_doctor_schedules_doctor_id
  ON public.doctor_schedules (doctor_id);

-- RLS
ALTER TABLE public.doctor_schedules ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read schedules
DROP POLICY IF EXISTS "schedules_select" ON public.doctor_schedules;
CREATE POLICY "schedules_select"
  ON public.doctor_schedules FOR SELECT
  TO authenticated
  USING (true);

-- Doctors can manage their own schedule
DROP POLICY IF EXISTS "schedules_insert" ON public.doctor_schedules;
CREATE POLICY "schedules_insert"
  ON public.doctor_schedules FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = doctor_id);

DROP POLICY IF EXISTS "schedules_update" ON public.doctor_schedules;
CREATE POLICY "schedules_update"
  ON public.doctor_schedules FOR UPDATE
  TO authenticated
  USING (auth.uid() = doctor_id)
  WITH CHECK (auth.uid() = doctor_id);

DROP POLICY IF EXISTS "schedules_delete" ON public.doctor_schedules;
CREATE POLICY "schedules_delete"
  ON public.doctor_schedules FOR DELETE
  TO authenticated
  USING (auth.uid() = doctor_id);

-- Seed default schedule for existing doctors (Mon–Fri 9–17, no weekends)
INSERT INTO public.doctor_schedules (doctor_id, day_of_week, open_time, close_time, is_active)
SELECT
  dp.doctor_id,
  d.day,
  CASE WHEN d.day IN (1,2,3,4,5) THEN '09:00'::time ELSE '09:00'::time END,
  CASE WHEN d.day IN (1,2,3,4,5) THEN '17:00'::time ELSE '14:00'::time END,
  CASE WHEN d.day IN (1,2,3,4,5) THEN true ELSE false END
FROM public.doctor_profiles dp
CROSS JOIN (VALUES (0),(1),(2),(3),(4),(5),(6)) AS d(day)
ON CONFLICT (doctor_id, day_of_week) DO NOTHING;
