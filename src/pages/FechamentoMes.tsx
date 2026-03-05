import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/StoreContext';
import { formatCurrency } from '@/utils/calculadora';
import StatCard from '@/components/StatCard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, TrendingUp } from 'lucide-react';

export default function FechamentoMes() {
  const navigate = useNavigate();
  const { viagens, despesas } = useAppStore();
  const [comissao, setComissao] = useState('10');

  const stats = useMemo(() => {
    const now = new Date();
    const mesAtual = now.getMonth();
    const anoAtual = now.getFullYear();

    const viagensMes = viagens.filter(v => {
      const d = new Date(v.data_inicio);
      return v.status === 'encerrada' && d.getMonth() === mesAtual && d.getFullYear() === anoAtual;
    });

    const totalFretes = viagensMes.reduce((s, v) => s + v.valor_frete, 0);
    const despesasMes = despesas.filter(d => viagensMes.some(v => v.id === d.viagem_id));
    const totalDespesas = despesasMes.reduce((s, d) => s + d.valor, 0);
    const pctComissao = parseFloat(comissao) || 0;
    const valorComissao = totalFretes * (pctComissao / 100);
    const resultado = totalFretes - totalDespesas - valorComissao;

    return { totalFretes, totalDespesas, valorComissao, resultado, qtdViagens: viagensMes.length };
  }, [viagens, despesas, comissao]);

  const mesNome = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date());

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/')} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold">Fechamento Mensal</h1>
      </div>

      <p className="text-sm text-muted-foreground capitalize">{mesNome} • {stats.qtdViagens} viagens</p>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Faturamento bruto" value={formatCurrency(stats.totalFretes)} />
        <StatCard label="Total despesas" value={formatCurrency(stats.totalDespesas)} variant="destructive" />
      </div>

      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <Label className="text-sm">Comissão (%)</Label>
        <Input
          type="number"
          inputMode="decimal"
          value={comissao}
          onChange={e => setComissao(e.target.value)}
          className="h-12 text-lg"
        />
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Valor comissão</span>
          <span className="font-medium text-destructive">-{formatCurrency(stats.valorComissao)}</span>
        </div>
      </div>

      <div className={`rounded-lg border p-5 text-center ${stats.resultado >= 0 ? 'border-success/40 bg-success/5' : 'border-destructive/40 bg-destructive/5'}`}>
        <TrendingUp className={`mx-auto h-6 w-6 mb-1 ${stats.resultado >= 0 ? 'text-success' : 'text-destructive'}`} />
        <p className="text-xs text-muted-foreground">Resultado líquido</p>
        <p className={`text-2xl font-black ${stats.resultado >= 0 ? 'text-success' : 'text-destructive'}`}>
          {formatCurrency(stats.resultado)}
        </p>
      </div>
    </div>
  );
}
