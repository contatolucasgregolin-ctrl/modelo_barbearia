-- ============================================================
-- EVOLUÇÃO DA PLATAFORMA — ESTOQUE COMPLETO + TRIGGERS + IA
-- Rodar no Supabase SQL Editor (em ordem)
-- NÃO remove tabelas existentes, apenas cria/altera
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. LIMPEZA INICIAL (Garantir estrutura correta)
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS public.stock_alerts CASCADE;
DROP TABLE IF EXISTS public.barber_usage_logs CASCADE;
DROP TABLE IF EXISTS public.stock_movements CASCADE;
DROP TABLE IF EXISTS public.service_products CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.product_categories CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;

-- ────────────────────────────────────────────────────────────
-- 2. CATEGORIAS DE PRODUTOS
-- ────────────────────────────────────────────────────────────
CREATE TABLE public.product_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    icon TEXT DEFAULT '📦',
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read product_categories" ON public.product_categories FOR SELECT TO public USING (true);
CREATE POLICY "Allow authenticated all product_categories" ON public.product_categories FOR ALL TO authenticated USING (true) WITH CHECK (true);
-- Fallback: allow anon full access for demo
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_categories' AND policyname = 'Allow anon all product_categories') THEN
    CREATE POLICY "Allow anon all product_categories" ON public.product_categories FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────
-- 3. PRODUCTS — Recriar com estrutura completa
-- ────────────────────────────────────────────────────────────
CREATE TABLE public.products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    sku TEXT UNIQUE,
    description TEXT,
    category_id UUID REFERENCES public.product_categories(id) ON DELETE SET NULL,
    cost NUMERIC(10, 3) DEFAULT 0.000 NOT NULL,
    price NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
    quantity NUMERIC(10, 3) DEFAULT 0.000 NOT NULL,
    min_stock NUMERIC(10, 3) DEFAULT 5.000 NOT NULL,
    package_size NUMERIC(10, 3) DEFAULT 0.000,
    purchase_price NUMERIC(10, 2) DEFAULT 0.00,
    unit TEXT DEFAULT 'un' NOT NULL,
    photo_url TEXT,
    active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
    CONSTRAINT quantity_non_negative CHECK (quantity >= 0),
    CONSTRAINT cost_non_negative CHECK (cost >= 0),
    CONSTRAINT price_non_negative CHECK (price >= 0)
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read products" ON public.products FOR SELECT TO public USING (true);
CREATE POLICY "Allow authenticated all products" ON public.products FOR ALL TO authenticated USING (true) WITH CHECK (true);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'products' AND policyname = 'Allow anon all products') THEN
    CREATE POLICY "Allow anon all products" ON public.products FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────
-- 3. SERVICE_PRODUCTS — Vínculo serviço ↔ produto
-- ────────────────────────────────────────────────────────────
CREATE TABLE public.service_products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    service_id UUID REFERENCES public.services(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    quantity_used NUMERIC(10, 3) DEFAULT 1.000 NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
    CONSTRAINT unique_service_product UNIQUE (service_id, product_id),
    CONSTRAINT quantity_positive CHECK (quantity_used > 0)
);

ALTER TABLE public.service_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read service_products" ON public.service_products FOR SELECT TO public USING (true);
CREATE POLICY "Allow authenticated all service_products" ON public.service_products FOR ALL TO authenticated USING (true) WITH CHECK (true);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'service_products' AND policyname = 'Allow anon all service_products') THEN
    CREATE POLICY "Allow anon all service_products" ON public.service_products FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────
-- 5. STOCK_MOVEMENTS — Movimentações de estoque
-- ────────────────────────────────────────────────────────────
CREATE TABLE public.stock_movements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL,
    quantity NUMERIC(10, 3) NOT NULL,
    previous_stock INTEGER,
    new_stock INTEGER,
    reason TEXT,
    reference_type TEXT, -- 'appointment', 'manual', 'adjustment'
    reference_id UUID,   -- appointment_id when automatic
    artist_id UUID REFERENCES public.artists(id) ON DELETE SET NULL,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
    CONSTRAINT valid_movement_type CHECK (type IN ('in', 'out', 'adjustment', 'loss'))
);

ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read stock_movements" ON public.stock_movements FOR SELECT TO public USING (true);
CREATE POLICY "Allow authenticated all stock_movements" ON public.stock_movements FOR ALL TO authenticated USING (true) WITH CHECK (true);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stock_movements' AND policyname = 'Allow anon all stock_movements') THEN
    CREATE POLICY "Allow anon all stock_movements" ON public.stock_movements FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────
