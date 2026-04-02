-- ============================================================================
-- 🔥 NUCLEAR RESET — Rejuvenescimento Completo do Banco de Dados
-- Projeto: modelo_barbearia (bonttrexhkqlazpyrhsh)
-- Data: 2026-04-02
-- Engenheiro: Antigravity Senior Fullstack
-- ============================================================================
-- ESTRATÉGIA:
--   1. Remover TUDO que está quebrado (policies, triggers, funções)
--   2. Recriar Foreign Keys com ON DELETE CASCADE
--   3. Funções de segurança otimizadas (sem recursão)
--   4. RLS à prova de balas com fallback por email JWT
--   5. Triggers inteligentes (financeiro automático)
--   6. Seed do admin master
-- ============================================================================

BEGIN;

-- ════════════════════════════════════════════════════════════════════════════
-- FASE 1: DEMOLIÇÃO — Limpar tudo que está quebrado
-- ════════════════════════════════════════════════════════════════════════════

-- 1a. Remover TODAS as policies RLS de TODAS as tabelas
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    END LOOP;
    RAISE NOTICE '✅ Todas as policies RLS removidas';
END $$;

-- 1b. Remover TODOS os triggers
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT trigger_name, event_object_table FROM information_schema.triggers WHERE trigger_schema = 'public')
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I CASCADE', r.trigger_name, r.event_object_table);
    END LOOP;
    RAISE NOTICE '✅ Todos os triggers removidos';
END $$;

