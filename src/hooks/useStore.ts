import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Viagem, Despesa, Abastecimento, UserProfile, Veiculo } from '@/types';
import { generateId } from '@/utils/calculadora';

const DEFAULT_PROFILE: UserProfile = {
  nome: 'Motorista',
  modelo_caminhao: 'Scania R450',
  media_km_litro: 2.5,
  tipo_combustivel: 'Diesel S10',
};

export function useStore(userId: string) {
  const [viagens, setViagens] = useState<Viagem[]>([]);
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [abastecimentos, setAbastecimentos] = useState<Abastecimento[]>([]);
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setDataLoading(false); return; }

    async function loadData() {
      setDataLoading(true);
      const [v, d, a, ve] = await Promise.all([
        supabase.from('viagens').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('despesas').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('abastecimentos').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('veiculos').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      ]);

      if (v.data) setViagens(v.data as Viagem[]);
      if (d.data) setDespesas(d.data as Despesa[]);
      if (a.data) setAbastecimentos(a.data as Abastecimento[]);
      if (ve.data) setVeiculos(ve.data as Veiculo[]);
      setDataLoading(false);
    }

    loadData();
  }, [userId]);

  const updateProfile = useCallback((p: UserProfile) => { setProfile(p); }, []);

  // VIAGENS
  const addViagem = useCallback((v: Omit<Viagem, 'id' | 'created_at'>) => {
    const nova: Viagem = { ...v, id: generateId(), created_at: new Date().toISOString() };
    setViagens(prev => [nova, ...prev]);
    supabase.from('viagens').insert({ ...nova, user_id: userId })
      .then(({ error }) => { if (error) console.error('Erro ao salvar viagem:', error); });
    return nova;
  }, [userId]);

  const updateViagem = useCallback((id: string, updates: Partial<Viagem>) => {
    setViagens(prev => prev.map(v => v.id === id ? { ...v, ...updates } : v));
    supabase.from('viagens').update(updates).eq('id', id).eq('user_id', userId)
      .then(({ error }) => { if (error) console.error('Erro ao atualizar viagem:', error); });
  }, [userId]);

  // DESPESAS
  const addDespesa = useCallback((d: Omit<Despesa, 'id' | 'created_at'>) => {
    const nova: Despesa = { ...d, id: generateId(), created_at: new Date().toISOString() };
    setDespesas(prev => [nova, ...prev]);
    supabase.from('despesas').insert({ ...nova, user_id: userId })
      .then(({ error }) => { if (error) console.error('Erro ao salvar despesa:', error); });
    return nova;
  }, [userId]);

  const getDespesasViagem = useCallback((viagemId: string) => {
    return despesas.filter(d => d.viagem_id === viagemId);
  }, [despesas]);

  // ABASTECIMENTOS
  const addAbastecimento = useCallback((a: Omit<Abastecimento, 'id' | 'created_at' | 'media_calculada'>) => {
    const anterior = abastecimentos[0] ?? null;
    const hodAtual = a.hodometro;
    const media_calculada = anterior && hodAtual > anterior.hodometro && a.litragem > 0
      ? (hodAtual - anterior.hodometro) / a.litragem
      : 0;
    const novo: Abastecimento = { ...a, id: generateId(), media_calculada, created_at: new Date().toISOString() };
    setAbastecimentos(prev => [novo, ...prev]);
    supabase.from('abastecimentos').insert({ ...novo, user_id: userId })
      .then(({ error }) => { if (error) console.error('Erro ao salvar abastecimento:', error); });
    return novo;
  }, [userId, abastecimentos]);

  // VEÍCULOS
  const addVeiculo = useCallback((v: Omit<Veiculo, 'id' | 'created_at'>) => {
    const novo: Veiculo = { ...v, id: generateId(), created_at: new Date().toISOString() };
    setVeiculos(prev => [novo, ...prev]);
    supabase.from('veiculos').insert({ ...novo, user_id: userId })
      .then(({ error }) => { if (error) console.error('Erro ao salvar veículo:', error); });
    return novo;
  }, [userId]);

  const updateVeiculo = useCallback((id: string, updates: Partial<Veiculo>) => {
    setVeiculos(prev => prev.map(v => v.id === id ? { ...v, ...updates } : v));
    supabase.from('veiculos').update(updates).eq('id', id).eq('user_id', userId)
      .then(({ error }) => { if (error) console.error('Erro ao atualizar veículo:', error); });
  }, [userId]);

  const vincularMotorista = useCallback(async (veiculoId: string, documento: string) => {
    // Remove pontuação para comparar de forma flexível
    const docLimpo = documento.replace(/[.\-\/]/g, '').trim();

    // Busca todos os perfis de motorista (a policy de leitura pública permite isso)
    const { data: todos, error } = await supabase
      .from('profiles')
      .select('id, nome, documento, tipo_perfil');

    if (error) {
      console.error('Erro ao buscar perfis:', error);
      return { error: 'Erro ao buscar motorista. Tente novamente.' };
    }

    // Filtra localmente pelo documento (ignora pontuação) e tipo
    // tipo_perfil !== 'frota' cobre tanto 'motorista' quanto NULL (dados legados)
    const motorista = (todos ?? []).find(p => {
      const docP = (p.documento ?? '').replace(/[.\-\/]/g, '').trim();
      return docP === docLimpo && p.tipo_perfil !== 'frota';
    });

    if (!motorista) {
      return { error: 'Motorista não encontrado. Verifique se o CPF/CNPJ está correto e se o motorista está cadastrado no app.' };
    }

    const updates: Partial<Veiculo> = {
      motorista_documento: documento,
      motorista_nome: motorista.nome,
      motorista_id: motorista.id,
    };

    updateVeiculo(veiculoId, updates);

    // Atualiza o profile do motorista com o modelo do veículo para liberar acesso
    const veiculo = veiculos.find(v => v.id === veiculoId);
    // Nota: o motorista atualiza o próprio perfil ao clicar em
    // "Verificar vinculação" no dashboard (RLS não permite frotista editar perfil alheio)

    return { success: true, motorista };
  }, [updateVeiculo, veiculos]);

  return {
    viagens, despesas, abastecimentos, veiculos, profile,
    dataLoading, updateProfile,
    addViagem, updateViagem,
    addDespesa, getDespesasViagem,
    addAbastecimento,
    addVeiculo, updateVeiculo, vincularMotorista,
  };
}
