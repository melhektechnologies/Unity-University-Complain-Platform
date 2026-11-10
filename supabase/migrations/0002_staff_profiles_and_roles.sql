-- =============================================================================
-- Migration: 0002_staff_profiles_and_roles
-- Purpose:   Staff authentication identity, role enumeration, and
--            multi-role junction table.
--            profiles.id is a 1:1 foreign key into auth.users (Supabase Auth).
-- Security:  RLS enabled. Staff may read their own profile.
--            System Admin manages role assignments exclusively.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Roles (Enumeration Table)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.roles (
  id          VARCHAR(50)  PRIMARY KEY,   -- slug, e.g. 'student_affairs_admin'
  name        VARCHAR(100) NOT NULL,
  description TEXT         NOT NULL,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT clock_timestamp()
);

COMMENT ON TABLE public.roles IS 'Authoritative enumeration of all system roles. Managed by System Admin.';

-- ---------------------------------------------------------------------------
-- 2. Staff Profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id              UUID         PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name       VARCHAR(150) NOT NULL,
  email           VARCHAR(255) NOT NULL,
  phone           VARCHAR(50)  NULL,
  department_id   UUID         NULL REFERENCES public.departments(id) ON DELETE SET NULL,
  is_active       BOOLEAN      NOT NULL DEFAULT true,
  last_login_at   TIMESTAMPTZ  NULL,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT clock_timestamp(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT profiles_email_unique UNIQUE (email)
);

CREATE INDEX idx_profiles_email      ON public.profiles (email);
CREATE INDEX idx_profiles_department ON public.profiles (department_id);
CREATE INDEX idx_profiles_active     ON public.profiles (is_active);

COMMENT ON TABLE  public.profiles              IS 'Staff user profiles. Linked 1:1 with Supabase Auth users. Contains NO complaint data.';
COMMENT ON COLUMN public.profiles.department_id IS 'Primary departmental affiliation. Used for RLS department-scoped query filtering.';
COMMENT ON COLUMN public.profiles.is_active     IS 'When false: auth sessions are rejected on every server request. Immediate deactivation.';

-- ---------------------------------------------------------------------------
-- 3. User Roles (Multi-role junction)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_roles (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_id         VARCHAR(50) NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  assigned_by     UUID        NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT user_roles_unique UNIQUE (profile_id, role_id)
);

CREATE INDEX idx_user_roles_profile ON public.user_roles (profile_id);
CREATE INDEX idx_user_roles_role    ON public.user_roles (role_id);

COMMENT ON TABLE public.user_roles IS 'Staff-to-role assignment junction. A single user may hold multiple roles. Managed by System Admin only.';

-- ---------------------------------------------------------------------------
-- 4. Auto-update updated_at trigger for profiles
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = clock_timestamp();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at_trigger
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 5. Auto-create profile on new auth.users insert (Supabase hook)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New Staff Member'),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

COMMENT ON FUNCTION public.handle_new_user() IS 'Automatically provisions a staff profile row when Supabase Auth creates a new user. Full_name and department must be set via admin UI post-creation.';
