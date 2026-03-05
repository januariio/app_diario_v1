import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/store/StoreContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/utils/calculadora';
import StatCard from '@/components/StatCard';
import { Truck, PlusCircle, Fuel, History, BarChart3, MapPin, LogOut, AlertCircle, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMemo, useState, useEffect } from 'react';

const PERIOD_OPTIONS = [
  { label: '7 Dias', days: 7 },
  { label: '15 Dias', days: 15 },
  { label: '30 Dias', days: 30 },
] as const;

export default function Dashboard() {
  const navigate = useNavigate();
  const { profile: localProfile, viagens, despesas, veiculos } = useAppStore();
  const { profile: authProfile, signOut, refreshProfile } = useAuth();
  const profile = authProfile ?? localProfile;

  const isMotorista = profile?.tipo_perfil === 'motorista';
  const semVeiculo = isMotorista && (!profile?.modelo_caminhao || profile?.modelo_caminhao === 'Não informado');

  const [periodDays, setPeriodDays] = useState<number>(30);
  const [aceitando, setAceitando] = useState(false);
  const [verificando, setVerificando] = useState(false);
  const [frotaViagens, setFrotaViagens] = useState<any[]>([]);
  const [frotaDespesas, setFrotaDespesas] = useState<any[]>([]);
  const [frotaLoading, setFrotaLoading] = useState(false);

  const viagemAtiva = viagens.find(v => v.status === 'ativa');

  // Carrega dados dos motoristas da frota
  useEffect(() => {
    if (isMotorista) return;

    const motoristaIds = veiculos.map(v => v.motorista_id).filter(Boolean) as string[];
    if (motoristaIds.length === 0) return;

    setFrotaLoading(true);
    Promise.all([
      supabase.from('viagens').select('*').in('user_id', motoristaIds),
      supabase.from('despesas').select('*').in('user_id', motoristaIds),
    ]).then(([v, d]) => {
      setFrotaViagens(v.data ?? []);
      setFrotaDespesas(d.data ?? []);
      setFrotaLoading(false);
    });
  }, [veiculos, isMotorista]);

  const stats = useMemo(() => {
    const cutoff = new Date(Date.now() - periodDays * 86400000);
    const todasViagens = isMotorista ? viagens : [...viagens, ...frotaViagens];
    const todasDespesas = isMotorista ? despesas : [...despesas, ...frotaDespesas];
    const recentes = todasViagens.filter(v => v.status === 'encerrada' && new Date(v.created_at) >= cutoff);
    const totalFretes = recentes.reduce((s, v) => s + v.valor_frete, 0);
    const despesasRecentes = todasDespesas.filter(d => recentes.some(v => v.id === d.viagem_id));
    const totalDespesas = despesasRecentes.reduce((s, d) => s + d.valor, 0);
    const porVeiculo = veiculos.map(vei => {
      const veiViagens = recentes.filter(v => v.user_id === vei.motorista_id);
      const veiFrete = veiViagens.reduce((s, v) => s + v.valor_frete, 0);
      const veiDesp = todasDespesas.filter(d => veiViagens.some(v => v.id === d.viagem_id)).reduce((s, d) => s + d.valor, 0);
      return { veiculo: vei, totalFrete: veiFrete, totalDesp: veiDesp, qtd: veiViagens.length };
    });
    return { totalFretes, totalDespesas, faturado: totalFretes - totalDespesas, qtdViagens: recentes.length, porVeiculo };
  }, [viagens, despesas, frotaViagens, frotaDespesas, periodDays, isMotorista, veiculos]);

  // Busca veículo pelo CPF do motorista e atualiza o próprio perfil
  const buscarEVincularVeiculo = async () => {
    if (!profile?.documento || !profile?.id) return null;
    const docLimpo = profile.documento.replace(/[\.\-\/]/g, '').trim();
    const { data: todosVeiculos } = await supabase.from('veiculos').select('*');
    const veiculo = (todosVeiculos ?? []).find(v => {
      const docV = (v.motorista_documento ?? '').replace(/[\.\-\/]/g, '').trim();
      return docV === docLimpo;
    });
    if (!veiculo) return null;
    await supabase.from('profiles').update({
      modelo_caminhao: veiculo.modelo,
      eixos: veiculo.eixos,
      veiculo_pendente: true,
      veiculo_modelo: veiculo.modelo,
      veiculo_placa: veiculo.placa,
    }).eq('id', profile.id);
    return veiculo;
  };

  const handleVerificar = async () => {
    setVerificando(true);
    const veiculo = await buscarEVincularVeiculo();
    if (!veiculo) toast.error('Nenhum veículo vinculado ao seu CPF/CNPJ ainda.');
    await refreshProfile();
    setVerificando(false);
  };

  const handleAceitarVeiculo = async () => {
    if (!profile?.id) return;
    setAceitando(true);
    await buscarEVincularVeiculo();
    await supabase.from('profiles').update({ veiculo_pendente: false }).eq('id', profile.id);
    await refreshProfile();
    setAceitando(false);
  };

  // Tela de bloqueio motorista sem veículo
  if (semVeiculo) {
    const temPendente = profile?.veiculo_pendente;
    return (
      <div className="flex min-h-[80vh] flex-col items-center justify-center px-4 animate-slide-up">
        <div className="w-full max-w-sm space-y-5">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className={`flex h-20 w-20 items-center justify-center rounded-full ${temPendente ? 'bg-primary/10' : 'bg-amber-500/10'}`}>
              <Truck className={`h-10 w-10 ${temPendente ? 'text-primary' : 'text-amber-500'}`} />
            </div>
            <h1 className="text-xl font-bold">{temPendente ? 'Veículo disponível!' : 'Veículo não vinculado'}</h1>
            <p className="text-sm text-muted-foreground">
              {temPendente
                ? 'O frotista vinculou um veículo ao seu perfil. Aceite para liberar o acesso.'
                : 'Seu perfil ainda não tem um caminhão. O acesso será liberado quando o frotista vincular seu veículo.'}
            </p>
          </div>

          {temPendente ? (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-4">
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Modelo</span>
                  <span className="font-bold">{profile?.veiculo_modelo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Placa</span>
                  <span className="font-bold">{profile?.veiculo_placa}</span>
                </div>
              </div>
              <Button className="w-full h-12 font-bold" onClick={handleAceitarVeiculo} disabled={aceitando}>
                {aceitando ? 'Aceitando...' : '✅ Aceitar veículo e entrar'}
              </Button>
            </div>
          ) : (
            <>
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                  <p className="text-sm font-semibold">O que fazer?</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  Envie seu <strong className="text-foreground">CPF ou CNPJ</strong> para o frotista e peça para vincular seu veículo.
                </p>
                {profile?.documento && (
                  <div className="rounded-lg bg-card border border-border p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Seu documento</p>
                    <p className="text-lg font-bold tracking-wider">{profile.documento}</p>
                  </div>
                )}
              </div>
              <Button variant="secondary" className="w-full h-12" onClick={handleVerificar} disabled={verificando}>
                {verificando ? 'Verificando...' : '🔄 Verificar vinculação'}
              </Button>
            </>
          )}

          <div className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
            <div>
              <p className="text-sm font-semibold">{profile?.nome}</p>
              <p className="text-xs text-muted-foreground">{profile?.email}</p>
            </div>
            <button onClick={signOut} className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs text-muted-foreground hover:bg-secondary transition-colors">
              <LogOut className="h-4 w-4" /> Sair
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Truck className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{profile?.nome}</h1>
          <p className="text-sm text-muted-foreground">
            {isMotorista ? `${profile?.modelo_caminhao} • ${profile?.media_km_litro} km/l` : 'Gestor de frota'}
          </p>
        </div>
        <button onClick={signOut} className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary transition-colors">
          <LogOut className="h-5 w-5" />
        </button>
      </div>

      {/* Viagem ativa */}
      {viagemAtiva && (
        <button onClick={() => navigate(`/viagem/${viagemAtiva.id}`)} className="w-full rounded-lg border border-primary/40 bg-primary/5 p-4 text-left hover:bg-primary/10 transition-colors">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <MapPin className="h-4 w-4" /> Viagem em andamento
          </div>
          <p className="mt-1 font-medium">{viagemAtiva.cidade_origem} → {viagemAtiva.cidade_destino}</p>
          <p className="text-sm text-muted-foreground">Frete: {formatCurrency(viagemAtiva.valor_frete)}</p>
        </button>
      )}

      {/* Stats */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Últimos {periodDays} dias</h2>
          <div className="flex rounded-lg border border-border overflow-hidden">
            {PERIOD_OPTIONS.map(opt => (
              <button key={opt.days} onClick={() => setPeriodDays(opt.days)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${periodDays === opt.days ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-secondary'}`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Total de Fretes" value={formatCurrency(stats.totalFretes)} />
          <StatCard label="Despesas" value={formatCurrency(stats.totalDespesas)} variant="destructive" />
          <StatCard label="Faturado" value={formatCurrency(stats.faturado)} variant={stats.faturado >= 0 ? 'success' : 'destructive'} />
          <StatCard label="Viagens" value={String(stats.qtdViagens)} />
        </div>
      </div>

      {/* Ações rápidas */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Ações rápidas</h2>
        <div className="grid grid-cols-2 gap-3">
          <Button onClick={() => navigate('/nova-viagem')} className="h-16 flex-col gap-1 text-sm font-semibold" size="lg">
            <PlusCircle className="h-5 w-5" /> Nova Viagem
          </Button>
          {!isMotorista && (
            <Button onClick={() => navigate('/veiculos')} variant="secondary" className="h-16 flex-col gap-1 text-sm font-semibold" size="lg">
              <Truck className="h-5 w-5" /> Veículos
            </Button>
          )}
          <Button onClick={() => navigate('/abastecimento')} variant="secondary" className="h-16 flex-col gap-1 text-sm font-semibold" size="lg">
            <Fuel className="h-5 w-5" /> Abastecimento
          </Button>
          <Button onClick={() => navigate('/historico')} variant="secondary" className="h-16 flex-col gap-1 text-sm font-semibold" size="lg">
            <History className="h-5 w-5" /> Histórico
          </Button>
          <Button onClick={() => navigate('/resumos')} variant="secondary" className="h-16 flex-col gap-1 text-sm font-semibold" size="lg">
            <BarChart3 className="h-5 w-5" /> Resumos
          </Button>
        </div>
      </div>

      {/* Frota: veículos com stats */}
      {!isMotorista && veiculos.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Users className="h-4 w-4" /> Frota — últimos {periodDays} dias
          </h2>
          {frotaLoading && <p className="text-xs text-muted-foreground text-center py-2">Carregando dados da frota...</p>}
          <div className="space-y-2">
            {stats.porVeiculo.map(({ veiculo: v, totalFrete, totalDesp, qtd }) => (
              <button key={v.id} onClick={() => navigate('/veiculos')}
                className="w-full rounded-xl border border-border bg-card overflow-hidden hover:border-primary/50 transition-colors text-left">
                <div className="flex items-center gap-3 px-3 py-2.5 border-b border-border bg-secondary/20">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 shrink-0">
                    <Truck className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{v.modelo} · {v.placa}</p>
                    <p className="text-xs text-muted-foreground">{v.motorista_nome ?? 'Sem motorista'}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${v.motorista_nome ? 'bg-green-500/10 text-green-600' : 'bg-secondary text-muted-foreground'}`}>
                    {v.motorista_nome ? 'Ativo' : 'Livre'}
                  </span>
                </div>
                {v.motorista_id && (
                  <div className="grid grid-cols-3 divide-x divide-border">
                    <div className="px-3 py-2 text-center">
                      <p className="text-xs text-muted-foreground">Fretes</p>
                      <p className="text-sm font-bold">{qtd}</p>
                    </div>
                    <div className="px-3 py-2 text-center">
                      <p className="text-xs text-muted-foreground">Receita</p>
                      <p className="text-sm font-bold">{formatCurrency(totalFrete)}</p>
                    </div>
                    <div className="px-3 py-2 text-center">
                      <p className="text-xs text-muted-foreground">Resultado</p>
                      <p className={`text-sm font-bold ${(totalFrete - totalDesp) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {formatCurrency(totalFrete - totalDesp)}
                      </p>
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
