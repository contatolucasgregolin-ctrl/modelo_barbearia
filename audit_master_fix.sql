-- ============================================================
-- 🛠️ MASTER RECOVERY v2.2 - FINAL STABILIZATION (2026)
-- Resolve Recursão, Vínculo de E-mail e bloqueio de Acesso.
-- ============================================================

-- 1. LIMPEZA TOTAL (Remover políticas antigas)
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname, tablename FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename IN ('user_roles', 'services', 'artists', 'appointments', 'customers', 'settings', 'plans', 'promotions', 'products', 'inventory_logs', 'gallery', 'product_categories', 'service_products', 'stock_movements', 'barber_usage_logs', 'stock_alerts', 'finances')
    ) LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.' || quote_ident(r.tablename);
    END LOOP;
END $$;

-- 2. ESTRUTURA BLINDADA (user_roles)
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID UNIQUE,
    email TEXT UNIQUE,
    role TEXT NOT NULL DEFAULT 'barber' CHECK (role IN ('admin', 'barber', 'manager')),
    artist_id UUID,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

-- Garantir colunas essenciais
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_roles' AND column_name = 'email') THEN
        ALTER TABLE public.user_roles ADD COLUMN email TEXT UNIQUE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_roles' AND column_name = 'user_id') THEN
        ALTER TABLE public.user_roles ADD COLUMN user_id UUID UNIQUE;
    END IF;
END $$;

-- 3. FUNÇÕES DE SEGURANÇA (SECURITY DEFINER)
-- Essas funções quebram o loop de recursão do RLS.
CREATE OR REPLACE FUNCTION public.check_is_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin');
$$;

CREATE OR REPLACE FUNCTION public.get_my_artist_id()
RETURNS UUID LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT artist_id FROM public.user_roles WHERE user_id = auth.uid();
$$;

-- 4. RPC PARA LOGIN (get_my_role) - Vínculo Inteligente
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_role TEXT;
    v_email TEXT;
BEGIN
    -- 1. Buscar por UUID direto
    SELECT role INTO v_role FROM public.user_roles WHERE user_id = auth.uid();
    IF v_role IS NOT NULL THEN RETURN v_role; END IF;

    -- 2. Se não achou, buscar por E-mail (do token JWT)
    v_email := auth.jwt() ->> 'email';
    IF v_email IS NOT NULL THEN
        -- Tenta ver se já existe um cadastro por email para esse usuário
        SELECT role INTO v_role FROM public.user_roles WHERE email = v_email;
        
        IF v_role IS NOT NULL THEN
            -- Vincula o UUID ao cadastro de email existente
            UPDATE public.user_roles SET user_id = auth.uid() WHERE email = v_email;
            RETURN v_role;
        ELSE
            -- Se não existe cadastro, cria como barbeiro básico
            INSERT INTO public.user_roles (user_id, email, role) 
            VALUES (auth.uid(), v_email, 'barber')
            ON CONFLICT (email) DO UPDATE SET user_id = auth.uid();
            RETURN 'barber';
        END IF;
    END IF;

    RETURN 'none';
END;
$$;

-- 5. REATIVAR RLS COM REGRAS SIMPLES
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ur_select" ON public.user_roles FOR SELECT USING (auth.uid() = user_id OR public.check_is_admin());
CREATE POLICY "ur_admin" ON public.user_roles FOR ALL USING (public.check_is_admin());

-- Regras para tabelas públicas (Leitura Livre, Escrita Admin)
DO $$ 
DECLARE
    tab TEXT;
    tabs TEXT[] := ARRAY['services', 'artists', 'plans', 'promotions', 'settings', 'gallery', 'product_categories', 'products'];
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
CREATE POLICY "app_own" ON public.appointments FOR SELECT USING (artist_id = public.get_my_artist_id());

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cust_all" ON public.customers FOR ALL USING (public.check_is_admin());

-- 6. TRIGGER DE SEGURANÇA (Fallback)
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_roles (user_id, email, role)
    VALUES (NEW.id, NEW.email, 'barber')
    ON CONFLICT (email) DO UPDATE SET user_id = EXCLUDED.user_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_role();

-- 7. DADOS E RECUPERAÇÃO DE ADMIN
-- RESTAURA SEU ACESSO AQUI:
INSERT INTO public.user_roles (email, role)
VALUES ('lucasgregolin0@gmail.com', 'admin')
ON CONFLICT (email) DO UPDATE SET role = 'admin';

-- Seed de serviços básicos
INSERT INTO public.services (name, duration_mins, price, is_featured) 
VALUES ('Corte', 30, 40, true), ('Barba', 30, 30, true) ON CONFLICT DO NOTHING;
