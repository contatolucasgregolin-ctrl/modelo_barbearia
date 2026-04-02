-- 1. DESATIVAR RLS TEMPORARIAMENTE PARA GARANTIR LIMPEZA SEGURA 
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;

-- 2. REMOVER TODAS AS POLÍTICAS ANTIGAS POSSIVELMENTE PROBLEMÁTICAS
DO $$ 
BEGIN
    -- DROP Todas as políticas para garantir que nenhuma sobrou
    DROP POLICY IF EXISTS "user_roles_select_policy" ON public.user_roles;
    DROP POLICY IF EXISTS "user_roles_select_self" ON public.user_roles;
    DROP POLICY IF EXISTS "user_roles_select_admin" ON public.user_roles;
    DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;
    DROP POLICY IF EXISTS "Usuários podem ver seu próprio cargo" ON public.user_roles;
    DROP POLICY IF EXISTS "Enable read access for all users" ON public.user_roles;
    DROP POLICY IF EXISTS "user_roles_insert_policy" ON public.user_roles;
    DROP POLICY IF EXISTS "user_roles_update_policy" ON public.user_roles;
    DROP POLICY IF EXISTS "user_roles_delete_policy" ON public.user_roles;
    DROP POLICY IF EXISTS "user_roles_all_admin" ON public.user_roles;
    DROP POLICY IF EXISTS "Admins can do everything" ON public.user_roles;
    DROP POLICY IF EXISTS "Apenas admins podem inserir/editar cargos" ON public.user_roles;
    DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
    DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
    DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
EXCEPTION WHEN OTHERS THEN
    -- Ignora erros se a politica ja nao existir
END $$;

-- 3. CRIAR FUNÇÃO SEGURA (SECURITY DEFINER) PARA LER O CARGO
-- Como é Security Definer, ela roda como superusuário e pula as regras de RLS internamente.
-- Isso PREVINE TOTALMENTE a recursão (loop infinito).
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  );
$$;

-- 4. REATIVAR RLS APÓS LIMPEZA
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 5. CRIAR POLÍTICAS 100% BLINDADAS CONTRA RECURSÃO

-- A. Política de Leitura: Usuário vê si mesmo, O U Admin vê todos
CREATE POLICY "policy_select_user_roles" 
ON public.user_roles
FOR SELECT 
USING (
  auth.uid() = user_id OR public.is_current_user_admin() = true
);

-- B. Política de Inserção: Apenas Admins
CREATE POLICY "policy_insert_user_roles" 
ON public.user_roles
FOR INSERT 
WITH CHECK (
  public.is_current_user_admin() = true
);

-- C. Política de Atualização: Apenas Admins
CREATE POLICY "policy_update_user_roles" 
ON public.user_roles
FOR UPDATE 
USING (
  public.is_current_user_admin() = true
)
WITH CHECK (
  public.is_current_user_admin() = true
);

-- D. Política de Deleção: Apenas Admins
CREATE POLICY "policy_delete_user_roles" 
ON public.user_roles
FOR DELETE 
USING (
  public.is_current_user_admin() = true
);

-- 6. GARANTIR QUE A TRIGGER DE NOVO USUÁRIO FUNCIONE SEM BARRAR
-- Essa trigger PRECISA ser SECURITY DEFINER também
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'barber');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