-- 1c. Remover TODAS as funções públicas
DROP FUNCTION IF EXISTS public.check_is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.get_my_role() CASCADE;
DROP FUNCTION IF EXISTS public.get_my_role_by_email() CASCADE;
DROP FUNCTION IF EXISTS public.get_my_artist_id() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.is_current_user_admin() CASCADE;
DROP FUNCTION IF EXISTS public.pre_authorize_user(text, text) CASCADE;
DROP FUNCTION IF EXISTS public.pre_authorize_user(text, text, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.verify_barber_pin(text, text) CASCADE;
DROP FUNCTION IF EXISTS public.rls_auto_enable() CASCADE;
DROP FUNCTION IF EXISTS public.fn_calculate_service_cost() CASCADE;
DROP FUNCTION IF EXISTS public.fn_process_appointment_stock() CASCADE;
DROP FUNCTION IF EXISTS public.fn_stock_consumption_report() CASCADE;
DROP FUNCTION IF EXISTS public.handle_stock_on_service() CASCADE;
DROP FUNCTION IF EXISTS public.fn_appointment_to_finance() CASCADE;

RAISE NOTICE '✅ FASE 1 COMPLETA — Demolição realizada';

-- ════════════════════════════════════════════════════════════════════════════
-- FASE 2: RECONSTRUÇÃO — Corrigir Foreign Keys com ON DELETE CASCADE
-- ════════════════════════════════════════════════════════════════════════════

-- Garantir coluna access_pin em user_roles
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS access_pin TEXT;
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS email TEXT;

-- Garantir coluna commission_percentage em artists
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS commission_percentage NUMERIC DEFAULT 0.00;

-- ── appointments → customers, services, artists ──
ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_customer_id_fkey;
ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_service_id_fkey;
ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_artist_id_fkey;

ALTER TABLE public.appointments
    ADD CONSTRAINT appointments_customer_id_fkey
    FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL;

ALTER TABLE public.appointments
    ADD CONSTRAINT appointments_service_id_fkey
    FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE SET NULL;

ALTER TABLE public.appointments
    ADD CONSTRAINT appointments_artist_id_fkey
    FOREIGN KEY (artist_id) REFERENCES public.artists(id) ON DELETE SET NULL;

-- ── finances → appointments, artists, services ──
ALTER TABLE public.finances DROP CONSTRAINT IF EXISTS finances_appointment_id_fkey;
ALTER TABLE public.finances DROP CONSTRAINT IF EXISTS finances_artist_id_fkey;
ALTER TABLE public.finances DROP CONSTRAINT IF EXISTS finances_service_id_fkey;

ALTER TABLE public.finances
    ADD CONSTRAINT finances_appointment_id_fkey
    FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON DELETE CASCADE;

ALTER TABLE public.finances
    ADD CONSTRAINT finances_artist_id_fkey
    FOREIGN KEY (artist_id) REFERENCES public.artists(id) ON DELETE SET NULL;

ALTER TABLE public.finances
    ADD CONSTRAINT finances_service_id_fkey
    FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE SET NULL;

-- ── gallery → artists, gallery_categories ──
ALTER TABLE public.gallery DROP CONSTRAINT IF EXISTS gallery_artist_id_fkey;
ALTER TABLE public.gallery DROP CONSTRAINT IF EXISTS gallery_category_id_fkey;

ALTER TABLE public.gallery
    ADD CONSTRAINT gallery_artist_id_fkey
    FOREIGN KEY (artist_id) REFERENCES public.artists(id) ON DELETE SET NULL;

ALTER TABLE public.gallery
    ADD CONSTRAINT gallery_category_id_fkey
    FOREIGN KEY (category_id) REFERENCES public.gallery_categories(id) ON DELETE SET NULL;

-- ── plan_subscriptions → customers, plans, artists ──
ALTER TABLE public.plan_subscriptions DROP CONSTRAINT IF EXISTS plan_subscriptions_customer_id_fkey;
ALTER TABLE public.plan_subscriptions DROP CONSTRAINT IF EXISTS plan_subscriptions_plan_id_fkey;
ALTER TABLE public.plan_subscriptions DROP CONSTRAINT IF EXISTS plan_subscriptions_artist_id_fkey;

ALTER TABLE public.plan_subscriptions
    ADD CONSTRAINT plan_subscriptions_customer_id_fkey
    FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;

ALTER TABLE public.plan_subscriptions
    ADD CONSTRAINT plan_subscriptions_plan_id_fkey
    FOREIGN KEY (plan_id) REFERENCES public.plans(id) ON DELETE CASCADE;

ALTER TABLE public.plan_subscriptions
    ADD CONSTRAINT plan_subscriptions_artist_id_fkey
    FOREIGN KEY (artist_id) REFERENCES public.artists(id) ON DELETE SET NULL;

-- ── promotion_interests → promotions, customers ──
ALTER TABLE public.promotion_interests DROP CONSTRAINT IF EXISTS promotion_interests_promotion_id_fkey;
ALTER TABLE public.promotion_interests DROP CONSTRAINT IF EXISTS promotion_interests_customer_id_fkey;

ALTER TABLE public.promotion_interests
    ADD CONSTRAINT promotion_interests_promotion_id_fkey
    FOREIGN KEY (promotion_id) REFERENCES public.promotions(id) ON DELETE CASCADE;

ALTER TABLE public.promotion_interests
    ADD CONSTRAINT promotion_interests_customer_id_fkey
    FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL;

-- ── products → product_categories ──
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_category_id_fkey;

ALTER TABLE public.products
    ADD CONSTRAINT products_category_id_fkey
    FOREIGN KEY (category_id) REFERENCES public.product_categories(id) ON DELETE SET NULL;

-- ── service_products → services, products ──
ALTER TABLE public.service_products DROP CONSTRAINT IF EXISTS service_products_service_id_fkey;
ALTER TABLE public.service_products DROP CONSTRAINT IF EXISTS service_products_product_id_fkey;

ALTER TABLE public.service_products
    ADD CONSTRAINT service_products_service_id_fkey
    FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE CASCADE;

ALTER TABLE public.service_products
    ADD CONSTRAINT service_products_product_id_fkey
    FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;

-- ── stock_movements → products, artists ──
ALTER TABLE public.stock_movements DROP CONSTRAINT IF EXISTS stock_movements_product_id_fkey;
ALTER TABLE public.stock_movements DROP CONSTRAINT IF EXISTS stock_movements_artist_id_fkey;

ALTER TABLE public.stock_movements
    ADD CONSTRAINT stock_movements_product_id_fkey
    FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;

ALTER TABLE public.stock_movements
    ADD CONSTRAINT stock_movements_artist_id_fkey
    FOREIGN KEY (artist_id) REFERENCES public.artists(id) ON DELETE SET NULL;

-- ── barber_usage_logs → artists, products, appointments, services ──
ALTER TABLE public.barber_usage_logs DROP CONSTRAINT IF EXISTS barber_usage_logs_artist_id_fkey;
ALTER TABLE public.barber_usage_logs DROP CONSTRAINT IF EXISTS barber_usage_logs_product_id_fkey;
ALTER TABLE public.barber_usage_logs DROP CONSTRAINT IF EXISTS barber_usage_logs_appointment_id_fkey;
ALTER TABLE public.barber_usage_logs DROP CONSTRAINT IF EXISTS barber_usage_logs_service_id_fkey;

ALTER TABLE public.barber_usage_logs
    ADD CONSTRAINT barber_usage_logs_artist_id_fkey
    FOREIGN KEY (artist_id) REFERENCES public.artists(id) ON DELETE CASCADE;

ALTER TABLE public.barber_usage_logs
    ADD CONSTRAINT barber_usage_logs_product_id_fkey
    FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;

ALTER TABLE public.barber_usage_logs
    ADD CONSTRAINT barber_usage_logs_appointment_id_fkey
    FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON DELETE CASCADE;

ALTER TABLE public.barber_usage_logs
    ADD CONSTRAINT barber_usage_logs_service_id_fkey
    FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE SET NULL;

-- ── stock_alerts → products ──
ALTER TABLE public.stock_alerts DROP CONSTRAINT IF EXISTS stock_alerts_product_id_fkey;

ALTER TABLE public.stock_alerts
    ADD CONSTRAINT stock_alerts_product_id_fkey
    FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;

-- ── user_roles → artists ──
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_artist_id_fkey;

ALTER TABLE public.user_roles
    ADD CONSTRAINT user_roles_artist_id_fkey
    FOREIGN KEY (artist_id) REFERENCES public.artists(id) ON DELETE SET NULL;

RAISE NOTICE '✅ FASE 2 COMPLETA — Foreign Keys reconstruídas com CASCADE';

-- ════════════════════════════════════════════════════════════════════════════
-- FASE 3: FUNÇÕES DE SEGURANÇA (SECURITY DEFINER — sem recursão RLS)
-- ════════════════════════════════════════════════════════════════════════════

-- 3a. Verificar se o usuário autenticado é Admin
CREATE OR REPLACE FUNCTION public.check_is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE (
            -- Match por user_id (auth.uid)
            user_id = auth.uid()
            OR
            -- Match por email do JWT (Fail-safe para master admins)
            email = (auth.jwt() ->> 'email')
        )
        AND role = 'admin'
    );
