import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/StoreContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Veiculo, TipoVeiculo } from '@/types';
import {
  Truck, Plus, ArrowLeft, User, Link, History,
  ChevronRight, CheckCircle, AlertCircle, Pencil,
} from 'lucide-react';
import { formatDate } from '@/utils/calculadora';
import { toast } from 'sonner';

type DialogTipo = 'cadastro' | 'vincular' | 'historico' | null;

export default function Veiculos() {
  const navigate = useNavigate();
  const { veiculos, addVeiculo, updateVeiculo, vincularMotorista, viagens, despesas } = useAppStore();

  const [dialogTipo, setDialogTipo] = useState<DialogTipo>(null);
  const [veiculoSelecionado, setVeiculoSelecionado] = useState<Veiculo | null>(null);
  const [loading, setLoading] = useState(false);
  const [driverAbastecimentos, setDriverAbastecimentos] = useState<any[]>([]);
  const [loadingAbast, setLoadingAbast] = useState(false);

  // Form cadastro
  const [form, setForm] = useState({
    modelo: '',
    placa: '',
    tipo: 'carreta' as TipoVeiculo,
    eixos: 6,
  });

  // Form vincular
  const [documento, setDocumento] = useState('');
  const [motoristaVinculado, setMotoristaVinculado] = useState<{ nome: string } | null>(null);

  const update = (field: string, value: any) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handleCadastrar = () => {
    if (!form.modelo || !form.placa) {
      toast.error('Preencha modelo e placa.');
      return;
    }
    addVeiculo({
      modelo: form.modelo,
      placa: form.placa.toUpperCase(),
      tipo: form.tipo,
      eixos: form.eixos,
    });
    setForm({ modelo: '', placa: '', tipo: 'carreta', eixos: 6 });
    setDialogTipo(null);
    toast.success('Veículo cadastrado!');
  };

  const handleVincular = async () => {
    if (!veiculoSelecionado || !documento.trim()) {
      toast.error('Informe o CPF/CNPJ do motorista.');
      return;
    }
    setLoading(true);
    const result = await vincularMotorista(veiculoSelecionado.id, documento.trim());
    setLoading(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      setMotoristaVinculado(result.motorista);
      toast.success(`Motorista ${result.motorista.nome} vinculado!`);
      setDocumento('');
      setTimeout(() => {
        setMotoristaVinculado(null);
        setDialogTipo(null);
      }, 2000);
    }
  };

  const handleOpenHistorico = async (v: Veiculo) => {
    setVeiculoSelecionado(v);
    setDriverAbastecimentos([]);
    setDialogTipo('historico');
    if (v.motorista_id) {
      setLoadingAbast(true);
      const { data } = await supabase
        .from('abastecimentos')
        .select('*')
        .eq('user_id', v.motorista_id)
        .order('created_at', { ascending: false })
        .limit(10);
      setDriverAbastecimentos(data ?? []);
      setLoadingAbast(false);
    }
  };

  const handleDesvincular = () => {
    if (!veiculoSelecionado) return;
    updateVeiculo(veiculoSelecionado.id, {
      motorista_documento: undefined,
      motorista_nome: undefined,
      motorista_id: undefined,
    });
    setVeiculoSelecionado(prev => prev ? { ...prev, motorista_nome: undefined, motorista_documento: undefined, motorista_id: undefined } : null);
    toast.success('Motorista desvinculado.');
  };

  // Histórico do veículo selecionado
  const historicoViagens = veiculoSelecionado
    ? viagens.filter(v => v.veiculo_id === veiculoSelecionado.id || v.status === 'encerrada')
    : [];

  const tipoLabel = (t: TipoVeiculo) => t === 'truck' ? 'Truck' : 'Carreta';

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Veículos</h1>
        <Button size="sm" className="h-9 gap-1.5" onClick={() => setDialogTipo('cadastro')}>
          <Plus className="h-4 w-4" /> Cadastrar
        </Button>
      </div>

      {/* Lista de veículos */}
      {veiculos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
          <Truck className="h-12 w-12 opacity-30" />
          <p className="text-sm">Nenhum veículo cadastrado ainda</p>
          <Button size="sm" onClick={() => setDialogTipo('cadastro')}>
            <Plus className="mr-1 h-4 w-4" /> Cadastrar primeiro veículo
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {veiculos.map(v => (
            <div key={v.id} className="rounded-xl border border-border bg-card overflow-hidden">
              {/* Header do veículo */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-secondary/20">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                  <Truck className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{v.modelo}</p>
                  <p className="text-xs text-muted-foreground">{v.placa} · {tipoLabel(v.tipo)} · {v.eixos} eixos</p>
                </div>
              </div>

              {/* Motorista vinculado */}
              <div className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                  {v.motorista_nome ? (
                    <div>
                      <span className="font-medium">{v.motorista_nome}</span>
                      <span className="text-xs text-muted-foreground ml-1">· {v.motorista_documento}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground italic">Sem motorista vinculado</span>
                  )}
                </div>
              </div>

              {/* Ações */}
              <div className="flex border-t border-border divide-x divide-border">
                <button
                  onClick={() => { setVeiculoSelecionado(v); setDocumento(v.motorista_documento ?? ''); setDialogTipo('vincular'); }}
                  className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                >
                  <Link className="h-3.5 w-3.5" />
                  {v.motorista_nome ? 'Alterar' : 'Vincular'} motorista
                </button>
                <button
                  onClick={() => handleOpenHistorico(v)}
                  className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                >
                  <History className="h-3.5 w-3.5" />
                  Histórico
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Dialog: Cadastrar veículo ── */}
      <Dialog open={dialogTipo === 'cadastro'} onOpenChange={o => !o && setDialogTipo(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" /> Cadastrar Veículo
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Modelo *</Label>
              <Input placeholder="Scania R450" value={form.modelo} onChange={e => update('modelo', e.target.value)} className="mt-1 h-12" />
            </div>
            <div>
              <Label>Placa *</Label>
              <Input placeholder="ABC-1234" value={form.placa} onChange={e => update('placa', e.target.value)} className="mt-1 h-12 uppercase" />
            </div>
            <div>
              <Label>Tipo</Label>
              <div className="mt-1 flex gap-2">
                {(['truck', 'carreta'] as TipoVeiculo[]).map(t => (
                  <button
                    key={t}
                    onClick={() => update('tipo', t)}
                    className={`flex-1 h-12 rounded-lg border text-sm font-semibold transition-colors ${
                      form.tipo === t
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card border-border text-muted-foreground hover:border-primary/50'
                    }`}
                  >
                    {t === 'truck' ? '🚛 Truck' : '🚚 Carreta'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Eixos</Label>
              <div className="mt-1 flex gap-1.5 flex-wrap">
                {[2,3,4,5,6,7,8,9].map(n => (
                  <button
                    key={n}
                    onClick={() => update('eixos', n)}
                    className={`flex-1 min-w-[40px] h-10 rounded-lg border text-sm font-bold transition-colors ${
                      form.eixos === n
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card border-border text-muted-foreground hover:border-primary/50'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <Button className="w-full h-12 font-bold mt-2" onClick={handleCadastrar}>
              <Plus className="mr-2 h-4 w-4" /> Cadastrar Veículo
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Vincular motorista ── */}
      <Dialog open={dialogTipo === 'vincular'} onOpenChange={o => !o && setDialogTipo(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              {veiculoSelecionado?.motorista_nome ? 'Alterar Motorista' : 'Vincular Motorista'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {veiculoSelecionado && (
              <div className="rounded-lg bg-secondary/30 border border-border px-3 py-2 text-sm">
                <span className="text-muted-foreground">Veículo: </span>
                <span className="font-semibold">{veiculoSelecionado.modelo} · {veiculoSelecionado.placa}</span>
              </div>
            )}

            {/* Motorista atual */}
            {veiculoSelecionado?.motorista_nome && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Motorista atual</p>
                  <p className="font-semibold text-sm">{veiculoSelecionado.motorista_nome}</p>
                  <p className="text-xs text-muted-foreground">{veiculoSelecionado.motorista_documento}</p>
                </div>
                <button
                  onClick={handleDesvincular}
                  className="text-xs text-destructive hover:underline"
                >
                  Desvincular
                </button>
              </div>
            )}

            {motoristaVinculado ? (
              <div className="flex flex-col items-center gap-2 py-4">
                <CheckCircle className="h-10 w-10 text-success" />
                <p className="font-semibold text-success">{motoristaVinculado.nome} vinculado!</p>
              </div>
            ) : (
              <>
                <div>
                  <Label>CPF / CNPJ do Motorista</Label>
                  <Input
                    placeholder="000.000.000-00"
                    value={documento}
                    onChange={e => setDocumento(e.target.value)}
                    className="mt-1 h-12"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    O motorista precisa estar cadastrado no app com este documento.
                  </p>
                </div>
                <Button className="w-full h-12 font-bold" onClick={handleVincular} disabled={loading}>
                  {loading ? 'Buscando...' : 'Vincular Motorista'}
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Histórico do veículo ── */}
      <Dialog open={dialogTipo === 'historico'} onOpenChange={o => !o && setDialogTipo(null)}>
        <DialogContent className="max-w-sm max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              {veiculoSelecionado?.modelo} · {veiculoSelecionado?.placa}
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 space-y-4 pr-1">
            {/* Abastecimentos do motorista vinculado */}
            {veiculoSelecionado?.motorista_id ? (
              <>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Motorista
                  </p>
                  <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    <span className="font-medium">{veiculoSelecionado.motorista_nome}</span>
                    <span className="text-muted-foreground">· {veiculoSelecionado.motorista_documento}</span>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Abastecimentos recentes
                  </p>
                  {loadingAbast ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Carregando...</p>
                  ) : driverAbastecimentos.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Nenhum abastecimento</p>
                  ) : (
                    <div className="space-y-2">
                      {driverAbastecimentos.map(a => (
                        <div key={a.id} className="rounded-lg border border-border bg-card p-3 text-sm">
                          <div className="flex justify-between">
                            <span className="font-medium">{a.cidade}</span>
                            <span className="text-muted-foreground">{formatDate(a.created_at)}</span>
                          </div>
                          <div className="flex justify-between text-xs text-muted-foreground mt-1">
                            <span>{a.litragem.toFixed(0)}L · R${a.preco_diesel.toFixed(2)}/L</span>
                            {a.media_calculada > 0 && (
                              <span className="text-primary font-medium">{a.media_calculada.toFixed(2)} km/L</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-3 py-8 text-muted-foreground">
                <AlertCircle className="h-8 w-8 opacity-50" />
                <p className="text-sm text-center">
                  Vincule um motorista para ver o histórico deste veículo
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
