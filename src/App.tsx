import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import { StoreProvider } from "@/store/StoreContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import MobileLayout from "@/components/MobileLayout";
import Dashboard from "./pages/Dashboard";
import NovaViagem from "./pages/NovaViagem";
import ViagemAtiva from "./pages/ViagemAtiva";
import Relatorio from "./pages/Relatorio";
import AbastecimentoPage from "./pages/AbastecimentoPage";
import Historico from "./pages/Historico";
import FechamentoMes from "./pages/FechamentoMes";
import Perfil from "./pages/Perfil";
import Resumos from "./pages/Resumos";
import Veiculos from "./pages/Veiculos";
import AuthPage from "./pages/AuthPage";
import NotFound from "./pages/NotFound";
import { Truck } from "lucide-react";

const queryClient = new QueryClient();

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4 animate-pulse">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Truck className="h-8 w-8 text-primary" />
        </div>
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    </div>
  );
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  if (!user) return <AuthPage />;

  return (
    <StoreProvider>
      <HashRouter>
        <MobileLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/nova-viagem" element={<NovaViagem />} />
            <Route path="/viagem/:id" element={<ViagemAtiva />} />
            <Route path="/relatorio/:id" element={<Relatorio />} />
            <Route path="/abastecimento" element={<AbastecimentoPage />} />
            <Route path="/historico" element={<Historico />} />
            <Route path="/fechamento" element={<FechamentoMes />} />
            <Route path="/perfil" element={<Perfil />} />
            <Route path="/resumos" element={<Resumos />} />
            <Route path="/veiculos" element={<Veiculos />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </MobileLayout>
      </HashRouter>
    </StoreProvider>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <AppRoutes />
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
