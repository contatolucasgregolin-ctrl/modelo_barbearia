-- ============================================================
-- 🔐 SEGURANÇA E PERFORMANCE v5.1 (EXCLUSIVO)
-- Implementa PIN para barbeiros e Índices de Performance.
-- ============================================================

-- 1. ADICIONAR COLUNA PARA PIN/SENHA
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS access_pin TEXT;

-- 2. ATUALIZAR RPC PARA INCLUIR PIN NO CADASTRO
CREATE OR REPLACE FUNCTION public.pre_authorize_user(p_email TEXT, p_role TEXT, p_pin TEXT DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    -- Só permite que Admins chamem esta função
    IF NOT public.check_is_admin() THEN
        RAISE EXCEPTION 'Acesso negado: Somente administradores podem autorizar novos usuários.';
    END IF;

    INSERT INTO public.user_roles (email, role, access_pin)
    VALUES (LOWER(TRIM(p_email)), p_role, p_pin)
    ON CONFLICT (email) DO UPDATE SET 
        role = EXCLUDED.role,
        access_pin = EXCLUDED.access_pin;
END;
$$;

-- 3. ÍNDICES DE PERFORMANCE (TURBO QUERIES)
-- Agiliza a busca de agendamentos por data (Dashboard e Agenda)
CREATE INDEX IF NOT EXISTS idx_appointments_date_status ON public.appointments(date, status);
CREATE INDEX IF NOT EXISTS idx_appointments_artist_id ON public.appointments(artist_id);

-- Agiliza o financeiro
CREATE INDEX IF NOT EXISTS idx_finances_date_type ON public.finances(date, type);

-- Agiliza a verificação de e-mail no login
CREATE INDEX IF NOT EXISTS idx_user_roles_email_pin ON public.user_roles(email, access_pin);

-- 4. FUNÇÃO DE LOGIN VIA PIN (OPCIONAL/SUPORTE)
CREATE OR REPLACE FUNCTION public.verify_barber_pin(p_email TEXT, p_pin TEXT)
RETURNS TABLE (authorized BOOLEAN, user_role TEXT) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE email = LOWER(TRIM(p_email)) 
        AND access_pin = p_pin
    ), (
        SELECT role FROM public.user_roles 
        WHERE email = LOWER(TRIM(p_email)) 
        AND access_pin = p_pin
    );
END;
$$;
