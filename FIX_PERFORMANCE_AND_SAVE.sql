-- ============================================================
-- ⚡ PERFORMANCE & ACCESS RECOVERY v4.0 (FINAL)
-- Resolve Lentidão, Erro de Salvamento e Bloqueio de RLS.
-- ============================================================

-- 1. RPC PARA SALVAMENTO SEGURO (Ignora RLS ao criar usuários)
CREATE OR REPLACE FUNCTION public.pre_authorize_user(p_email TEXT, p_role TEXT)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    -- Só permite que Admins chamem esta função (segurança extra)
    IF NOT public.check_is_admin() THEN
        RAISE EXCEPTION 'Acesso negado: Somente administradores podem autorizar novos usuários.';
    END IF;

    INSERT INTO public.user_roles (email, role)
    VALUES (LOWER(TRIM(p_email)), p_role)
    ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role;
END;
$$;

-- 2. OTIMIZAÇÃO DE RLS (Remover subconsultas lentas)
-- Recriar check_is_admin de forma mais performática
CREATE OR REPLACE FUNCTION public.check_is_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin');
$$;

-- Recriar políticas de tabelas críticas para serem rápidas
DO $$ 
DECLARE
    r RECORD;
    tabs TEXT[] := ARRAY['services', 'artists', 'plans', 'promotions', 'settings', 'gallery', 'product_categories', 'products', 'finances', 'appointments', 'customers'];
    t TEXT;
BEGIN
    -- Limpar políticas antigas antes
    FOREACH t IN ARRAY tabs LOOP
        FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t) LOOP
            EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.' || quote_ident(t);
        END LOOP;
        
        -- Criar novas políticas OTIMIZADAS
        EXECUTE 'CREATE POLICY "p_read_' || t || '" ON public.' || quote_ident(t) || ' FOR SELECT USING (true)';
        EXECUTE 'CREATE POLICY "p_all_' || t || '" ON public.' || quote_ident(t) || ' FOR ALL USING (public.check_is_admin())';
    END LOOP;
END $$;

-- 3. AJUSTE DE INDEXAÇÃO (Acelera o login e consultas de cargo)
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_email ON public.user_roles(email);

-- 4. GARANTIR ACESSO DO DONO (Backup Final)
INSERT INTO public.user_roles (email, role)
VALUES ('lucasgregolin0@gmail.com', 'admin')
ON CONFLICT (email) DO UPDATE SET role = 'admin';