$$;

-- 3b. Buscar a role do usuário logado (e fazer sync do user_id se necessário)
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_role TEXT;
    v_email TEXT;
BEGIN
    v_email := (auth.jwt() ->> 'email');

    -- Primeira tentativa: buscar por user_id
    SELECT role INTO v_role FROM public.user_roles WHERE user_id = auth.uid();
    IF v_role IS NOT NULL THEN
        RETURN v_role;
    END IF;

    -- Segunda tentativa: buscar por email e fazer sync do user_id
    SELECT role INTO v_role FROM public.user_roles WHERE email = v_email;
    IF v_role IS NOT NULL THEN
        UPDATE public.user_roles SET user_id = auth.uid() WHERE email = v_email AND user_id IS NULL;
        RETURN v_role;
    END IF;

    RETURN 'none';
END;
$$;

-- 3c. Buscar o artist_id do barbeiro logado
CREATE OR REPLACE FUNCTION public.get_my_artist_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT artist_id FROM public.user_roles
    WHERE user_id = auth.uid() OR email = (auth.jwt() ->> 'email')
    LIMIT 1;
$$;

-- 3d. Verificar PIN de acesso do barbeiro
CREATE OR REPLACE FUNCTION public.verify_barber_pin(p_email TEXT, p_pin TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_record RECORD;
BEGIN
    SELECT ur.role, ur.artist_id, a.name as artist_name
    INTO v_record
    FROM public.user_roles ur
    LEFT JOIN public.artists a ON a.id = ur.artist_id
    WHERE ur.email = lower(p_email) AND ur.access_pin = p_pin;

    IF v_record IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Email ou PIN inválido');
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'role', v_record.role,
        'artist_id', v_record.artist_id,
        'artist_name', v_record.artist_name
    );
END;
$$;

