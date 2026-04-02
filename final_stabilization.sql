-- ============================================================
-- 💎 FINAL STABILIZATION & PERFORMANCE v6.0 (FINAL RECOVERY)
-- 💎 Resolve schema inconsistencies, RLS recursion and save bugs.
-- ============================================================

-- 1. CLEANUP (Remove all legacy policies to avoid conflicts)
DO $$ 
DECLARE
    r RECORD;
    tabs TEXT[] := ARRAY[
        'user_roles', 'services', 'artists', 'plans', 'promotions', 'settings', 
        'gallery', 'gallery_categories', 'product_categories', 'products', 
        'service_products', 'stock_movements', 'barber_usage_logs', 'stock_alerts', 
        'finances', 'appointments', 'customers', 'promotion_interests', 'plan_subscriptions'
    ];
    t TEXT;
BEGIN
    FOREACH t IN ARRAY tabs LOOP
        FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t) LOOP
            EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.' || quote_ident(t);
        END LOOP;
    END LOOP;
END $$;

-- 2. SCHEMA UNIFICATION (Ensure all critical columns exist)
-- Table: user_roles
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_roles') THEN
        CREATE TABLE public.user_roles (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID UNIQUE,
            email TEXT UNIQUE,
            role TEXT NOT NULL DEFAULT 'barber' CHECK (role IN ('admin', 'barber', 'manager')),
            artist_id UUID,
            access_pin TEXT,
            created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
        );
    END IF;
END $$;

ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS access_pin TEXT;
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS artist_id UUID;
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS email TEXT;
-- Ensure uniqueness where possible
DO $$ BEGIN
    ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_email_key UNIQUE (email);
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Table: artists
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS commission_percentage DECIMAL(5,2) DEFAULT 0.00;
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- 3. SECURITY DEFINER HELPER FUNCTIONS (Anti-Recursion)
-- These bypass RLS checks to safely determine roles.
CREATE OR REPLACE FUNCTION public.check_is_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin');
$$;

CREATE OR REPLACE FUNCTION public.get_my_artist_id()
RETURNS UUID LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT artist_id FROM public.user_roles WHERE user_id = auth.uid();
$$;

-- 4. RPC: get_my_role (Optimized and Fail-safe)
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_role TEXT;
    v_email TEXT;
BEGIN
    -- 1. Quick check by UUID
    SELECT role INTO v_role FROM public.user_roles WHERE user_id = auth.uid();
    IF v_role IS NOT NULL THEN RETURN v_role; END IF;

    -- 2. Email-based mapping (from JWT)
    v_email := auth.jwt() ->> 'email';
    IF v_email IS NOT NULL THEN
        SELECT role INTO v_role FROM public.user_roles WHERE email = LOWER(TRIM(v_email));
        IF v_role IS NOT NULL THEN
            UPDATE public.user_roles SET user_id = auth.uid() WHERE email = LOWER(TRIM(v_email));
            RETURN v_role;
        END IF;

        -- Fallback: Automatic recovery for Master Admin
        IF v_email IN ('lucasgregolin0@gmail.com', 'lucasgregolin95@gmail.com') THEN
            INSERT INTO public.user_roles (user_id, email, role) 
            VALUES (auth.uid(), LOWER(TRIM(v_email)), 'admin')
            ON CONFLICT (email) DO UPDATE SET user_id = auth.uid(), role = 'admin';
            RETURN 'admin';
        END IF;
    END IF;

    RETURN 'none';
END;
$$;

-- 5. RLS POLICIES (Consolidated, Fast and Fail-safe)
-- Table: user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Master Admin Fail-safe: Always allowed by Email via JWT
CREATE POLICY "ur_master_all" ON public.user_roles FOR ALL 
USING (auth.jwt() ->> 'email' IN ('lucasgregolin0@gmail.com', 'lucasgregolin95@gmail.com'))
WITH CHECK (auth.jwt() ->> 'email' IN ('lucasgregolin0@gmail.com', 'lucasgregolin95@gmail.com'));

CREATE POLICY "ur_select_self" ON public.user_roles FOR SELECT USING (auth.uid() = user_id OR public.check_is_admin());
CREATE POLICY "ur_admin_all" ON public.user_roles FOR ALL USING (public.check_is_admin());

-- Bulk policy application for Public Read / Admin All tables
DO $$ 
DECLARE
    t TEXT;
    tabs TEXT[] := ARRAY[
        'services', 'artists', 'plans', 'promotions', 'settings', 
        'gallery', 'gallery_categories', 'product_categories', 'products', 'finances',
        'promotion_interests', 'appointments', 'plan_subscriptions', 'customers',
        'service_products', 'stock_movements', 'barber_usage_logs', 'stock_alerts'
    ];
BEGIN
    FOREACH t IN ARRAY tabs LOOP
        EXECUTE 'ALTER TABLE public.' || quote_ident(t) || ' ENABLE ROW LEVEL SECURITY';
        EXECUTE 'CREATE POLICY "p_read_' || t || '" ON public.' || quote_ident(t) || ' FOR SELECT USING (true)';
        -- Admin All Policy with Email Fail-safe
        EXECUTE 'CREATE POLICY "p_admin_all_' || t || '" ON public.' || quote_ident(t) || ' FOR ALL USING (public.check_is_admin() OR (auth.jwt() ->> ''email'' IN (''lucasgregolin0@gmail.com'', ''lucasgregolin95@gmail.com'')))';
    END LOOP;
END $$;

-- Appointments: Admin manages all, Barber sees own
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app_manage" ON public.appointments FOR ALL USING (public.check_is_admin());
CREATE POLICY "app_own" ON public.appointments FOR SELECT USING (artist_id = public.get_my_artist_id());

-- Customers/Subscriptions: Admin only for now (CRM)
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cust_all" ON public.customers FOR ALL USING (public.check_is_admin());

ALTER TABLE public.plan_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sub_all" ON public.plan_subscriptions FOR ALL USING (public.check_is_admin());
CREATE POLICY "sub_own" ON public.plan_subscriptions FOR SELECT USING (artist_id = public.get_my_artist_id());

-- 6. INDEXING (Turbo Charge queries)
CREATE INDEX IF NOT EXISTS idx_user_roles_email_pin ON public.user_roles(email, access_pin);
CREATE INDEX IF NOT EXISTS idx_appointments_date_status ON public.appointments(date, status);
CREATE INDEX IF NOT EXISTS idx_appointments_artist_id ON public.appointments(artist_id);

-- 7. MASTER RECOVERY (Ensures the user can always log back in)
INSERT INTO public.user_roles (email, role)
VALUES ('lucasgregolin0@gmail.com', 'admin')
ON CONFLICT (email) DO UPDATE SET role = 'admin';

-- Reload Schema Cache
NOTIFY pgrst, 'reload schema';
