-- 1. Versão Segura (Esquema Public) para evitar erro de permissão no schema 'auth'
-- Esta função verifica se o usuário é admin sem causar recursão infinita
CREATE OR REPLACE FUNCTION public.check_is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER -- Roda com privilégios de superusuário para ignorar RLS durante a checagem
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  );
$$;

-- 2. Limpar políticas antigas que estão causando o loop infinito
DROP POLICY IF EXISTS "Enable read access for all users" ON public.user_roles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.user_roles;
DROP POLICY IF EXISTS "Enable update for users based on email" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can do everything" ON public.user_roles;
DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;

-- 3. Criar novas políticas usando a função recém-criada (sem recursão)

-- Permite leitura: O próprio usuário ou qualquer Admin (via função segura)
CREATE POLICY "user_roles_select_policy" ON public.user_roles
FOR SELECT USING (
  auth.uid() = user_id OR public.check_is_admin()
);

-- Permite Inserção: Apenas Admins
CREATE POLICY "user_roles_insert_policy" ON public.user_roles
FOR INSERT WITH CHECK (
  public.check_is_admin()
);

-- Permite Atualização: Apenas Admins
CREATE POLICY "user_roles_update_policy" ON public.user_roles
FOR UPDATE USING (
  public.check_is_admin()
);

-- Permite Deleção: Apenas Admins
CREATE POLICY "user_roles_delete_policy" ON public.user_roles
FOR DELETE USING (
  public.check_is_admin()
);