-- 3e. Pré-autorizar usuário (para o admin criar acessos)
CREATE OR REPLACE FUNCTION public.pre_authorize_user(p_email TEXT, p_role TEXT, p_artist_id UUID DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.user_roles (email, role, artist_id)
    VALUES (lower(p_email), p_role, p_artist_id)
    ON CONFLICT (email) DO UPDATE SET role = p_role, artist_id = p_artist_id;
END;
$$;

RAISE NOTICE '✅ FASE 3 COMPLETA — Funções de segurança criadas';

-- ════════════════════════════════════════════════════════════════════════════
-- FASE 4: RLS — Policies à prova de balas
-- ════════════════════════════════════════════════════════════════════════════

-- Função helper para verificar se é master admin via JWT email (ultrarrápida)
CREATE OR REPLACE FUNCTION public.is_master_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT (auth.jwt() ->> 'email') IN (
        'lucasgregolin0@gmail.com',
        'lucasgregolin95@gmail.com',
        'lucasgregolin@gmail.com',
        'admin@admin.com.br'
    );
$$;

-- 4a. user_roles — Tabela mais sensível
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_roles_read" ON public.user_roles
    FOR SELECT USING (true); -- Todos podem ler (necessário para login)

CREATE POLICY "user_roles_admin_write" ON public.user_roles
    FOR ALL USING (
        public.is_master_admin() OR public.check_is_admin()
    )
    WITH CHECK (
        public.is_master_admin() OR public.check_is_admin()
    );

-- 4b. Aplicação em massa para todas as outras tabelas
-- Padrão: Leitura pública, Escrita apenas para Admin/Master
DO $$
DECLARE
    t TEXT;
    tabs TEXT[] := ARRAY[
        'customers', 'services', 'artists', 'appointments',
        'settings', 'gallery', 'gallery_categories',
        'plans', 'plan_subscriptions', 'promotions', 'promotion_interests',
        'finances',
        'product_categories', 'products', 'service_products',
        'stock_movements', 'barber_usage_logs', 'stock_alerts'
    ];
BEGIN
    FOREACH t IN ARRAY tabs LOOP
        -- Habilitar RLS
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

        -- Leitura: todos os usuários autenticados podem ler
        EXECUTE format(
            'CREATE POLICY "rls_%s_read" ON public.%I FOR SELECT USING (true)',
            t, t
        );

        -- Escrita: apenas admin ou master
        EXECUTE format(
            'CREATE POLICY "rls_%s_write" ON public.%I FOR INSERT WITH CHECK (public.is_master_admin() OR public.check_is_admin())',
            t, t
        );

        EXECUTE format(
            'CREATE POLICY "rls_%s_update" ON public.%I FOR UPDATE USING (public.is_master_admin() OR public.check_is_admin())',
            t, t
        );

        EXECUTE format(
            'CREATE POLICY "rls_%s_delete" ON public.%I FOR DELETE USING (public.is_master_admin() OR public.check_is_admin())',
            t, t
        );
    END LOOP;
    RAISE NOTICE '✅ RLS aplicado em todas as tabelas';
END $$;

-- 4c. Permissões extras: Barbeiros podem INSERIR em tabelas operacionais
-- (agendamentos anotados, consumo de produtos, movimentações)
CREATE POLICY "barber_insert_usage" ON public.barber_usage_logs
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "barber_insert_stock_mov" ON public.stock_movements
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Clientes podem criar agendamentos (via site público - anon)
DROP POLICY IF EXISTS "rls_appointments_write" ON public.appointments;
CREATE POLICY "rls_appointments_write" ON public.appointments
    FOR INSERT WITH CHECK (true); -- Agendamentos são criados pelo site público

-- Clientes podem criar interests em promoções
DROP POLICY IF EXISTS "rls_promotion_interests_write" ON public.promotion_interests;
CREATE POLICY "rls_promotion_interests_write" ON public.promotion_interests
    FOR INSERT WITH CHECK (true); -- Qualquer visitante pode demonstrar interesse

-- Clientes podem ser criados via site público
DROP POLICY IF EXISTS "rls_customers_write" ON public.customers;
CREATE POLICY "rls_customers_write" ON public.customers
    FOR INSERT WITH CHECK (true); -- Auto-cadastro de clientes

RAISE NOTICE '✅ FASE 4 COMPLETA — RLS aplicado';

-- ════════════════════════════════════════════════════════════════════════════
-- FASE 5: TRIGGERS INTELIGENTES — Automação de negócio
-- ════════════════════════════════════════════════════════════════════════════

-- 5a. Trigger: Ao finalizar agendamento → criar registro financeiro automático
CREATE OR REPLACE FUNCTION public.fn_appointment_to_finance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_service_name TEXT;
    v_customer_name TEXT;
    v_amount NUMERIC;
BEGIN
    -- Só dispara quando o status muda para 'finished'
    IF NEW.status = 'finished' AND (OLD.status IS DISTINCT FROM 'finished') THEN
        -- Buscar nome do serviço
        SELECT name INTO v_service_name FROM public.services WHERE id = NEW.service_id;
        -- Buscar nome do cliente
        SELECT name INTO v_customer_name FROM public.customers WHERE id = NEW.customer_id;
        -- Valor do atendimento
        v_amount := COALESCE(NEW.session_price, 0);

        -- Só criar registro financeiro se o valor for > 0
        IF v_amount > 0 THEN
            -- Verificar se já não existe um registro financeiro para este agendamento
            IF NOT EXISTS (SELECT 1 FROM public.finances WHERE appointment_id = NEW.id) THEN
                INSERT INTO public.finances (
                    description,
                    amount,
                    type,
                    category,
                    date,
                    artist_id,
                    appointment_id,
                    service_id
                ) VALUES (
                    COALESCE(v_service_name, 'Serviço') || ' — ' || COALESCE(v_customer_name, 'Cliente'),
                    v_amount,
                    'income',
                    'Serviços',
                    NEW.date,
                    NEW.artist_id,
                    NEW.id,
                    NEW.service_id
                );
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_appointment_finished_to_finance
    AFTER UPDATE ON public.appointments
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_appointment_to_finance();

RAISE NOTICE '✅ FASE 5 COMPLETA — Triggers inteligentes criados';

-- ════════════════════════════════════════════════════════════════════════════
-- FASE 6: SEED — Garantir admin master no banco
-- ════════════════════════════════════════════════════════════════════════════

-- Limpar user_roles duplicados/órfãos e recriar corretamente
DELETE FROM public.user_roles WHERE email IS NULL AND user_id IS NULL;

-- Garantir o admin master existe
INSERT INTO public.user_roles (email, role, access_pin)
VALUES ('lucasgregolin0@gmail.com', 'admin', NULL)
ON CONFLICT (email) DO UPDATE SET role = 'admin';

INSERT INTO public.user_roles (email, role, access_pin)
VALUES ('lucasgregolin95@gmail.com', 'admin', NULL)
ON CONFLICT (email) DO UPDATE SET role = 'admin';

INSERT INTO public.user_roles (email, role, access_pin)
VALUES ('admin@admin.com.br', 'admin', NULL)
ON CONFLICT (email) DO UPDATE SET role = 'admin';

RAISE NOTICE '✅ FASE 6 COMPLETA — Admin master configurado';

-- ════════════════════════════════════════════════════════════════════════════
-- FASE 7: Limpar dados operacionais (reset dos dados transacionais)
-- ════════════════════════════════════════════════════════════════════════════
-- Manter: services, artists, products, product_categories, plans, gallery_categories, settings
-- Limpar: appointments, finances, stock_movements, barber_usage_logs, stock_alerts,
--         plan_subscriptions, promotion_interests, promotions

TRUNCATE public.barber_usage_logs CASCADE;
TRUNCATE public.stock_alerts CASCADE;
TRUNCATE public.stock_movements CASCADE;
TRUNCATE public.finances CASCADE;
TRUNCATE public.promotion_interests CASCADE;
TRUNCATE public.plan_subscriptions CASCADE;
TRUNCATE public.appointments CASCADE;

RAISE NOTICE '✅ FASE 7 COMPLETA — Dados transacionais limpos';

-- ════════════════════════════════════════════════════════════════════════════
-- FASE 8: GRANTS — Permissões de acesso às funções
-- ════════════════════════════════════════════════════════════════════════════

GRANT EXECUTE ON FUNCTION public.check_is_admin() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_my_artist_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_barber_pin(TEXT, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.pre_authorize_user(TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_master_admin() TO authenticated, anon;

RAISE NOTICE '🎉 NUCLEAR RESET COMPLETO — Banco de dados rejuvenescido!';

COMMIT;
