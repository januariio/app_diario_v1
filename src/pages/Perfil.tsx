import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Truck, Phone, Mail, Gauge, Percent, Lock, Edit2, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function Perfil() {
  const { profile, updateProfile } = useAuth();

  const [editando, setEditando] = useState(false);
  const [senhaDialog, setSenhaDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [senha, setSenha] = useState('');

  const [form, setForm] = useState({
    nome: profile?.nome ?? '',
    whatsapp: profile?.whatsapp ?? '',
    modelo_caminhao: profile?.modelo_caminhao ?? '',
    media_km_litro: String(profile?.media_km_litro ?? '2.5'),
    comissao: profile?.comissao != null ? String(profile.comissao) : '',
    eixos: String(profile?.eixos ?? 6),
  });

  const update = (field: string, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handleEditarClick = () => {
    setForm({
      nome: profile?.nome ?? '',
      whatsapp: profile?.whatsapp ?? '',
      modelo_caminhao: profile?.modelo_caminhao ?? '',
      media_km_litro: String(profile?.media_km_litro ?? '2.5'),
      comissao: profile?.comissao != null ? String(profile.comissao) : '',
      eixos: String(profile?.eixos ?? 6),
    });
    setEditando(true);
  };

  const handleCancelar = () => {
    setEditando(false);
    setSenha('');
  };

  const handleSalvarClick = () => {
    if (!form.nome || !form.modelo_caminhao) {
      toast.error('Nome e modelo do caminhão são obrigatórios.');
      return;
    }
    setSenhaDialog(true);
  };

  const handleConfirmarSenha = async () => {
    if (!senha) {
      toast.error('Digite sua senha para confirmar.');
      return;
    }
    setLoading(true);
    const { error } = await updateProfile(
      {
        nome: form.nome,
        whatsapp: form.whatsapp,
        modelo_caminhao: form.modelo_caminhao,
        media_km_litro: parseFloat(form.media_km_litro) || 2.5,
        comissao: form.comissao ? parseFloat(form.comissao) : undefined,
        eixos: parseInt(form.eixos) || 6,
      },
      senha
    );
    setLoading(false);

    if (error) {
      toast.error(error);
    } else {
      toast.success('Perfil atualizado com sucesso!');
      setSenhaDialog(false);
      setSenha('');
      setEditando(false);
    }
  };

  if (!profile) return null;

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <User className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Meu Perfil</h1>
          <p className="text-sm text-muted-foreground">Suas informações cadastradas</p>
        </div>
      </div>

      {/* Informações — modo visualização */}
      {!editando && (
        <div className="space-y-3">
          <InfoRow icon={<User className="h-4 w-4" />} label="Nome" value={profile.nome} />
          <InfoRow icon={<Mail className="h-4 w-4" />} label="Email" value={profile.email ?? '—'} />
          <InfoRow icon={<Phone className="h-4 w-4" />} label="WhatsApp" value={profile.whatsapp || '—'} />
          <InfoRow icon={<Truck className="h-4 w-4" />} label="Modelo do Caminhão" value={profile.modelo_caminhao} />
          <InfoRow icon={<Gauge className="h-4 w-4" />} label="Média (km/L)" value={`${profile.media_km_litro} km/L`} />
          <InfoRow
            icon={<Percent className="h-4 w-4" />}
            label="Comissão"
            value={profile.comissao != null ? `${profile.comissao}%` : 'Não informada'}
          />
          <InfoRow
            icon={<Truck className="h-4 w-4" />}
            label="Eixos do Caminhão"
            value={`${profile.eixos ?? 6} eixos`}
          />

          <Button
            onClick={handleEditarClick}
            className="w-full h-12 text-base font-bold mt-4"
            variant="secondary"
          >
            <Edit2 className="mr-2 h-5 w-5" />
            Editar Informações
          </Button>
        </div>
      )}

      {/* Formulário de edição */}
      {editando && (
        <div className="space-y-4 animate-slide-up">
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-primary font-medium flex items-center gap-2">
            <Lock className="h-4 w-4 shrink-0" />
            A confirmação de senha será solicitada ao salvar.
          </div>

          <div>
            <Label>Nome *</Label>
            <Input value={form.nome} onChange={e => update('nome', e.target.value)} className="mt-1 h-12" />
          </div>
          <div>
            <Label>WhatsApp</Label>
            <Input
              type="tel"
              placeholder="(11) 99999-9999"
              value={form.whatsapp}
              onChange={e => update('whatsapp', e.target.value)}
              className="mt-1 h-12"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Modelo Caminhão *</Label>
              <Input value={form.modelo_caminhao} onChange={e => update('modelo_caminhao', e.target.value)} className="mt-1 h-12" />
            </div>
            <div>
              <Label>Média (km/L)</Label>
              <Input
                type="number"
                inputMode="decimal"
                value={form.media_km_litro}
                onChange={e => update('media_km_litro', e.target.value)}
                className="mt-1 h-12"
              />
            </div>
          </div>
          <div>
            <Label>Comissão (%) <span className="text-muted-foreground font-normal">— opcional</span></Label>
            <Input
              type="number"
              inputMode="decimal"
              placeholder="Ex: 10"
              value={form.comissao}
              onChange={e => update('comissao', e.target.value)}
              className="mt-1 h-12"
            />
          </div>
          <div>
            <Label>Quantidade de Eixos</Label>
            <select
              value={form.eixos}
              onChange={e => update('eixos', e.target.value)}
              className="mt-1 h-12 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {[2,3,4,5,6,7,8,9].map(n => (
                <option key={n} value={n}>{n} eixos</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-muted-foreground">Usado para calcular pedágio no simulador.</p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1 h-12" onClick={handleCancelar}>
              <X className="mr-2 h-4 w-4" /> Cancelar
            </Button>
            <Button className="flex-1 h-12 font-bold" onClick={handleSalvarClick}>
              <Check className="mr-2 h-4 w-4" /> Salvar
            </Button>
          </div>
        </div>
      )}

      {/* Dialog de confirmação de senha */}
      <Dialog open={senhaDialog} onOpenChange={(open) => { setSenhaDialog(open); if (!open) setSenha(''); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              Confirme sua senha
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Para salvar as alterações, confirme sua senha de acesso.
            </p>
            <div>
              <Label>Senha</Label>
              <Input
                type="password"
                placeholder="••••••"
                value={senha}
                onChange={e => setSenha(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleConfirmarSenha()}
                className="mt-1 h-12"
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1 h-12" onClick={() => { setSenhaDialog(false); setSenha(''); }}>
                Cancelar
              </Button>
              <Button className="flex-1 h-12 font-bold" onClick={handleConfirmarSenha} disabled={loading}>
                {loading ? 'Salvando...' : 'Confirmar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold text-foreground truncate">{value}</p>
      </div>
    </div>
  );
}