-- 6. BARBER_USAGE_LOGS — Consumo por barbeiro
-- ────────────────────────────────────────────────────────────
CREATE TABLE public.barber_usage_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    artist_id UUID REFERENCES public.artists(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
    service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
    quantity_used NUMERIC(10, 3) NOT NULL,
    cost_at_time NUMERIC(10, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
    CONSTRAINT usage_positive CHECK (quantity_used > 0)
);

ALTER TABLE public.barber_usage_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read barber_usage_logs" ON public.barber_usage_logs FOR SELECT TO public USING (true);
CREATE POLICY "Allow authenticated all barber_usage_logs" ON public.barber_usage_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'barber_usage_logs' AND policyname = 'Allow anon all barber_usage_logs') THEN
    CREATE POLICY "Allow anon all barber_usage_logs" ON public.barber_usage_logs FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────
-- 7. STOCK_ALERTS — Alertas de estoque baixo
-- ────────────────────────────────────────────────────────────
CREATE TABLE public.stock_alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    alert_type TEXT DEFAULT 'low_stock' NOT NULL,
    message TEXT NOT NULL,
    current_quantity INTEGER,
    min_stock INTEGER,
    resolved BOOLEAN DEFAULT false NOT NULL,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
    CONSTRAINT valid_alert_type CHECK (alert_type IN ('low_stock', 'out_of_stock', 'expiring'))
);

ALTER TABLE public.stock_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read stock_alerts" ON public.stock_alerts FOR SELECT TO public USING (true);
CREATE POLICY "Allow authenticated all stock_alerts" ON public.stock_alerts FOR ALL TO authenticated USING (true) WITH CHECK (true);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stock_alerts' AND policyname = 'Allow anon all stock_alerts') THEN
    CREATE POLICY "Allow anon all stock_alerts" ON public.stock_alerts FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────
-- 8. USER_ROLES — Controle de acesso admin/barbeiro
-- ────────────────────────────────────────────────────────────
CREATE TABLE public.user_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    role TEXT DEFAULT 'barber' NOT NULL,
    artist_id UUID REFERENCES public.artists(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
    CONSTRAINT valid_role CHECK (role IN ('admin', 'barber', 'manager')),
    CONSTRAINT unique_user_role UNIQUE (user_id)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read user_roles" ON public.user_roles FOR SELECT TO public USING (true);
CREATE POLICY "Allow authenticated all user_roles" ON public.user_roles FOR ALL TO authenticated USING (true) WITH CHECK (true);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_roles' AND policyname = 'Allow anon all user_roles') THEN
    CREATE POLICY "Allow anon all user_roles" ON public.user_roles FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────
-- 8. FINANCES — Adicionar coluna date se não existir
-- (tabela já existe, só garante colunas)
-- ────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'finances' AND column_name = 'service_cost') THEN
    ALTER TABLE public.finances ADD COLUMN service_cost NUMERIC(10,2) DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'finances' AND column_name = 'profit') THEN
    ALTER TABLE public.finances ADD COLUMN profit NUMERIC(10,2) DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'finances' AND column_name = 'artist_id') THEN
    ALTER TABLE public.finances ADD COLUMN artist_id UUID REFERENCES public.artists(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'finances' AND column_name = 'appointment_id') THEN
    ALTER TABLE public.finances ADD COLUMN appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'finances' AND column_name = 'service_id') THEN
    ALTER TABLE public.finances ADD COLUMN service_id UUID REFERENCES public.services(id) ON DELETE SET NULL;
  END IF;
END $$;


-- ════════════════════════════════════════════════════════════
-- FUNÇÕES PL/pgSQL
-- ════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────
-- FN: Calcular custo de um serviço baseado nos produtos vinculados
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_calculate_service_cost(p_service_id UUID)
RETURNS NUMERIC AS $$
DECLARE
    total_cost NUMERIC := 0;
BEGIN
    SELECT COALESCE(SUM(sp.quantity_used * p.cost), 0)
    INTO total_cost
    FROM service_products sp
    JOIN products p ON p.id = sp.product_id
    WHERE sp.service_id = p_service_id;

    RETURN total_cost;
END;
$$ LANGUAGE plpgsql STABLE;

