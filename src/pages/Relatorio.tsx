import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/StoreContext';
import { formatCurrency, formatDate, calcularLucroLiquido } from '@/utils/calculadora';
import { Button } from '@/components/ui/button';
import StatCard from '@/components/StatCard';
import { ArrowLeft, MapPin, Share2 } from 'lucide-react';
import { useMemo } from 'react';
import { toast } from 'sonner';

export default function Relatorio() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { viagens, getDespesasViagem } = useAppStore();

  const viagem = viagens.find(v => v.id === id);
  const despesas = useMemo(() => (id ? getDespesasViagem(id) : []), [id, getDespesasViagem]);
  const totalDespesas = despesas.reduce((s, d) => s + d.valor, 0);

  if (!viagem) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <p>Viagem não encontrada</p>
        <Button variant="secondary" className="mt-4" onClick={() => navigate('/')}>Voltar</Button>
      </div>
    );
  }

  const lucro = calcularLucroLiquido(viagem.valor_frete, totalDespesas);

  const handleShare = () => {
    const text = `📋 Relatório - Diário de Bordo\n\n🚛 ${viagem.cidade_origem} → ${viagem.cidade_destino}\n📅 ${formatDate(viagem.data_inicio)}${viagem.data_fim ? ' - ' + formatDate(viagem.data_fim) : ''}\n💰 Frete: ${formatCurrency(viagem.valor_frete)}\n📊 Despesas: ${formatCurrency(totalDespesas)}\n${lucro >= 0 ? '✅' : '❌'} Lucro: ${formatCurrency(lucro)}`;
    
    if (navigator.share) {
      navigator.share({ title: 'Relatório da Viagem', text });
    } else {
      navigator.clipboard.writeText(text);
      toast.success('Relatório copiado!');
    }
  };

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold">Relatório da Viagem</h1>
      </div>

      <div className="flex items-center gap-2 text-foreground">
        <MapPin className="h-4 w-4 text-primary" />
        <span className="font-semibold">{viagem.cidade_origem} → {viagem.cidade_destino}</span>
      </div>

      <div className="text-sm text-muted-foreground">
        {formatDate(viagem.data_inicio)}
        {viagem.data_fim && ` — ${formatDate(viagem.data_fim)}`}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <StatCard label="Frete" value={formatCurrency(viagem.valor_frete)} />
        <StatCard label="Despesas" value={formatCurrency(totalDespesas)} variant="destructive" />
        <StatCard label="Lucro" value={formatCurrency(lucro)} variant={lucro >= 0 ? 'success' : 'destructive'} />
      </div>

      {/* Lista de despesas */}
      <div>
        <h2 className="mb-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">Despesas detalhadas</h2>
        {despesas.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Sem despesas registradas</p>
        ) : (
          <div className="space-y-2">
            {despesas.map(d => (
              <div key={d.id} className="flex items-center justify-between rounded-lg bg-card border border-border p-3">
                <div>
                  <p className="text-sm font-medium">{d.categoria}</p>
                  {d.observacao && <p className="text-xs text-muted-foreground">{d.observacao}</p>}
                </div>
                <span className="text-sm font-bold text-destructive">-{formatCurrency(d.valor)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-3 pt-2">
        <Button variant="secondary" className="flex-1 h-14 text-base" onClick={() => navigate('/')}>
          Voltar
        </Button>
        <Button className="flex-1 h-14 text-base font-bold" onClick={handleShare}>
          <Share2 className="mr-2 h-5 w-5" /> Compartilhar
        </Button>
      </div>
    </div>
  );
}
