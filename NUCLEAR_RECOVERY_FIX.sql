-- ============================================================
-- ☢️ NUCLEAR RECOVERY & TOTAL RECONSTRUCTION (2026)
-- Este script REFAZ a estrutura base para garantir 100% de funcionamento.
-- ============================================================

-- 1. LIMPEZA TOTAL (Remover tudo que pode causar conflito)
-- Remover triggers e funções com CASCADE para limpar dependências
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user_role() CASCADE;
DROP FUNCTION IF EXISTS public.get_my_role() CASCADE;
DROP FUNCTION IF EXISTS public.check_is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.get_my_artist_id() CASCADE;

-- Limpeza massiva de políticas existentes em todas as tabelas core
DO $$ 
DECLARE
    r RECORD;
    tabs TEXT[] := ARRAY[
        'user_roles', 'services', 'artists', 'plans', 'promotions', 'settings', 
        'gallery', 'gallery_categories', 'product_categories', 'products', 
        'service_products', 'stock_movements', 'barber_usage_logs', 'stock_alerts', 
        'finances', 'appointments', 'customers'
    ];
    t TEXT;
BEGIN
    FOREACH t IN ARRAY tabs LOOP
        FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t) LOOP
            EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.' || quote_ident(t);
        END LOOP;
    END LOOP;
END $$;

-- 2. RECONSTRUÇÃO DA TABELA DE CARGOS (Limpa e Funcional)
-- Se houver erro de foreign key, podemos ter que limpar outras tabelas primeiro.
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID UNIQUE,
    email TEXT UNIQUE,
    role TEXT NOT NULL DEFAULT 'barber' CHECK (role IN ('admin', 'barber', 'manager')),
    artist_id UUID,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

-- Forçar colunas corretas (caso a tabela já exista)
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS user_id UUID UNIQUE;
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'barber';

-- 3. GARANTIR ESTRUTURA CORE (Serviços e Profissionais)
CREATE TABLE IF NOT EXISTS public.services (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    duration_mins INTEGER DEFAULT 30,
    price NUMERIC(10,2) DEFAULT 0.00,
    description TEXT,
    is_featured BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.artists (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    specialty TEXT,
    bio TEXT,
    photo_url TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

-- 4. FUNÇÕES DE SEGURANÇA (SECURITY DEFINER) - ANTI-RECURSÃO
CREATE OR REPLACE FUNCTION public.check_is_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin');
$$;

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_role TEXT;
    v_email TEXT;
BEGIN
    SELECT role INTO v_role FROM public.user_roles WHERE user_id = auth.uid();
    IF v_role IS NOT NULL THEN RETURN v_role; END IF;

    v_email := auth.jwt() ->> 'email';
    IF v_email IS NOT NULL THEN
        SELECT role INTO v_role FROM public.user_roles WHERE email = v_email;
        IF v_role IS NOT NULL THEN
            UPDATE public.user_roles SET user_id = auth.uid() WHERE email = v_email;
            RETURN v_role;
        ELSE
            -- Se não existe, cria como Admin se for o e-mail do dono, senão barbeiro
            IF v_email = 'lucasgregolin0@gmail.com' THEN
                INSERT INTO public.user_roles (user_id, email, role) VALUES (auth.uid(), v_email, 'admin')
                ON CONFLICT (email) DO UPDATE SET user_id = auth.uid(), role = 'admin';
                RETURN 'admin';
            ELSE
                INSERT INTO public.user_roles (user_id, email, role) VALUES (auth.uid(), v_email, 'barber')
                ON CONFLICT (email) DO UPDATE SET user_id = auth.uid();
                RETURN 'barber';
            END IF;
        END IF;
    END IF;
    RETURN 'none';
END;
$$;

-- 5. CONFIGURAÇÃO DE RLS (BLINDADA E COMPLETA)
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow select for self or admin" ON public.user_roles FOR SELECT USING (auth.uid() = user_id OR public.check_is_admin());
CREATE POLICY "Allow all for admin" ON public.user_roles FOR ALL USING (public.check_is_admin());

-- Regras para tabelas públicas (Leitura Livre, Escrita Admin)
DO $$ 
DECLARE
    tab TEXT;
    tabs TEXT[] := ARRAY[
        'services', 'artists', 'plans', 'promotions', 'settings', 
        'gallery', 'gallery_categories', 'product_categories', 'products', 
        'service_products', 'stock_movements', 'barber_usage_logs', 'stock_alerts', 'finances'
    ];
BEGIN
    FOREACH tab IN ARRAY tabs LOOP
        EXECUTE 'ALTER TABLE public.' || quote_ident(tab) || ' ENABLE ROW LEVEL SECURITY';
        EXECUTE 'CREATE POLICY "p_read_' || tab || '" ON public.' || quote_ident(tab) || ' FOR SELECT USING (true)';
        EXECUTE 'CREATE POLICY "p_all_' || tab || '" ON public.' || quote_ident(tab) || ' FOR ALL USING (public.check_is_admin())';
    END LOOP;
END $$;

-- Regras para Agendamentos (Dono ou Admin)
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app_manage" ON public.appointments FOR ALL USING (public.check_is_admin());
CREATE POLICY "app_own" ON public.appointments FOR SELECT USING (
    CASE 
        WHEN public.check_is_admin() THEN true 
        ELSE artist_id = (SELECT artist_id FROM public.user_roles WHERE user_id = auth.uid())
    END
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cust_all" ON public.customers FOR ALL USING (public.check_is_admin());

-- 6. RESTAURAÇÃO DE IDENTIDADE MASTER
-- Garantir que seu e-mail seja Admin ANTES de você logar
INSERT INTO public.user_roles (email, role)
VALUES ('lucasgregolin0@gmail.com', 'admin')
ON CONFLICT (email) DO UPDATE SET role = 'admin';

-- 7. SEED DE DADOS (Restaura o que sumiu)
INSERT INTO public.services (name, price, duration_mins, is_featured) VALUES
('Corte Social Moderno', 50.00, 45, true),
('Barhoterapia Relaxante', 40.00, 40, true),
('Combo Flow (Corte + Barba)', 80.00, 70, true)
ON CONFLICT DO NOTHING;

INSERT INTO public.artists (name, specialty, active) VALUES
('Mestre Navalha', 'Cortes Clássicos', true),
('Giba do Fade', 'Degradê e Freestyle', true)
ON CONFLICT DO NOTHING;

-- FIM DA RECONSTRUÇÃO RADICAL
