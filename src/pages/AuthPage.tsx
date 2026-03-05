import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Truck, LogIn, UserPlus, Mail, ChevronLeft, Users } from 'lucide-react';
import { toast } from 'sonner';
import { TipoPerfil } from '@/types';

type Tab = 'login' | 'tipo' | 'cadastro';

export default function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [tab, setTab] = useState<Tab>('login');
  const [loading, setLoading] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null);
  const [tipoPerfil, setTipoPerfil] = useState<TipoPerfil | null>(null);

  const [loginForm, setLoginForm] = useState({ email: '', senha: '' });
  const [cadastroForm, setCadastroForm] = useState({
    nome: '',
    email: '',
    senha: '',
    whatsapp: '',
    documento: '',
    comissao: '',
  });

  const handleLogin = async () => {
    if (!loginForm.email || !loginForm.senha) {
      toast.error('Preencha email e senha.');
      return;
    }
    setLoading(true);
    const { error } = await signIn(loginForm.email, loginForm.senha);
    setLoading(false);
    if (error) {
      toast.error(error);
    } else {
      toast.success('Login realizado com sucesso!');
    }
  };

  const handleCadastro = async () => {
    const { nome, email, senha } = cadastroForm;
    if (!nome || !email || !senha) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }
    if (senha.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    setLoading(true);
    const { error, needsConfirmation } = await signUp(email, senha, {
      nome,
      email,
      whatsapp: cadastroForm.whatsapp,
      documento: cadastroForm.documento || undefined,
      tipo_perfil: tipoPerfil ?? 'motorista',
      modelo_caminhao: 'Não informado',
      media_km_litro: 2.5,
      tipo_combustivel: 'Diesel S10',
      comissao: tipoPerfil === 'motorista' && cadastroForm.comissao
        ? parseFloat(cadastroForm.comissao)
        : undefined,
    });
    setLoading(false);
    if (error) {
      toast.error(error);
    } else if (needsConfirmation) {
      setConfirmationEmail(email);
    } else {
      toast.success('Conta criada com sucesso!');
    }
  };

  const updateLogin = (field: string, value: string) =>
    setLoginForm(prev => ({ ...prev, [field]: value }));

  const updateCadastro = (field: string, value: string) =>
    setCadastroForm(prev => ({ ...prev, [field]: value }));

  // Tela de confirmação de email
  if (confirmationEmail) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center bg-background px-4 py-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Verifique seu email</h1>
          <p className="text-muted-foreground">Enviamos um link de confirmação para</p>
          <p className="font-semibold text-foreground">{confirmationEmail}</p>
          <p className="text-sm text-muted-foreground">
            Clique no link do email para ativar sua conta, depois volte aqui para fazer login.
          </p>
          <Button
            onClick={() => {
              setConfirmationEmail(null);
              setTab('login');
              setLoginForm({ email: confirmationEmail, senha: '' });
            }}
            className="mt-4 h-12 px-8 text-base font-bold"
          >
            <LogIn className="h-5 w-5 mr-2" />
            Ir para Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-background px-4 py-8">
      {/* Header */}
      <div className="flex flex-col items-center gap-3 mb-8">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Truck className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Diário de Bordo</h1>
        <p className="text-sm text-muted-foreground text-center">
          Gerencie seus fretes, despesas e abastecimentos
        </p>
      </div>

      {/* Tabs Login / Cadastro */}
      {tab !== 'cadastro' && (
        <div className="flex rounded-lg bg-card border border-border overflow-hidden mb-6">
          <button
            onClick={() => setTab('login')}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              tab === 'login'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Entrar
          </button>
          <button
            onClick={() => setTab('tipo')}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              tab === 'tipo'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Cadastrar
          </button>
        </div>
      )}

      {/* Login Form */}
      {tab === 'login' && (
        <div className="space-y-4 animate-slide-up">
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              placeholder="seu@email.com"
              value={loginForm.email}
              onChange={e => updateLogin('email', e.target.value)}
              className="mt-1 h-12"
            />
          </div>
          <div>
            <Label>Senha</Label>
            <Input
              type="password"
              placeholder="••••••"
              value={loginForm.senha}
              onChange={e => updateLogin('senha', e.target.value)}
              className="mt-1 h-12"
            />
          </div>
          <Button onClick={handleLogin} disabled={loading} className="w-full h-12 text-base font-bold mt-2">
            <LogIn className="h-5 w-5 mr-2" />
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>
          <p className="text-center text-sm text-muted-foreground mt-4">
            Não tem conta?{' '}
            <button onClick={() => setTab('tipo')} className="text-primary font-semibold hover:underline">
              Cadastre-se
            </button>
          </p>
        </div>
      )}

      {/* Etapa 1: Escolha o tipo de perfil */}
      {tab === 'tipo' && (
        <div className="space-y-4 animate-slide-up">
          <div className="text-center mb-2">
            <h2 className="text-lg font-bold">Como você vai usar o app?</h2>
            <p className="text-sm text-muted-foreground mt-1">Selecione o seu perfil para continuar</p>
          </div>

          <button
            onClick={() => { setTipoPerfil('motorista'); setTab('cadastro'); }}
            className="flex w-full items-start gap-4 rounded-xl border border-border bg-card p-4 hover:border-primary transition-colors text-left"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Truck className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-bold text-foreground">Motorista</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                Trabalha para uma transportadora ou autônomo com comissão por frete
              </p>
            </div>
          </button>

          <button
            onClick={() => { setTipoPerfil('frota'); setTab('cadastro'); }}
            className="flex w-full items-start gap-4 rounded-xl border border-border bg-card p-4 hover:border-primary transition-colors text-left"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-bold text-foreground">Frota / Autônomo</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                Dono do caminhão, autônomo ou gestor de frota
              </p>
            </div>
          </button>

          <p className="text-center text-sm text-muted-foreground mt-2">
            Já tem conta?{' '}
            <button onClick={() => setTab('login')} className="text-primary font-semibold hover:underline">
              Entrar
            </button>
          </p>
        </div>
      )}

      {/* Etapa 2: Formulário de cadastro */}
      {tab === 'cadastro' && (
        <div className="space-y-4 animate-slide-up">
          {/* Header com tipo selecionado */}
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={() => setTab('tipo')}
              className="text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div>
              <h2 className="text-base font-bold">
                {tipoPerfil === 'motorista' ? '🚛 Motorista' : '🏢 Frota / Autônomo'}
              </h2>
              <p className="text-xs text-muted-foreground">Preencha seus dados para criar a conta</p>
            </div>
          </div>

          <div>
            <Label>Nome *</Label>
            <Input
              type="text"
              placeholder="Seu nome completo"
              value={cadastroForm.nome}
              onChange={e => updateCadastro('nome', e.target.value)}
              className="mt-1 h-12"
            />
          </div>

          <div>
            <Label>Email *</Label>
            <Input
              type="email"
              placeholder="seu@email.com"
              value={cadastroForm.email}
              onChange={e => updateCadastro('email', e.target.value)}
              className="mt-1 h-12"
            />
          </div>

          <div>
            <Label>Senha *</Label>
            <Input
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={cadastroForm.senha}
              onChange={e => updateCadastro('senha', e.target.value)}
              className="mt-1 h-12"
            />
          </div>

          <div>
            <Label>WhatsApp</Label>
            <Input
              type="tel"
              placeholder="(11) 99999-9999"
              value={cadastroForm.whatsapp}
              onChange={e => updateCadastro('whatsapp', e.target.value)}
              className="mt-1 h-12"
            />
          </div>

          <div>
            <Label>CPF / CNPJ</Label>
            <Input
              type="text"
              placeholder="000.000.000-00 ou 00.000.000/0001-00"
              value={cadastroForm.documento}
              onChange={e => updateCadastro('documento', e.target.value)}
              className="mt-1 h-12"
            />
          </div>

          {/* Comissão só para motorista */}
          {tipoPerfil === 'motorista' && (
            <div>
              <Label>Comissão (%) <span className="text-muted-foreground font-normal">— opcional</span></Label>
              <Input
                type="number"
                inputMode="decimal"
                placeholder="Ex: 10"
                value={cadastroForm.comissao}
                onChange={e => updateCadastro('comissao', e.target.value)}
                className="mt-1 h-12"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Percentual de comissão sobre o valor do frete.
              </p>
            </div>
          )}

          <Button onClick={handleCadastro} disabled={loading} className="w-full h-12 text-base font-bold mt-2">
            <UserPlus className="h-5 w-5 mr-2" />
            {loading ? 'Cadastrando...' : 'Criar Conta'}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Já tem conta?{' '}
            <button onClick={() => setTab('login')} className="text-primary font-semibold hover:underline">
              Entrar
            </button>
          </p>
        </div>
      )}
    </div>
  );
}
