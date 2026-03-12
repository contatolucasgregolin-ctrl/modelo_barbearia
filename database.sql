-- Limpar tabelas se já existirem
drop table if exists appointments;
drop table if exists artists;
drop table if exists services;
drop table if exists customers;
drop table if exists settings;
drop table if exists gallery;
drop table if exists plans;
drop table if exists promotions;

-- Criar tabela de clientes (customers)
create table customers (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  phone text not null,
  email text,
  instagram text,
  birthday date,
  observations text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Criar tabela de serviços
create table services (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  duration_mins integer not null,
  price numeric(10, 2) not null,
  description text,
  is_featured boolean default false
);

-- Inserir dados de serviços genéricos
insert into services (name, duration_mins, price, description, is_featured) values
  ('Sessão de Tatuagem', 180, 250.00, 'Sessão padrão de tatuagem, arte exclusiva.', true),
  ('Piercing', 30, 80.00, 'Perfuração com joia básica inclusa.', false),
  ('Corte de Cabelo / Barba', 60, 60.00, 'Corte de cabelo padrão ou alinhamento de barba.', false),
  ('Estética Facial', 90, 150.00, 'Limpeza de pele e tratamentos faciais rápidos.', false);

-- Criar tabela de profissionais (artists)
create table artists (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  instagram text,
  specialty text,
  photo_url text,
  active boolean default true
);

-- Inserir profissionais fictícios
insert into artists (name, instagram, specialty, active) values
  ('Ana Souza', 'anasouza', 'Tatuagem Fineline e Aquarela', true),
  ('Carlos Mendes', 'carlosmendes', 'Barbearia Clássica e Piercing', true),
  ('Juliana Costa', 'julianacosta', 'Estética Avançada', true);

-- Criar tabela de agendamentos
create table appointments (
  id uuid default gen_random_uuid() primary key,
  customer_id uuid references customers(id),
  service_id uuid references services(id),
  artist_id uuid references artists(id),
  date date not null,
  time time not null,
  description text,
  session_price numeric(10, 2),
  status text default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Criar tabela de configurações (settings)
create table settings (
  id uuid default gen_random_uuid() primary key,
  key_name text unique not null,
  value jsonb not null
);

create table gallery (
  id uuid default gen_random_uuid() primary key,
  image_url text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Criar tabela de planos de sessão (plans)
create table plans (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  price numeric(10, 2) not null,
  period text default 'por sessão',
  features jsonb default '[]'::jsonb,
  is_popular boolean default false,
  active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Inserir planos padrão
insert into plans (title, price, period, features, is_popular) values
  ('PLANO ART SESSION', 450.00, 'por sessão', '["até 4 horas de tatuagem", "planejamento artístico", "acompanhamento do projeto"]', false),
  ('PLANO FULL DAY', 900.00, 'por sessão', '["até 8 horas de tatuagem", "projeto personalizado", "prioridade de agenda"]', true);

-- Criar tabela de promoções (promotions)
create table promotions (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text not null,
  image_url text,
  active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Inserir configurações padrão
insert into settings (key_name, value) values
  ('contact', '{"phone": "11999999999", "whatsapp": "5511999999999", "instagram": "studioflow", "address": "Rua Exemplo, 123, Centro"}'),
  ('operating_hours', '{"weekdays": {"open": "09:00", "close": "19:00", "label": "Segunda a Sexta"}, "saturdays": {"open": "09:00", "close": "15:00", "label": "Sábados"}, "sundays": {"open": "", "close": "", "label": "Domingos"}}');

-- Configurações RLS (para demonstração)
alter table customers enable row level security;
alter table services enable row level security;
alter table artists enable row level security;
alter table appointments enable row level security;
alter table settings enable row level security;
alter table gallery enable row level security;
alter table plans enable row level security;
alter table promotions enable row level security;

-- Permite acesso público total para a plataforma de demonstração
create policy "Allow public all on services" on services for all using (true) with check (true);
create policy "Allow public all on artists" on artists for all using (true) with check (true);
create policy "Allow public all on customers" on customers for all using (true) with check (true);
create policy "Allow public all on appointments" on appointments for all using (true) with check (true);
create policy "Allow public all on settings" on settings for all using (true) with check (true);
create policy "Allow public all on gallery" on gallery for all using (true) with check (true);
create policy "Allow public all on plans" on plans for all using (true) with check (true);
create policy "Allow public all on promotions" on promotions for all using (true) with check (true);

-- Criar view de agendamentos para facilitar a leitura no frontend
create or replace view appointments_view as
select 
  a.*,
  c.name as client_name,
  c.phone as client_phone,
  s.name as service_name,
  ar.name as barber_name
from appointments a
left join customers c on a.customer_id = c.id
left join services s on a.service_id = s.id
left join artists ar on a.artist_id = ar.id;
