-- 1. Limpar TODAS as políticas antigas e conflitantes para evitar duplicatas
DO $$ 
BEGIN
    -- Remover políticas de SELECT
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_roles_select_policy') THEN DROP POLICY "user_roles_select_policy" ON public.user_roles; END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_roles_select_self') THEN DROP POLICY "user_roles_select_self" ON public.user_roles; END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_roles_select_admin') THEN DROP POLICY "user_roles_select_admin" ON public.user_roles; END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can read own roles') THEN DROP POLICY "Users can read own roles" ON public.user_roles; END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Usuários podem ver seu próprio cargo') THEN DROP POLICY "Usuários podem ver seu próprio cargo" ON public.user_roles; END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable read access for all users') THEN DROP POLICY "Enable read access for all users" ON public.user_roles; END IF;

    -- Remover políticas de INSERT/UPDATE/DELETE (ALL)
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_roles_insert_policy') THEN DROP POLICY "user_roles_insert_policy" ON public.user_roles; END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_roles_update_policy') THEN DROP POLICY "user_roles_update_policy" ON public.user_roles; END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_roles_delete_policy') THEN DROP POLICY "user_roles_delete_policy" ON public.user_roles; END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_roles_all_admin') THEN DROP POLICY "user_roles_all_admin" ON public.user_roles; END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can do everything') THEN DROP POLICY "Admins can do everything" ON public.user_roles; END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Apenas admins podem inserir/editar cargos') THEN DROP POLICY "Apenas admins podem inserir/editar cargos" ON public.user_roles; END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can insert roles') THEN DROP POLICY "Admins can insert roles" ON public.user_roles; END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can update roles') THEN DROP POLICY "Admins can update roles" ON public.user_roles; END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can delete roles') THEN DROP POLICY "Admins can delete roles" ON public.user_roles; END IF;
END $$;

-- 2. Garantir que o RLS está ativo
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. POLÍTICA BASE PARA O PRÓPRIO USUÁRIO (Livre de recursão!)
-- Permite que qualquer um veja seu próprio papel sem disparar novas subqueries.
CREATE POLICY "user_roles_select_self" 
ON public.user_roles FOR SELECT 
USING (auth.uid() = user_id);

-- 4. POLÍTICA PARA ADMINS (Lê outros usuários)
-- Esta política depende da 'user_roles_select_self' para o SELECT interno do usuário logado.
CREATE POLICY "user_roles_select_admin" 
ON public.user_roles FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- 5. POLÍTICA DE ESCRITA COMPLETA PARA ADMINS
-- Permite INSERT, UPDATE, DELETE apenas se for admin.
CREATE POLICY "user_roles_all_admin" 
ON public.user_roles FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);
