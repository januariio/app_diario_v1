import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/StoreContext';
import { formatCurrency, formatDate } from '@/utils/calculadora';
import { ArrowLeft, FileText } from 'lucide-react';
import { useMemo } from 'react';

export default function Historico() {
  const navigate = useNavigate();
  const { viagens, despesas } = useAppStore();

  const encerradas = useMemo(() =>
    viagens
      .filter(v => v.status === 'encerrada')
      .map(v => {
        const totalDesp = despesas.filter(d => d.viagem_id === v.id).reduce((s, d) => s + d.valor, 0);
        return { ...v, lucro: v.valor_frete - totalDesp };
      }),
    [viagens, despesas]
  );

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/')} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold">Histórico de Fretes</h1>
      </div>

      {encerradas.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-muted-foreground">
          <FileText className="h-10 w-10 mb-2 opacity-40" />
          <p className="text-sm">Nenhuma viagem encerrada</p>
        </div>
      ) : (
        <div className="space-y-2">
          {encerradas.map(v => (
            <button
              key={v.id}
              onClick={() => navigate(`/relatorio/${v.id}`)}
              className="w-full rounded-lg bg-card border border-border p-4 text-left transition-colors hover:border-primary/30"
            >
              <div className="flex items-center justify-between">
                <p className="font-medium text-foreground">
                  {v.cidade_origem} → {v.cidade_destino}
                </p>
                <span className="text-xs text-muted-foreground">{formatDate(v.data_inicio)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Frete: {formatCurrency(v.valor_frete)}</span>
                <span className={`font-bold ${v.lucro >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {formatCurrency(v.lucro)}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
