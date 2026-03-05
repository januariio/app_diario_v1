import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/StoreContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/utils/calculadora';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  TrendingUp, Package, DollarSign, Percent,
  ChevronRight, Share2, MapPin, Fuel, X,
} from 'lucide-react';
import { toast } from 'sonner';

type Periodo = 7 | 15 | 30;

function getDataLimite(dias: Periodo): Date {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDateBR(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

export default function Resumos() {
  const navigate = useNavigate();
  const { viagens, getDespesasViagem } = useAppStore();
  const { profile } = useAuth();
  const [periodo, setPeriodo] = useState<Periodo>(30);
  const [detalheOpen, setDetalheOpen] = useState(false);

  const comissaoPct = profile?.comissao ?? null;

  const dataLimite = useMemo(() => getDataLimite(periodo), [periodo]);

  // Filtra viagens encerradas no período
  const viagensPeriodo = useMemo(() => {
    return viagens.filter(v => {
      if (v.status !== 'encerrada') return false;
      const dataFim = new Date(v.data_fim ?? v.created_at);
      return dataFim >= dataLimite;
    });
  }, [viagens, dataLimite]);

  // Dados consolidados do período
  const resumo = useMemo(() => {
    let totalFrete = 0;
    let totalDespesas = 0;
    const detalhes = viagensPeriodo.map(v => {
      const despesas = getDespesasViagem(v.id);
      const totalDesp = despesas.reduce((s, d) => s + d.valor, 0);
      totalFrete += v.valor_frete;
      totalDespesas += totalDesp;
      return { viagem: v, despesas, totalDesp };
    });

    const comissao = comissaoPct != null ? totalFrete * (comissaoPct / 100) : null;
    const resultado = totalFrete - totalDespesas;

    return { totalFrete, totalDespesas, comissao, resultado, detalhes };
  }, [viagensPeriodo, getDespesasViagem, comissaoPct]);

  const handleCompartilhar = async () => {
    const linhas: string[] = [];
    linhas.push(`📊 *Resumo de Fretes — últimos ${periodo} dias*`);
    linhas.push('');
    linhas.push(`🚚 Fretes realizados: *${viagensPeriodo.length}*`);
    linhas.push(`💵 Total de fretes: *${formatCurrency(resumo.totalFrete)}*`);
    linhas.push(`🔻 Custos totais: *${formatCurrency(resumo.totalDespesas)}*`);
    if (resumo.comissao != null) {
      linhas.push(`📋 Comissão (${comissaoPct}%): *${formatCurrency(resumo.comissao)}*`);
    }
    linhas.push(`✅ Resultado: *${formatCurrency(resumo.resultado)}*`);

    if (resumo.detalhes.length > 0) {
      linhas.push('');
      linhas.push('─────────────────');
      resumo.detalhes.forEach(({ viagem: v, totalDesp }) => {
        linhas.push('');
        linhas.push(`📍 *${v.cidade_origem} → ${v.cidade_destino}*`);
        linhas.push(`   Frete: ${formatCurrency(v.valor_frete)} | Custos: ${formatCurrency(totalDesp)}`);
        if (comissaoPct != null) {
          linhas.push(`   Comissão: ${formatCurrency(v.valor_frete * (comissaoPct / 100))}`);
        }
      });
    }

    const texto = linhas.join('\n');
    const url = `https://wa.me/?text=${encodeURIComponent(texto)}`;

    if (navigator.share) {
      try {
        await navigator.share({ text: texto });
        return;
      } catch { /* fallback */ }
    }
    window.open(url, '_blank');
    toast.success('Abrindo WhatsApp...');
  };

  const periodos: Periodo[] = [7, 15, 30];

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Resumos</h1>
        <Button
          size="sm"
          variant="outline"
          className="h-9 gap-1.5"
          onClick={handleCompartilhar}
          disabled={viagensPeriodo.length === 0}
        >
          <Share2 className="h-4 w-4" />
          Compartilhar
        </Button>
      </div>

      {/* Seletor de período */}
      <div className="flex gap-2">
        {periodos.map(p => (
          <button
            key={p}
            onClick={() => setPeriodo(p)}
            className={`flex-1 h-10 rounded-lg border text-sm font-semibold transition-colors ${
              periodo === p
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card text-muted-foreground border-border hover:border-primary/50'
            }`}
          >
            {p} dias
          </button>
        ))}
      </div>

      {/* Cards de resumo */}
      {viagensPeriodo.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
          <Package className="h-12 w-12 opacity-30" />
          <p className="text-sm">Nenhuma viagem encerrada nos últimos {periodo} dias</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            {/* Total fretes */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <DollarSign className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium uppercase tracking-wider">Total Fretes</span>
              </div>
              <p className="text-xl font-bold">{formatCurrency(resumo.totalFrete)}</p>
              <p className="text-xs text-muted-foreground">{viagensPeriodo.length} viagem{viagensPeriodo.length !== 1 ? 's' : ''}</p>
            </div>

            {/* Custos */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <TrendingUp className="h-4 w-4 text-destructive" />
                <span className="text-xs font-medium uppercase tracking-wider">Custos</span>
              </div>
              <p className="text-xl font-bold text-destructive">{formatCurrency(resumo.totalDespesas)}</p>
              <p className="text-xs text-muted-foreground">despesas registradas</p>
            </div>

            {/* Comissão — só se tiver */}
            {resumo.comissao != null && (
              <div className="rounded-xl border border-border bg-card p-4 space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Percent className="h-4 w-4 text-amber-500" />
                  <span className="text-xs font-medium uppercase tracking-wider">Comissão ({comissaoPct}%)</span>
                </div>
                <p className="text-xl font-bold text-amber-500">{formatCurrency(resumo.comissao)}</p>
                <p className="text-xs text-muted-foreground">sobre total de fretes</p>
              </div>
            )}

            {/* Resultado */}
            <div className={`rounded-xl border p-4 space-y-1 ${
              resumo.resultado >= 0
                ? 'border-success/40 bg-success/5'
                : 'border-destructive/40 bg-destructive/5'
            }`}>
              <div className="flex items-center gap-2 text-muted-foreground">
                <TrendingUp className={`h-4 w-4 ${resumo.resultado >= 0 ? 'text-success' : 'text-destructive'}`} />
                <span className="text-xs font-medium uppercase tracking-wider">Resultado</span>
              </div>
              <p className={`text-xl font-bold ${resumo.resultado >= 0 ? 'text-success' : 'text-destructive'}`}>
                {formatCurrency(resumo.resultado)}
              </p>
              <p className="text-xs text-muted-foreground">frete − despesas</p>
            </div>
          </div>

          {/* Botão ver detalhes */}
          <button
            onClick={() => setDetalheOpen(true)}
            className="flex w-full items-center justify-between rounded-xl border border-border bg-card p-4 hover:border-primary/50 transition-colors"
          >
            <span className="text-sm font-semibold">Ver detalhes do período</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </>
      )}

      {/* Dialog: Detalhes do período */}
      <Dialog open={detalheOpen} onOpenChange={setDetalheOpen}>
        <DialogContent className="max-w-sm max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Detalhes — {periodo} dias</span>
            </DialogTitle>
          </DialogHeader>

          <div className="overflow-y-auto flex-1 space-y-4 pr-1">
            {/* Totais compactos */}
            <div className="rounded-lg border border-border bg-secondary/30 p-3 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total fretes</span>
                <span className="font-bold">{formatCurrency(resumo.totalFrete)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Custos totais</span>
                <span className="font-bold text-destructive">{formatCurrency(resumo.totalDespesas)}</span>
              </div>
              {resumo.comissao != null && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Comissão ({comissaoPct}%)</span>
                  <span className="font-bold text-amber-500">{formatCurrency(resumo.comissao)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-1.5">
                <span className="font-semibold">Resultado</span>
                <span className={`font-bold ${resumo.resultado >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {formatCurrency(resumo.resultado)}
                </span>
              </div>
            </div>

            {/* Lista de viagens */}
            <div className="space-y-3">
              {resumo.detalhes.map(({ viagem: v, despesas, totalDesp }) => {
                const comissaoViagem = comissaoPct != null ? v.valor_frete * (comissaoPct / 100) : null;
                return (
                  <div key={v.id} className="rounded-lg border border-border bg-card overflow-hidden">
                    {/* Header da viagem */}
                    <div className="flex items-center justify-between px-3 py-2.5 bg-secondary/30 border-b border-border">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="text-sm font-semibold">{v.cidade_origem} → {v.cidade_destino}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{formatDateBR(v.data_fim ?? v.created_at)}</span>
                    </div>

                    {/* Dados da viagem */}
                    <div className="p-3 space-y-1.5 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Frete</span>
                        <span className="font-semibold">{formatCurrency(v.valor_frete)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Distância</span>
                        <span>{v.distancia_km.toLocaleString('pt-BR')} km</span>
                      </div>
                      {comissaoViagem != null && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Comissão ({comissaoPct}%)</span>
                          <span className="text-amber-500 font-medium">{formatCurrency(comissaoViagem)}</span>
                        </div>
                      )}

                      {/* Despesas da viagem */}
                      {despesas.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-border space-y-1">
                          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Despesas</p>
                          {despesas.map(d => (
                            <div key={d.id} className="flex justify-between text-xs">
                              <span className="flex items-center gap-1 text-muted-foreground">
                                {d.categoria === 'Combustível' && <Fuel className="h-3 w-3" />}
                                {d.categoria}
                                {d.observacao && <span className="opacity-60">· {d.observacao.slice(0, 20)}</span>}
                              </span>
                              <span className="text-destructive font-medium">-{formatCurrency(d.valor)}</span>
                            </div>
                          ))}
                          <div className="flex justify-between text-xs font-semibold pt-1 border-t border-border">
                            <span>Total despesas</span>
                            <span className="text-destructive">-{formatCurrency(totalDesp)}</span>
                          </div>
                        </div>
                      )}

                      {/* Resultado da viagem */}
                      <div className="flex justify-between font-bold text-sm pt-1 border-t border-border">
                        <span>Resultado</span>
                        <span className={v.valor_frete - totalDesp >= 0 ? 'text-success' : 'text-destructive'}>
                          {formatCurrency(v.valor_frete - totalDesp)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Botão compartilhar dentro do dialog */}
          <div className="pt-3 border-t border-border">
            <Button
              className="w-full h-12 font-bold bg-green-600 hover:bg-green-700"
              onClick={() => { setDetalheOpen(false); setTimeout(handleCompartilhar, 200); }}
            >
              <Share2 className="mr-2 h-4 w-4" />
              Compartilhar no WhatsApp
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