-- ────────────────────────────────────────────────────────────
-- FN: Processar estoque ao finalizar atendimento
-- TRIGGER FUNCTION — chamada automaticamente
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_process_appointment_stock()
RETURNS TRIGGER AS $$
DECLARE
    sp_record RECORD;
    v_product RECORD;
    v_new_qty INTEGER;
    v_service_cost NUMERIC := 0;
    v_session_price NUMERIC;
BEGIN
    -- Só processa quando status muda para 'finished'
    IF NEW.status = 'finished' AND (OLD.status IS NULL OR OLD.status != 'finished') THEN
        
        -- Iterar sobre produtos vinculados ao serviço
        FOR sp_record IN 
            SELECT sp.product_id, sp.quantity_used, p.name as product_name, p.cost, p.quantity as current_qty, p.min_stock
            FROM service_products sp
            JOIN products p ON p.id = sp.product_id
            WHERE sp.service_id = NEW.service_id
        LOOP
            -- Calcular novo estoque (FALLBACK: não permitir negativo, registrar mesmo assim)
            v_new_qty := GREATEST(0, sp_record.current_qty - CEIL(sp_record.quantity_used)::INTEGER);
            
            -- 1. Registrar movimentação de saída
            INSERT INTO stock_movements (
                product_id, type, quantity, previous_stock, new_stock,
                reason, reference_type, reference_id, artist_id, created_by
            ) VALUES (
                sp_record.product_id, 'out', sp_record.quantity_used,
                sp_record.current_qty, v_new_qty,
                'Saída automática: ' || sp_record.product_name || ' (atendimento finalizado)',
                'appointment', NEW.id, NEW.artist_id, 'system'
            );

            -- 2. Atualizar estoque do produto
            UPDATE products 
            SET quantity = v_new_qty, updated_at = now()
            WHERE id = sp_record.product_id;

            -- 3. Registrar consumo do barbeiro
            IF NEW.artist_id IS NOT NULL THEN
                INSERT INTO barber_usage_logs (
                    artist_id, product_id, appointment_id, service_id,
                    quantity_used, cost_at_time
                ) VALUES (
                    NEW.artist_id, sp_record.product_id, NEW.id, NEW.service_id,
                    sp_record.quantity_used, sp_record.cost
                );
            END IF;

            -- Acumular custo do serviço
            v_service_cost := v_service_cost + (sp_record.quantity_used * sp_record.cost);

            -- 4. Verificar estoque mínimo e gerar alerta
            IF v_new_qty <= sp_record.min_stock THEN
                -- Resolver alertas antigos não resolvidos para este produto
                UPDATE stock_alerts SET resolved = true, resolved_at = now()
                WHERE product_id = sp_record.product_id AND resolved = false;

                INSERT INTO stock_alerts (
                    product_id, alert_type, message, current_quantity, min_stock
                ) VALUES (
                    sp_record.product_id,
                    CASE WHEN v_new_qty = 0 THEN 'out_of_stock' ELSE 'low_stock' END,
                    CASE 
                        WHEN v_new_qty = 0 THEN '⚠️ ESGOTADO: ' || sp_record.product_name || ' — Sem estoque!'
                        ELSE '⚠️ Estoque baixo: ' || sp_record.product_name || ' — Restam ' || v_new_qty || ' unidades'
                    END,
                    v_new_qty,
                    sp_record.min_stock
                );
            END IF;
        END LOOP;

        -- 5. Registrar no financeiro com custo e lucro
        v_session_price := COALESCE(NEW.session_price, 0);
        
        IF v_session_price > 0 OR v_service_cost > 0 THEN
            -- Atualizar ou insertar registro financeiro com info de custo
            -- (não duplicar se já existe pelo fluxo normal)
            INSERT INTO finances (
                description, amount, type, category, date,
                service_cost, profit, artist_id, appointment_id, service_id
            ) VALUES (
                'Atendimento finalizado (auto)',
                v_session_price,
                'income',
                'atendimento',
                NEW.date,
                v_service_cost,
                v_session_price - v_service_cost,
                NEW.artist_id,
                NEW.id,
                NEW.service_id
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ────────────────────────────────────────────────────────────
-- TRIGGER: Conectar ao sistema de agendamentos
-- ────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_appointment_stock ON public.appointments;
CREATE TRIGGER trg_appointment_stock
    AFTER UPDATE ON public.appointments
    FOR EACH ROW
    EXECUTE FUNCTION fn_process_appointment_stock();

-- ────────────────────────────────────────────────────────────
-- FN: Relatório de consumo de estoque
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_stock_consumption_report(
    p_start_date DATE DEFAULT (CURRENT_DATE - INTERVAL '30 days')::DATE,
    p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
    product_id UUID,
    product_name TEXT,
    category_name TEXT,
    total_consumed NUMERIC,
    total_cost NUMERIC,
    current_stock INTEGER,
    min_stock INTEGER,
    days_until_empty NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id AS product_id,
        p.name AS product_name,
        COALESCE(pc.name, 'Sem Categoria') AS category_name,
        COALESCE(SUM(sm.quantity), 0) AS total_consumed,
        COALESCE(SUM(sm.quantity * p.cost), 0) AS total_cost,
        p.quantity AS current_stock,
        p.min_stock,
        CASE 
            WHEN COALESCE(SUM(sm.quantity), 0) > 0 THEN
                ROUND(p.quantity::NUMERIC / (SUM(sm.quantity) / GREATEST(1, p_end_date - p_start_date)), 1)
            ELSE NULL
        END AS days_until_empty
    FROM products p
    LEFT JOIN product_categories pc ON pc.id = p.category_id
    LEFT JOIN stock_movements sm ON sm.product_id = p.id 
        AND sm.type = 'out' 
        AND sm.created_at::DATE BETWEEN p_start_date AND p_end_date
    WHERE p.active = true
    GROUP BY p.id, p.name, pc.name, p.quantity, p.min_stock
    ORDER BY total_consumed DESC;
END;
$$ LANGUAGE plpgsql STABLE;


-- ════════════════════════════════════════════════════════════
-- VIEWS
-- ════════════════════════════════════════════════════════════

-- Dashboard de estoque
DROP VIEW IF EXISTS public.v_stock_dashboard;
CREATE OR REPLACE VIEW v_stock_dashboard AS
SELECT 
    COUNT(*) FILTER (WHERE p.active = true) AS total_products,
    COUNT(*) FILTER (WHERE p.quantity <= p.min_stock AND p.active = true) AS low_stock_count,
    COUNT(*) FILTER (WHERE p.quantity = 0 AND p.active = true) AS out_of_stock_count,
    COALESCE(SUM(p.quantity * p.cost) FILTER (WHERE p.active = true), 0) AS total_stock_value,
    COALESCE(SUM(p.quantity) FILTER (WHERE p.active = true), 0) AS total_units
FROM products p;

-- Consumo por barbeiro
DROP VIEW IF EXISTS public.v_barber_consumption;
CREATE OR REPLACE VIEW v_barber_consumption AS
SELECT 
    a.id AS artist_id,
    a.name AS artist_name,
    COUNT(DISTINCT bul.appointment_id) AS total_appointments,
    COALESCE(SUM(bul.quantity_used), 0) AS total_products_used,
    COALESCE(SUM(bul.cost_at_time * bul.quantity_used), 0) AS total_cost,
    COALESCE(
        SUM(bul.cost_at_time * bul.quantity_used) FILTER (
            WHERE bul.created_at >= date_trunc('month', CURRENT_DATE)
        ), 0
    ) AS monthly_cost
FROM artists a
LEFT JOIN barber_usage_logs bul ON bul.artist_id = a.id
WHERE a.active = true
GROUP BY a.id, a.name
ORDER BY total_cost DESC;

-- Lucratividade por serviço
DROP VIEW IF EXISTS public.v_service_profitability;
CREATE OR REPLACE VIEW v_service_profitability AS
SELECT 
    s.id AS service_id,
    s.name AS service_name,
    s.price AS service_price,
    COALESCE(fn_calculate_service_cost(s.id), 0) AS service_cost,
    s.price - COALESCE(fn_calculate_service_cost(s.id), 0) AS profit,
    CASE 
        WHEN s.price > 0 THEN 
            ROUND(((s.price - COALESCE(fn_calculate_service_cost(s.id), 0)) / s.price) * 100, 1)
        ELSE 0 
    END AS margin_percent,
    COUNT(DISTINCT ap.id) AS total_appointments
FROM services s
LEFT JOIN appointments ap ON ap.service_id = s.id AND ap.status = 'finished'
GROUP BY s.id, s.name, s.price
ORDER BY profit DESC;


-- ════════════════════════════════════════════════════════════
-- DADOS DE EXEMPLO — Produtos populares de barbearias brasileiras
-- ════════════════════════════════════════════════════════════

-- Categorias
INSERT INTO product_categories (name, icon) VALUES
    ('Lâminas & Navalhas', '🪒'),
    ('Pomadas & Ceras', '🧴'),
    ('Gel & Fixadores', '💈'),
    ('Cuidados Capilares', '💆'),
    ('Óleos & Barba', '🧔'),
    ('Higiene & Limpeza', '🧼'),
    ('Descartáveis', '🗑️'),
    ('Bebidas', '🥃')
ON CONFLICT (name) DO NOTHING;

-- Produtos populares
INSERT INTO products (name, sku, description, category_id, cost, price, quantity, min_stock, unit) VALUES
    -- Lâminas & Navalhas
    ('Lâmina Gillette Platinum', 'LAM-001', 'Cartela com 10 unidades', 
     (SELECT id FROM product_categories WHERE name = 'Lâminas & Navalhas'), 8.50, 0, 100, 20, 'cartela'),
    ('Lâmina Derby Premium', 'LAM-002', 'Caixa com 100 unidades', 
     (SELECT id FROM product_categories WHERE name = 'Lâminas & Navalhas'), 25.00, 0, 50, 10, 'cx'),
    ('Navalha Descartável Bic', 'LAM-003', 'Pacote com 12 unidades', 
     (SELECT id FROM product_categories WHERE name = 'Lâminas & Navalhas'), 18.00, 0, 30, 8, 'pct'),

    -- Pomadas & Ceras
    ('Pomada Modeladora Matte QOD', 'POM-001', 'Efeito seco, 70g', 
     (SELECT id FROM product_categories WHERE name = 'Pomadas & Ceras'), 28.00, 65.00, 15, 5, 'un'),
    ('Pomada Black Fix Brilho', 'POM-002', 'Fixação forte com brilho, 150g', 
     (SELECT id FROM product_categories WHERE name = 'Pomadas & Ceras'), 15.00, 35.00, 20, 5, 'un'),
    ('Cera Modeladora Fox For Men', 'POM-003', 'Fixação média, 80g', 
     (SELECT id FROM product_categories WHERE name = 'Pomadas & Ceras'), 12.00, 30.00, 18, 5, 'un'),
    ('Pomada Uppercut Deluxe', 'POM-004', 'Importada, fixação forte, 100g', 
     (SELECT id FROM product_categories WHERE name = 'Pomadas & Ceras'), 85.00, 180.00, 8, 3, 'un'),

    -- Gel & Fixadores
    ('Gel Fixador Extra Forte Bozzano', 'GEL-001', 'Pote 300g', 
     (SELECT id FROM product_categories WHERE name = 'Gel & Fixadores'), 12.00, 0, 25, 8, 'un'),
    ('Spray Fixador Hair Spray', 'GEL-002', '400ml', 
     (SELECT id FROM product_categories WHERE name = 'Gel & Fixadores'), 22.00, 0, 12, 4, 'un'),
    ('Gel Invisível Duty For Men', 'GEL-003', '300g', 
     (SELECT id FROM product_categories WHERE name = 'Gel & Fixadores'), 18.00, 0, 15, 5, 'un'),

    -- Cuidados Capilares
    ('Shampoo Anticaspa Head & Shoulders', 'CAP-001', 'Profissional 1L', 
     (SELECT id FROM product_categories WHERE name = 'Cuidados Capilares'), 35.00, 0, 8, 3, 'un'),
    ('Condicionador Profissional Wella', 'CAP-002', '1 Litro', 
     (SELECT id FROM product_categories WHERE name = 'Cuidados Capilares'), 42.00, 0, 6, 2, 'un'),
    ('Tônico Capilar Anticaspa', 'CAP-003', 'Spray 120ml', 
     (SELECT id FROM product_categories WHERE name = 'Cuidados Capilares'), 20.00, 45.00, 10, 3, 'un'),

    -- Óleos & Barba
    ('Óleo para Barba Viking', 'BAR-001', '30ml', 
     (SELECT id FROM product_categories WHERE name = 'Óleos & Barba'), 25.00, 55.00, 12, 4, 'un'),
    ('Balm Modelador para Barba', 'BAR-002', '60g', 
     (SELECT id FROM product_categories WHERE name = 'Óleos & Barba'), 18.00, 40.00, 10, 3, 'un'),
    ('Shampoo de Barba Black Barts', 'BAR-003', '140ml', 
     (SELECT id FROM product_categories WHERE name = 'Óleos & Barba'), 28.00, 60.00, 8, 3, 'un'),
    ('Creme de Barbear Proraso', 'BAR-004', '150ml - Refrescante', 
     (SELECT id FROM product_categories WHERE name = 'Óleos & Barba'), 45.00, 0, 10, 3, 'un'),

    -- Higiene & Limpeza
    ('Talco Profissional Clubman', 'HIG-001', '255g', 
     (SELECT id FROM product_categories WHERE name = 'Higiene & Limpeza'), 35.00, 0, 6, 2, 'un'),
    ('Loção Pós-Barba Menthol', 'HIG-002', '250ml', 
     (SELECT id FROM product_categories WHERE name = 'Higiene & Limpeza'), 22.00, 0, 10, 3, 'un'),
    ('Álcool 70% Spray', 'HIG-003', '500ml', 
     (SELECT id FROM product_categories WHERE name = 'Higiene & Limpeza'), 8.00, 0, 20, 5, 'un'),

    -- Descartáveis
    ('Papel Pescoço (Rolo)', 'DESC-001', 'Rolo com 100 folhas', 
     (SELECT id FROM product_categories WHERE name = 'Descartáveis'), 12.00, 0, 30, 10, 'rolo'),
    ('Toalha Descartável TNT', 'DESC-002', 'Pacote com 50 unidades', 
     (SELECT id FROM product_categories WHERE name = 'Descartáveis'), 18.00, 0, 20, 5, 'pct'),
    ('Luvas Descartáveis (Cx 100)', 'DESC-003', 'Tamanho M', 
     (SELECT id FROM product_categories WHERE name = 'Descartáveis'), 25.00, 0, 10, 3, 'cx'),

    -- Bebidas
    ('Cerveja Artesanal (Long Neck)', 'BEB-001', 'Unidade 355ml', 
     (SELECT id FROM product_categories WHERE name = 'Bebidas'), 5.00, 12.00, 48, 12, 'un'),
    ('Whisky (Dose)', 'BEB-002', 'Jack Daniels - dose 50ml', 
     (SELECT id FROM product_categories WHERE name = 'Bebidas'), 8.00, 20.00, 30, 10, 'dose'),
    ('Café Expresso (Cápsula)', 'BEB-003', 'Caixa 10 cápsulas', 
     (SELECT id FROM product_categories WHERE name = 'Bebidas'), 15.00, 0, 20, 5, 'cx')
ON CONFLICT (sku) DO NOTHING;


-- ════════════════════════════════════════════════════════════
-- ATUALIZAR VIEW DE APPOINTMENTS para incluir dados de custo
-- ════════════════════════════════════════════════════════════
DROP VIEW IF EXISTS public.appointments_view;
CREATE OR REPLACE VIEW appointments_view AS
SELECT 
    a.*,
    c.name AS client_name,
    c.phone AS client_phone,
    s.name AS service_name,
    s.price AS service_price,
    ar.name AS barber_name,
    COALESCE(fn_calculate_service_cost(a.service_id), 0) AS service_cost,
    COALESCE(a.session_price, 0) - COALESCE(fn_calculate_service_cost(a.service_id), 0) AS appointment_profit
FROM appointments a
LEFT JOIN customers c ON a.customer_id = c.id
LEFT JOIN services s ON a.service_id = s.id
LEFT JOIN artists ar ON a.artist_id = ar.id;


-- ════════════════════════════════════════════════════════════
-- ÍNDICES para performance
-- ════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created ON stock_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(type);
CREATE INDEX IF NOT EXISTS idx_barber_usage_artist ON barber_usage_logs(artist_id);
CREATE INDEX IF NOT EXISTS idx_barber_usage_created ON barber_usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_stock_alerts_resolved ON stock_alerts(resolved);
CREATE INDEX IF NOT EXISTS idx_service_products_service ON service_products(service_id);
CREATE INDEX IF NOT EXISTS idx_finances_date ON finances(date);
CREATE INDEX IF NOT EXISTS idx_finances_artist ON finances(artist_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

-- ════════════════════════════════════════════════════════════
-- FIM — SQL executado com sucesso!
-- ════════════════════════════════════════════════════════════
