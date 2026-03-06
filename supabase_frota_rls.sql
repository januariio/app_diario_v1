-- ==============================================================================
-- CORREÇÃO COMPLETA: Frotista visualiza dados dos motoristas vinculados
-- Execute no Supabase: Dashboard > SQL Editor > New query
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 0. CORREÇÃO DO TRIGGER — inclui tipo_perfil, documento, comissao, eixos
--    Problema: trigger antigo criava o perfil sem esses campos, deixando-os NULL
--    A cláusula ON CONFLICT atualiza campos faltantes sem sobrescrever existentes
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, nome, email, whatsapp,
    modelo_caminhao, media_km_litro, tipo_combustivel,
    comissao, eixos, documento, tipo_perfil
  )
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data ->> 'nome', 'Usuário'),
    COALESCE(new.email, ''),
    COALESCE(new.raw_user_meta_data ->> 'whatsapp', ''),
    COALESCE(new.raw_user_meta_data ->> 'modelo_caminhao', 'Scania R450'),
    COALESCE((new.raw_user_meta_data ->> 'media_km_litro')::numeric, 2.5),
    'Diesel S10',
    NULLIF(new.raw_user_meta_data ->> 'comissao', '')::numeric,
    COALESCE((new.raw_user_meta_data ->> 'eixos')::integer, 6),
    NULLIF(new.raw_user_meta_data ->> 'documento', ''),
    COALESCE(new.raw_user_meta_data ->> 'tipo_perfil', 'motorista')
  )
  ON CONFLICT (id) DO UPDATE SET
    tipo_perfil = COALESCE(EXCLUDED.tipo_perfil, profiles.tipo_perfil, 'motorista'),
    documento   = COALESCE(EXCLUDED.documento,   profiles.documento),
    comissao    = COALESCE(EXCLUDED.comissao,    profiles.comissao),
    eixos       = COALESCE(EXCLUDED.eixos,       profiles.eixos, 6);
  RETURN new;
END;
$$;

-- ------------------------------------------------------------------------------
-- 0b. CORRIGIR DADOS EXISTENTES — preenche tipo_perfil NULL com 'motorista'
--     Usuários cadastrados antes da correção têm tipo_perfil = NULL
-- ------------------------------------------------------------------------------
UPDATE public.profiles
SET tipo_perfil = 'motorista'
WHERE tipo_perfil IS NULL;

-- ------------------------------------------------------------------------------
-- 1. PROFILES — Permite que usuários autenticados leiam perfis básicos
--    Necessário para vincularMotorista() buscar motorista por CPF/CNPJ
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Usuários podem ver próprio perfil" ON profiles;
DROP POLICY IF EXISTS "Autenticados leem perfis" ON profiles;

CREATE POLICY "Autenticados leem perfis"
  ON profiles FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Usuários podem atualizar próprio perfil" ON profiles;
CREATE POLICY "Usuários podem atualizar próprio perfil"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Usuários podem inserir próprio perfil" ON profiles;
CREATE POLICY "Usuários podem inserir próprio perfil"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ------------------------------------------------------------------------------
-- 2. VEÍCULOS — Frotistas gerenciam os próprios / Motoristas veem o vinculado
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS veiculos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Frotistas gerenciam próprios veículos" ON veiculos;
CREATE POLICY "Frotistas gerenciam próprios veículos"
  ON veiculos FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Motoristas veem veículo vinculado" ON veiculos;
CREATE POLICY "Motoristas veem veículo vinculado"
  ON veiculos FOR SELECT
  USING (
    auth.uid() = motorista_id
    OR motorista_documento IN (
      SELECT documento
      FROM public.profiles
      WHERE id = auth.uid()
        AND documento IS NOT NULL
    )
  );

-- ------------------------------------------------------------------------------
-- 3. VIAGENS — Usuários gerenciam as próprias / Frotistas veem dos seus motoristas
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS viagens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários gerenciam próprias viagens" ON viagens;
CREATE POLICY "Usuários gerenciam próprias viagens"
  ON viagens FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Frotistas veem viagens dos motoristas" ON viagens;
CREATE POLICY "Frotistas veem viagens dos motoristas"
  ON viagens FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1
      FROM public.veiculos v
      WHERE v.user_id = auth.uid()
        AND v.motorista_id = viagens.user_id
    )
  );

-- ------------------------------------------------------------------------------
-- 4. DESPESAS — Usuários gerenciam as próprias / Frotistas veem dos seus motoristas
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS despesas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários gerenciam próprias despesas" ON despesas;
CREATE POLICY "Usuários gerenciam próprias despesas"
  ON despesas FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Frotistas veem despesas dos motoristas" ON despesas;
CREATE POLICY "Frotistas veem despesas dos motoristas"
  ON despesas FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1
      FROM public.veiculos v
      WHERE v.user_id = auth.uid()
        AND v.motorista_id = despesas.user_id
    )
  );

-- ------------------------------------------------------------------------------
-- 5. ABASTECIMENTOS — Usuários gerenciam os próprios / Frotistas veem dos motoristas
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS abastecimentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários gerenciam próprios abastecimentos" ON abastecimentos;
CREATE POLICY "Usuários gerenciam próprios abastecimentos"
  ON abastecimentos FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Frotistas veem abastecimentos dos motoristas" ON abastecimentos;
CREATE POLICY "Frotistas veem abastecimentos dos motoristas"
  ON abastecimentos FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1
      FROM public.veiculos v
      WHERE v.user_id = auth.uid()
        AND v.motorista_id = abastecimentos.user_id
    )
  );
