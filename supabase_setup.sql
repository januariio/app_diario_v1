-- Execute este SQL no Supabase SQL Editor para criar a tabela de perfis
-- e o trigger que cria o perfil automaticamente ao cadastrar

-- 1. Tabela de perfis
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  nome text not null,
  email text not null,
  whatsapp text default '',
  modelo_caminhao text not null default 'Scania R450',
  media_km_litro numeric not null default 2.5,
  tipo_combustivel text not null default 'Diesel S10',
  created_at timestamp with time zone default now()
);

alter table profiles enable row level security;

create policy "Usuários podem ver próprio perfil"
  on profiles for select
  using (auth.uid() = id);

create policy "Usuários podem atualizar próprio perfil"
  on profiles for update
  using (auth.uid() = id);

create policy "Usuários podem inserir próprio perfil"
  on profiles for insert
  with check (auth.uid() = id);

-- 2. Trigger: cria perfil automaticamente quando um novo usuário se cadastra
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, nome, email, whatsapp, modelo_caminhao, media_km_litro)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nome', 'Motorista'),
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'whatsapp', ''),
    coalesce(new.raw_user_meta_data ->> 'modelo_caminhao', 'Scania R450'),
    coalesce((new.raw_user_meta_data ->> 'media_km_litro')::numeric, 2.5)
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
