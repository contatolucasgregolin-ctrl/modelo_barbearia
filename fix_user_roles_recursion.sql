-- 1. Cria uma função segura (Security Definer) para verificar se o usuário atual é admin.
-- Isso permite o banco ler a tabela sem disparar as políticas de segurança novamente (evita o loop de recursão infinita no Supabase)
CREATE OR REPLACE FUNCTION auth.is_admin()
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

-- 2. Recria as Políticas do user_roles sem recursão.
DROP POLICY IF EXISTS "Enable read access for all users" ON public.user_roles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.user_roles;
DROP POLICY IF EXISTS "Enable update for users based on email" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can do everything" ON public.user_roles;
DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;

-- Permite ao usuário ler seu próprio papel, OU ao admin ler todos (usando a nova função livre de loops)
CREATE POLICY "Users can read own roles" ON public.user_roles
FOR SELECT USING (
  auth.uid() = user_id OR auth.is_admin()
);

-- Apenas admins podem inserir, atualizar e deletar papéis do sistema
CREATE POLICY "Admins can insert roles" ON public.user_roles
FOR INSERT WITH CHECK (
  auth.is_admin()
);

CREATE POLICY "Admins can update roles" ON public.user_roles
FOR UPDATE USING (
  auth.is_admin()
);

CREATE POLICY "Admins can delete roles" ON public.user_roles
FOR DELETE USING (
  auth.is_admin()
);
