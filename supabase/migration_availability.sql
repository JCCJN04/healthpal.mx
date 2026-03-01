-- =========================================================================
--  DISPONIBILIDAD REAL v4 — FIX RLS + RESERVAS
--  Ejecutar en: Supabase Dashboard → SQL Editor
--
--  ROOT CAUSE: doctor_profiles tiene RLS que bloquea lectura anónima.
--  El frontend intenta resolver slug → doctor_id via tabla directa
--  pero falla silenciosamente → retorna 0 slots.
--
--  SOLUCIÓN: Nueva función que acepta SLUG y resuelve doctor_id 
--  internamente con SECURITY DEFINER (bypass RLS).
-- =========================================================================

-- Limpiar versiones anteriores
DROP FUNCTION IF EXISTS get_doctor_availability(uuid, date, date);
DROP FUNCTION IF EXISTS get_doctor_availability_by_slug(text, date, date);

-- ─── Función principal: acepta SLUG en vez de doctor_id ─────────────────────

CREATE OR REPLACE FUNCTION get_doctor_availability_by_slug(
  p_slug text,
  p_start_date date,
  p_end_date date
)
RETURNS TABLE(slot_date date, slot_time time, slot_ts text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

GRANT EXECUTE ON FUNCTION get_doctor_availability_by_slug(text, date, date) TO anon;
GRANT EXECUTE ON FUNCTION get_doctor_availability_by_slug(text, date, date) TO authenticated;

-- Índices (idempotentes)
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_doctor_slot
ON appointments (doctor_id, start_at)
WHERE status IN ('requested', 'confirmed');

CREATE INDEX IF NOT EXISTS idx_appointments_doctor_start_status
ON appointments (doctor_id, start_at, status);

CREATE INDEX IF NOT EXISTS idx_doctor_schedules_doctor_day
ON doctor_schedules (doctor_id, day_of_week)
WHERE is_active = true;
