import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Viagem, Despesa, Abastecimento, UserProfile } from '@/types';
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
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [dataLoading, setDataLoading] = useState(true);

  // Carrega todos os dados do usuário ao iniciar
  useEffect(() => {
    if (!userId) {
      setDataLoading(false);
      return;
    }

    async function loadData() {
      setDataLoading(true);
      const [v, d, a] = await Promise.all([
        supabase
          .from('viagens')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
        supabase
          .from('despesas')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
        supabase
          .from('abastecimentos')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
      ]);

      if (v.data) setViagens(v.data as Viagem[]);
      if (d.data) setDespesas(d.data as Despesa[]);
      if (a.data) setAbastecimentos(a.data as Abastecimento[]);
      setDataLoading(false);
    }

    loadData();
  }, [userId]);

  const updateProfile = useCallback((p: UserProfile) => {
    setProfile(p);
  }, []);

  // Atualização otimista: atualiza estado local imediatamente e salva no Supabase em paralelo
  const addViagem = useCallback((v: Omit<Viagem, 'id' | 'created_at'>) => {
    const nova: Viagem = { ...v, id: generateId(), created_at: new Date().toISOString() };
    setViagens(prev => [nova, ...prev]);
    supabase
      .from('viagens')
      .insert({ ...nova, user_id: userId })
      .then(({ error }) => { if (error) console.error('Erro ao salvar viagem:', error); });
    return nova;
  }, [userId]);

  const updateViagem = useCallback((id: string, updates: Partial<Viagem>) => {
    setViagens(prev => prev.map(v => v.id === id ? { ...v, ...updates } : v));
    supabase
      .from('viagens')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .then(({ error }) => { if (error) console.error('Erro ao atualizar viagem:', error); });
  }, [userId]);

  const addDespesa = useCallback((d: Omit<Despesa, 'id' | 'created_at'>) => {
    const nova: Despesa = { ...d, id: generateId(), created_at: new Date().toISOString() };
    setDespesas(prev => [nova, ...prev]);
    supabase
      .from('despesas')
      .insert({ ...nova, user_id: userId })
      .then(({ error }) => { if (error) console.error('Erro ao salvar despesa:', error); });
    return nova;
  }, [userId]);

  const getDespesasViagem = useCallback((viagemId: string) => {
    return despesas.filter(d => d.viagem_id === viagemId);
  }, [despesas]);

  const addAbastecimento = useCallback((a: Omit<Abastecimento, 'id' | 'created_at' | 'media_calculada'>): Abastecimento => {
    const anterior = abastecimentos.length > 0 ? abastecimentos[0] : null;
    const media = anterior && a.hodometro > anterior.hodometro && a.litragem > 0
      ? (a.hodometro - anterior.hodometro) / a.litragem
      : 0;
    const novo: Abastecimento = { ...a, media_calculada: media, id: generateId(), created_at: new Date().toISOString() };
    setAbastecimentos(prev => [novo, ...prev]);
    supabase
      .from('abastecimentos')
      .insert({ ...novo, user_id: userId })
      .then(({ error }) => { if (error) console.error('Erro ao salvar abastecimento:', error); });
    return novo;
  }, [userId, abastecimentos]);

  const getViagemAtiva = useCallback(() => {
    return viagens.find(v => v.status === 'ativa') || null;
  }, [viagens]);

  return {
    viagens, despesas, abastecimentos, profile, dataLoading,
    updateProfile, addViagem, updateViagem,
    addDespesa, getDespesasViagem,
    addAbastecimento, getViagemAtiva,
  };
}
