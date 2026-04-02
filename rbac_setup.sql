-- 1. Criar tabela de cargos
create table if not exists public.user_roles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text not null check (role in ('admin', 'barber')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id)
);

-- 2. Habilitar RLS
alter table public.user_roles enable row level security;

-- 3. Políticas de Segurança (RLS)
create policy "Usuários podem ver seu próprio cargo" 
  on public.user_roles for select 
  using (auth.uid() = user_id);

create policy "Apenas admins podem inserir/editar cargos" 
  on public.user_roles for all 
  using (
    exists (
      select 1 from public.user_roles 
      where user_id = auth.uid() and role = 'admin'
    )
  );

-- 4. Função para auto-atribuir cargo 'barber' a novos usuários
create or replace function public.handle_new_user_role()
returns trigger as $$
begin
  insert into public.user_roles (user_id, role)
  values (new.id, 'barber');
  return new;
end;
$$ language plpgsql security definer;

-- 5. Trigger para executar a função acima
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user_role();

-- NOTA: Execute o comando abaixo manualmente para se tornar ADMIN pela primeira vez:
-- update public.user_roles set role = 'admin' where user_id = 'SEU_USER_ID_AQUI';
