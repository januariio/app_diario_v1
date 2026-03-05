import { useState, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/StoreContext';
import { formatCurrency } from '@/utils/calculadora';
import { CATEGORIAS_DESPESA, Abastecimento } from '@/types';
import { compressImage, shareViaWhatsApp } from '@/utils/abastecimento';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import StatCard from '@/components/StatCard';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft, Plus, MapPin, XCircle, CheckCircle,
  Camera, X, Info, Fuel, Share2, AlertTriangle,
} from 'lucide-react';

type EncerrarStep = 'confirm' | 'despesas';

export default function ViagemAtiva() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { viagens, updateViagem, addDespesa, getDespesasViagem, addAbastecimento, abastecimentos } = useAppStore();

  const viagem = viagens.find(v => v.id === id);
  const despesasViagem = useMemo(() => (id ? getDespesasViagem(id) : []), [id, getDespesasViagem]);
  const totalDespesas = despesasViagem.reduce((s, d) => s + d.valor, 0);

  // Dialog nova despesa (botão Adicionar normal)
  const [dialogOpen, setDialogOpen] = useState(false);

  // Dialog encerrar viagem (com etapas)
  const [encerrarOpen, setEncerrarOpen] = useState(false);
  const [encerrarStep, setEncerrarStep] = useState<EncerrarStep>('confirm');

  // Dialog compartilhar abastecimento
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [savedAbastecimento, setSavedAbastecimento] = useState<Abastecimento | null>(null);

  // Form de despesa (compartilhado entre dialog normal e dialog de encerramento)
  const [categoria, setCategoria] = useState('');
  const [valor, setValor] = useState('');
  const [obs, setObs] = useState('');
  const [fuelCidade, setFuelCidade] = useState('');
  const [fuelPreco, setFuelPreco] = useState('');
  const [fuelLitros, setFuelLitros] = useState('');
  const [fuelHodometro, setFuelHodometro] = useState('');
  const [fuelImagem, setFuelImagem] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputEncerrarRef = useRef<HTMLInputElement>(null);

  const isCombustivel = categoria === 'Combustível';
  const fuelPrecoNum = parseFloat(fuelPreco) || 0;
  const fuelLitrosNum = parseFloat(fuelLitros) || 0;
  const fuelHodometroNum = parseFloat(fuelHodometro) || 0;
  const fuelValorTotal = fuelPrecoNum * fuelLitrosNum;

  const anteriorAbast = abastecimentos.length > 0 ? abastecimentos[0] : null;
  const fuelPreviewMedia =
    anteriorAbast && fuelHodometroNum > anteriorAbast.hodometro && fuelLitrosNum > 0
      ? (fuelHodometroNum - anteriorAbast.hodometro) / fuelLitrosNum
      : 0;
  const isPrimeiroAbast = !anteriorAbast;

  if (!viagem) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <p>Viagem não encontrada</p>
        <Button variant="secondary" className="mt-4" onClick={() => navigate('/')}>Voltar</Button>
      </div>
    );
  }

  const lucroAtual = viagem.valor_frete - totalDespesas;
  const encerrada = viagem.status === 'encerrada' || viagem.status === 'cancelada';

  const resetForm = () => {
    setCategoria('');
    setValor('');
    setObs('');
    setFuelCidade('');
    setFuelPreco('');
    setFuelLitros('');
    setFuelHodometro('');
    setFuelImagem(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (fileInputEncerrarRef.current) fileInputEncerrarRef.current.value = '';
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      setFuelImagem(compressed);
    } catch {
      console.error('Erro ao processar imagem');
    }
  };

  // Salva a despesa atual do form (usado em ambos os dialogs)
  const handleAddDespesa = (onSuccess?: () => void) => {
    if (!id) return;

    if (isCombustivel) {
      if (!fuelCidade || !fuelPrecoNum || !fuelLitrosNum || !fuelHodometroNum) return;
      if (anteriorAbast && fuelHodometroNum <= anteriorAbast.hodometro) return;

      const record = addAbastecimento({
        cidade: fuelCidade,
        preco_diesel: fuelPrecoNum,
        hodometro: fuelHodometroNum,
        litragem: fuelLitrosNum,
        observacao: obs || undefined,
        imagem: fuelImagem || undefined,
      });

      addDespesa({
        viagem_id: id,
        categoria: 'Combustível',
        valor: fuelValorTotal,
        observacao: `${fuelCidade} — ${fuelLitrosNum.toFixed(0)}L × R$ ${fuelPrecoNum.toFixed(2)}/L`,
      });

      setSavedAbastecimento(record);
      resetForm();
      onSuccess?.();
      setShareDialogOpen(true);
    } else {
      if (!categoria || !valor) return;
      addDespesa({ viagem_id: id, categoria, valor: parseFloat(valor), observacao: obs || undefined });
      resetForm();
      onSuccess?.();
    }
  };

  const handleShareWhatsApp = async () => {
    if (!savedAbastecimento) return;
    await shareViaWhatsApp(savedAbastecimento);
  };

  const handleEncerrarConfirmar = () => {
    updateViagem(viagem.id, { status: 'encerrada', data_fim: new Date().toISOString() });
    setEncerrarOpen(false);
    navigate(`/relatorio/${viagem.id}`);
  };

  const handleCancelar = () => {
    updateViagem(viagem.id, { status: 'cancelada', data_fim: new Date().toISOString() });
    navigate('/');
  };

  const fuelFormValid = isCombustivel && fuelCidade && fuelPrecoNum > 0 && fuelLitrosNum > 0 && fuelHodometroNum > 0
    && (isPrimeiroAbast || fuelHodometroNum > anteriorAbast!.hodometro);
  const regularFormValid = !isCombustivel && categoria && valor;
  const canSave = fuelFormValid || regularFormValid;

  // Formulário de despesa reutilizável
  const DespesaForm = ({ fileRef }: { fileRef: React.RefObject<HTMLInputElement> }) => (
    <div className="space-y-3">
      <div>
        <Label>Categoria</Label>
        <Select value={categoria} onValueChange={(v) => { setCategoria(v); setValor(''); }}>
          <SelectTrigger className="mt-1 h-12">
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIAS_DESPESA.filter(c => c !== 'Comissão').map(c => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isCombustivel && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
          <div className="flex items-center gap-2 mb-2">
            <Fuel className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">Dados do abastecimento</span>
          </div>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Cidade</Label>
              <Input value={fuelCidade} onChange={e => setFuelCidade(e.target.value)} className="mt-1 h-10" placeholder="Ribeirão Preto" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Diesel (R$/L)</Label>
                <Input type="number" inputMode="decimal" value={fuelPreco} onChange={e => setFuelPreco(e.target.value)} className="mt-1 h-10" />
              </div>
              <div>
                <Label className="text-xs">Litros</Label>
                <Input type="number" inputMode="decimal" value={fuelLitros} onChange={e => setFuelLitros(e.target.value)} className="mt-1 h-10" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Hodômetro (km)</Label>
              <Input
                type="number"
                inputMode="numeric"
                value={fuelHodometro}
                onChange={e => setFuelHodometro(e.target.value)}
                className="mt-1 h-10"
                placeholder={anteriorAbast ? `Último: ${anteriorAbast.hodometro.toLocaleString('pt-BR')} km` : 'Ex: 150000'}
              />
            </div>
            {fuelValorTotal > 0 && (
              <div className="rounded-lg bg-card border border-border p-2 text-center">
                <span className="text-xs text-muted-foreground">Valor total</span>
                <p className="text-base font-bold">{formatCurrency(fuelValorTotal)}</p>
              </div>
            )}
            {isPrimeiroAbast && fuelHodometroNum > 0 && fuelLitrosNum > 0 && (
              <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-2 flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground">Primeiro abastecimento. A média será calculada no próximo.</p>
              </div>
            )}
            {!isPrimeiroAbast && fuelPreviewMedia > 0 && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-2 text-center">
                <span className="text-xs text-muted-foreground">Média calculada</span>
                <p className="text-lg font-bold text-primary">{fuelPreviewMedia.toFixed(2)} km/L</p>
                <span className="text-xs text-muted-foreground">
                  {(fuelHodometroNum - anteriorAbast!.hodometro).toLocaleString('pt-BR')} km percorridos
                </span>
              </div>
            )}
            {!isPrimeiroAbast && fuelHodometroNum > 0 && fuelHodometroNum <= anteriorAbast!.hodometro && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-2 flex items-start gap-2">
                <Info className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                <p className="text-xs text-destructive">O hodômetro deve ser maior que {anteriorAbast!.hodometro.toLocaleString('pt-BR')} km.</p>
              </div>
            )}
            <div>
              <Label className="text-xs">Comprovante (opcional)</Label>
              <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handleImageChange} className="hidden" />
              {!fuelImagem ? (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-3 text-xs text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
                >
                  <Camera className="h-4 w-4" />
                  Tirar foto ou escolher imagem
                </button>
              ) : (
                <div className="mt-1 relative">
                  <img src={fuelImagem} alt="Comprovante" className="w-full rounded-lg border border-border object-cover max-h-32" />
                  <button
                    type="button"
                    onClick={() => { setFuelImagem(null); if (fileRef.current) fileRef.current.value = ''; }}
                    className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {!isCombustivel && (
        <div>
          <Label>Valor (R$)</Label>
          <Input type="number" inputMode="decimal" value={valor} onChange={e => setValor(e.target.value)} className="mt-1 h-12 text-lg" />
        </div>
      )}

      <div>
        <Label>Observação (opcional)</Label>
        <Input value={obs} onChange={e => setObs(e.target.value)} className="mt-1 h-12" />
      </div>
    </div>
  );

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/')} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold">
          {encerrada ? 'Viagem Encerrada' : 'Viagem em Andamento'}
        </h1>
      </div>

      <div className="flex items-center gap-2 text-foreground">
        <MapPin className="h-4 w-4 text-primary" />
        <span className="font-semibold">{viagem.cidade_origem} → {viagem.cidade_destino}</span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <StatCard label="Frete" value={formatCurrency(viagem.valor_frete)} />
        <StatCard label="Despesas" value={formatCurrency(totalDespesas)} variant="destructive" />
        <StatCard label="Lucro" value={formatCurrency(lucroAtual)} variant={lucroAtual >= 0 ? 'success' : 'destructive'} />
      </div>

      {/* Despesas */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Despesas</h2>
          {!encerrada && (
            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-9">
                  <Plus className="mr-1 h-4 w-4" /> Adicionar
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Nova Despesa</DialogTitle>
                </DialogHeader>
                <DespesaForm fileRef={fileInputRef} />
                <Button
                  className="w-full h-12 text-base font-bold mt-2"
                  onClick={() => handleAddDespesa(() => setDialogOpen(false))}
                  disabled={!canSave}
                >
                  {isCombustivel ? 'Salvar Abastecimento' : 'Salvar Despesa'}
                </Button>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {despesasViagem.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma despesa registrada</p>
        ) : (
          <div className="space-y-2">
            {despesasViagem.map(d => (
              <div key={d.id} className="flex items-center justify-between rounded-lg bg-card border border-border p-3">
                <div>
                  <div className="flex items-center gap-1.5">
                    {d.categoria === 'Combustível' && <Fuel className="h-3.5 w-3.5 text-primary" />}
                    <p className="text-sm font-medium">{d.categoria}</p>
                  </div>
                  {d.observacao && <p className="text-xs text-muted-foreground">{d.observacao}</p>}
                </div>
                <span className="text-sm font-bold text-destructive">-{formatCurrency(d.valor)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dialog: Compartilhar abastecimento */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Fuel className="h-5 w-5 text-primary" />
              Abastecimento salvo!
            </DialogTitle>
          </DialogHeader>
          {savedAbastecimento && (
            <div className="space-y-3">
              <div className="rounded-lg border border-border bg-card p-3 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Cidade</span><span className="font-medium">{savedAbastecimento.cidade}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Diesel</span><span className="font-medium">R$ {savedAbastecimento.preco_diesel.toFixed(2)}/L</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Litros</span><span className="font-medium">{savedAbastecimento.litragem.toFixed(0)}L</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span className="font-bold">{formatCurrency(savedAbastecimento.preco_diesel * savedAbastecimento.litragem)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Hodômetro</span><span className="font-medium">{savedAbastecimento.hodometro.toLocaleString('pt-BR')} km</span></div>
                {savedAbastecimento.media_calculada > 0 && (
                  <div className="flex justify-between"><span className="text-muted-foreground">Média</span><span className="font-bold text-primary">{savedAbastecimento.media_calculada.toFixed(2)} km/L</span></div>
                )}
              </div>
              {savedAbastecimento.imagem && (
                <img src={savedAbastecimento.imagem} alt="Comprovante" className="w-full rounded-lg border border-border object-cover max-h-40" />
              )}
              <Button className="w-full h-12 text-base font-bold bg-green-600 hover:bg-green-700" onClick={handleShareWhatsApp}>
                <Share2 className="mr-2 h-5 w-5" /> Compartilhar no WhatsApp
              </Button>
              <Button variant="secondary" className="w-full h-10" onClick={() => setShareDialogOpen(false)}>
                Fechar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: Encerrar viagem */}
      <Dialog open={encerrarOpen} onOpenChange={(open) => {
        setEncerrarOpen(open);
        if (!open) { setEncerrarStep('confirm'); resetForm(); }
      }}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">

          {/* Etapa 1: Confirmar se quer adicionar despesas */}
          {encerrarStep === 'confirm' && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  Encerrar viagem
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-1">
                <div className="rounded-lg border border-border bg-secondary/30 p-3 text-sm space-y-1">
                  <p className="font-semibold text-foreground">{viagem.cidade_origem} → {viagem.cidade_destino}</p>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Frete</span>
                    <span className="font-medium text-foreground">{formatCurrency(viagem.valor_frete)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Despesas registradas</span>
                    <span className="font-medium text-foreground">{formatCurrency(totalDespesas)}</span>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                  <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-muted-foreground">
                    Deseja adicionar alguma despesa antes de encerrar a viagem?
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <Button
                    className="w-full h-12 font-bold"
                    onClick={() => { resetForm(); setEncerrarStep('despesas'); }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Sim, adicionar despesas
                  </Button>
                  <Button
                    variant="secondary"
                    className="w-full h-12"
                    onClick={handleEncerrarConfirmar}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Encerrar sem mais despesas
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* Etapa 2: Formulário de despesas + botão de encerrar fixo */}
          {encerrarStep === 'despesas' && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5 text-primary" />
                  Adicionar despesa
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <DespesaForm fileRef={fileInputEncerrarRef} />

                {/* Salvar despesa e continuar */}
                <Button
                  className="w-full h-12 text-base font-bold"
                  onClick={() => handleAddDespesa()}
                  disabled={!canSave}
                >
                  {isCombustivel ? 'Salvar Abastecimento' : 'Salvar Despesa'}
                </Button>

                {/* Divisor */}
                <div className="flex items-center gap-2 py-1">
                  <div className="flex-1 border-t border-border" />
                  <span className="text-xs text-muted-foreground">ou</span>
                  <div className="flex-1 border-t border-border" />
                </div>

                {/* Encerrar definitivo */}
                <Button
                  variant="secondary"
                  className="w-full h-12 font-semibold"
                  onClick={handleEncerrarConfirmar}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Encerrar viagem agora
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Ações */}
      {!encerrada && (
        <div className="flex gap-3 pt-2">
          <Button variant="secondary" className="flex-1 h-14 text-base" onClick={handleCancelar}>
            <XCircle className="mr-2 h-5 w-5" /> Cancelar
          </Button>
          <Button
            className="flex-1 h-14 text-base font-bold"
            onClick={() => { setEncerrarStep('confirm'); setEncerrarOpen(true); }}
          >
            <CheckCircle className="mr-2 h-5 w-5" /> Encerrar
          </Button>
        </div>
      )}
    </div>
  );
}
