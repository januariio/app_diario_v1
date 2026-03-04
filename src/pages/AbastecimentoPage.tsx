import { useState, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/StoreContext';
import { formatCurrency, formatDate } from '@/utils/calculadora';
import { Abastecimento } from '@/types';
import { compressImage, shareViaWhatsApp } from '@/utils/abastecimento';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import StatCard from '@/components/StatCard';
import { ArrowLeft, Plus, Fuel, Info, Camera, X, Share2, ImageIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const PERIOD_OPTIONS = [
  { label: '7 Dias', days: 7 },
  { label: '15 Dias', days: 15 },
  { label: '30 Dias', days: 30 },
] as const;

export default function AbastecimentoPage() {
  const navigate = useNavigate();
  const { abastecimentos, addAbastecimento } = useAppStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [savedRecord, setSavedRecord] = useState<Abastecimento | null>(null);
  const [periodDays, setPeriodDays] = useState<number>(30);
  const [imagemPreview, setImagemPreview] = useState<string | null>(null);
  const [previewRecord, setPreviewRecord] = useState<Abastecimento | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    cidade: '',
    preco_diesel: '',
    hodometro: '',
    litragem: '',
    observacao: '',
  });

  const update = (field: string, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const hodometroAtual = parseFloat(form.hodometro) || 0;
  const litragem = parseFloat(form.litragem) || 0;

  const anterior = abastecimentos.length > 0 ? abastecimentos[0] : null;
  const previewMedia =
    anterior && hodometroAtual > anterior.hodometro && litragem > 0
      ? (hodometroAtual - anterior.hodometro) / litragem
      : 0;
  const isPrimeiroAbastecimento = !anterior;

  const resetForm = useCallback(() => {
    setForm({ cidade: '', preco_diesel: '', hodometro: '', litragem: '', observacao: '' });
    setImagemPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      setImagemPreview(compressed);
    } catch {
      console.error('Erro ao processar imagem');
    }
  };

  const handleRemoveImage = () => {
    setImagemPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = () => {
    if (!form.cidade || !form.preco_diesel || !litragem || !hodometroAtual) return;
    if (anterior && hodometroAtual <= anterior.hodometro) return;
    const record = addAbastecimento({
      cidade: form.cidade,
      preco_diesel: parseFloat(form.preco_diesel),
      hodometro: hodometroAtual,
      litragem,
      observacao: form.observacao || undefined,
      imagem: imagemPreview || undefined,
    });
    setSavedRecord(record);
    resetForm();
    setDialogOpen(false);
    setShareDialogOpen(true);
  };

  const handleShareWhatsApp = async () => {
    if (!savedRecord) return;
    await shareViaWhatsApp(savedRecord);
  };

  const handleViewImage = (a: Abastecimento) => {
    setPreviewRecord(a);
  };

  const ultimaMedia = useMemo(() => {
    const comMedia = abastecimentos.find(a => a.media_calculada > 0);
    return comMedia ? comMedia.media_calculada : 0;
  }, [abastecimentos]);

  const stats = useMemo(() => {
    const now = new Date();
    const cutoff = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
    const recentes = abastecimentos.filter(a => new Date(a.created_at) >= cutoff);
    const custoTotal = recentes.reduce((s, a) => s + a.preco_diesel * a.litragem, 0);
    return { custoTotal, count: recentes.length };
  }, [abastecimentos, periodDays]);

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold">Abastecimento</h1>
        </div>

        {/* Dialog: Novo Abastecimento */}
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-9">
              <Plus className="mr-1 h-4 w-4" /> Novo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Novo Abastecimento</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Cidade</Label>
                <Input
                  value={form.cidade}
                  onChange={e => update('cidade', e.target.value)}
                  className="mt-1 h-12"
                  placeholder="Ribeirão Preto"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Diesel (R$/L)</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={form.preco_diesel}
                    onChange={e => update('preco_diesel', e.target.value)}
                    className="mt-1 h-12"
                  />
                </div>
                <div>
                  <Label>Litros</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={form.litragem}
                    onChange={e => update('litragem', e.target.value)}
                    className="mt-1 h-12"
                  />
                </div>
              </div>
              <div>
                <Label>Hodômetro (km)</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  value={form.hodometro}
                  onChange={e => update('hodometro', e.target.value)}
                  className="mt-1 h-12"
                  placeholder={anterior ? `Último: ${anterior.hodometro.toLocaleString('pt-BR')} km` : 'Ex: 150000'}
                />
              </div>

              {isPrimeiroAbastecimento && hodometroAtual > 0 && litragem > 0 && (
                <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-3 flex items-start gap-2">
                  <Info className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    Primeiro abastecimento registrado. A média km/L será calculada a partir do próximo.
                  </p>
                </div>
              )}

              {!isPrimeiroAbastecimento && previewMedia > 0 && (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-center">
                  <span className="text-xs text-muted-foreground">Média calculada</span>
                  <p className="text-lg font-bold text-primary">{previewMedia.toFixed(2)} km/L</p>
                  <span className="text-xs text-muted-foreground">
                    {(hodometroAtual - anterior!.hodometro).toLocaleString('pt-BR')} km percorridos
                  </span>
                </div>
              )}

              {!isPrimeiroAbastecimento && hodometroAtual > 0 && hodometroAtual <= anterior!.hodometro && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 flex items-start gap-2">
                  <Info className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                  <p className="text-xs text-destructive">
                    O hodômetro deve ser maior que o último registro ({anterior!.hodometro.toLocaleString('pt-BR')} km).
                  </p>
                </div>
              )}

              {/* Upload de imagem */}
              <div>
                <Label>Comprovante (opcional)</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleImageChange}
                  className="hidden"
                />
                {!imagemPreview ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-4 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                  >
                    <Camera className="h-5 w-5" />
                    Tirar foto ou escolher imagem
                  </button>
                ) : (
                  <div className="mt-1 relative">
                    <img
                      src={imagemPreview}
                      alt="Comprovante"
                      className="w-full rounded-lg border border-border object-cover max-h-48"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              <div>
                <Label>Observação (opcional)</Label>
                <Input
                  value={form.observacao}
                  onChange={e => update('observacao', e.target.value)}
                  className="mt-1 h-12"
                />
              </div>
              <Button
                className="w-full h-12 text-base font-bold"
                onClick={handleSave}
                disabled={
                  !form.cidade ||
                  !form.preco_diesel ||
                  !litragem ||
                  !hodometroAtual ||
                  (!isPrimeiroAbastecimento && hodometroAtual <= anterior!.hodometro)
                }
              >
                Salvar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Dialog: Compartilhar após salvar */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Fuel className="h-5 w-5 text-primary" />
              Abastecimento salvo!
            </DialogTitle>
          </DialogHeader>
          {savedRecord && (
            <div className="space-y-3">
              <div className="rounded-lg border border-border bg-card p-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cidade</span>
                  <span className="font-medium">{savedRecord.cidade}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Diesel</span>
                  <span className="font-medium">R$ {savedRecord.preco_diesel.toFixed(2)}/L</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Litros</span>
                  <span className="font-medium">{savedRecord.litragem.toFixed(0)}L</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-bold">{formatCurrency(savedRecord.preco_diesel * savedRecord.litragem)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Hodômetro</span>
                  <span className="font-medium">{savedRecord.hodometro.toLocaleString('pt-BR')} km</span>
                </div>
                {savedRecord.media_calculada > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Média</span>
                    <span className="font-bold text-primary">{savedRecord.media_calculada.toFixed(2)} km/L</span>
                  </div>
                )}
              </div>
              {savedRecord.imagem && (
                <img src={savedRecord.imagem} alt="Comprovante" className="w-full rounded-lg border border-border object-cover max-h-40" />
              )}
              <Button
                className="w-full h-12 text-base font-bold bg-green-600 hover:bg-green-700"
                onClick={handleShareWhatsApp}
              >
                <Share2 className="mr-2 h-5 w-5" />
                Compartilhar no WhatsApp
              </Button>
              <Button
                variant="secondary"
                className="w-full h-10"
                onClick={() => setShareDialogOpen(false)}
              >
                Fechar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: Preview de imagem */}
      <Dialog open={!!previewRecord} onOpenChange={(open) => { if (!open) setPreviewRecord(null); }}>
        <DialogContent className="max-w-md p-2">
          {previewRecord?.imagem && (
            <img src={previewRecord.imagem} alt="Comprovante" className="w-full rounded-lg" />
          )}
        </DialogContent>
      </Dialog>

      {/* Dashboard de média */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-center">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Média atual (último abastecimento)
        </span>
        <p className="mt-1 text-3xl font-bold text-primary">
          {ultimaMedia > 0 ? `${ultimaMedia.toFixed(2)} km/L` : '--'}
        </p>
        {ultimaMedia === 0 && abastecimentos.length > 0 && (
          <p className="mt-1 text-xs text-muted-foreground">
            Registre mais um abastecimento para calcular a média
          </p>
        )}
        {abastecimentos.length === 0 && (
          <p className="mt-1 text-xs text-muted-foreground">
            Nenhum abastecimento registrado ainda
          </p>
        )}
      </div>

      {/* Stats com filtro de período */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Últimos {periodDays} dias
          </h2>
          <div className="flex rounded-lg border border-border overflow-hidden">
            {PERIOD_OPTIONS.map(opt => (
              <button
                key={opt.days}
                onClick={() => setPeriodDays(opt.days)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  periodDays === opt.days
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card text-muted-foreground hover:bg-secondary'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Custo combustível" value={formatCurrency(stats.custoTotal)} variant="destructive" />
          <StatCard label="Abastecimentos" value={String(stats.count)} />
        </div>
      </div>

      {/* Histórico */}
      <div>
        <h2 className="mb-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Histórico de abastecimentos
        </h2>
        {abastecimentos.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-muted-foreground">
            <Fuel className="h-10 w-10 mb-2 opacity-40" />
            <p className="text-sm">Nenhum abastecimento registrado</p>
          </div>
        ) : (
          <div className="space-y-2">
            {abastecimentos.map(a => (
              <div key={a.id} className="rounded-lg bg-card border border-border p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{a.cidade}</p>
                  <div className="flex items-center gap-2">
                    {a.imagem && (
                      <button
                        onClick={() => handleViewImage(a)}
                        className="text-primary hover:text-primary/80 transition-colors"
                        title="Ver comprovante"
                      >
                        <ImageIcon className="h-4 w-4" />
                      </button>
                    )}
                    <span className="text-xs text-muted-foreground">{formatDate(a.created_at)}</span>
                  </div>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span>R$ {a.preco_diesel.toFixed(2)}/L</span>
                  <span>{a.litragem.toFixed(0)}L</span>
                  <span>{a.hodometro.toLocaleString('pt-BR')} km</span>
                  {a.media_calculada > 0 ? (
                    <span className="text-primary font-medium">{a.media_calculada.toFixed(2)} km/L</span>
                  ) : (
                    <span className="italic">1º registro</span>
                  )}
                </div>
                {a.observacao && (
                  <p className="mt-1 text-xs text-muted-foreground/70 italic">{a.observacao}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
