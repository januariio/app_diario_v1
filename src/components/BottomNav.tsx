import { NavLink, useLocation } from 'react-router-dom';
import { Home, PlusCircle, History, Fuel, BarChart2, User, Truck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function BottomNav() {
  const location = useLocation();
  const { profile } = useAuth();
  const isMotorista = profile?.tipo_perfil === 'motorista';

  const navItems = isMotorista
    ? [
        { to: '/', icon: Home, label: 'Início' },
        { to: '/nova-viagem', icon: PlusCircle, label: 'Nova' },
        { to: '/historico', icon: History, label: 'Histórico' },
        { to: '/abastecimento', icon: Fuel, label: 'Abastec.' },
        { to: '/resumos', icon: BarChart2, label: 'Resumos' },
        { to: '/perfil', icon: User, label: 'Perfil' },
      ]
    : [
        { to: '/', icon: Home, label: 'Início' },
        { to: '/nova-viagem', icon: PlusCircle, label: 'Nova' },
        { to: '/veiculos', icon: Truck, label: 'Veículos' },
        { to: '/abastecimento', icon: Fuel, label: 'Abastec.' },
        { to: '/resumos', icon: BarChart2, label: 'Resumos' },
        { to: '/perfil', icon: User, label: 'Perfil' },
      ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-lg safe-bottom">
      <div className="mx-auto flex max-w-md items-center justify-around px-2 py-1">
        {navItems.map(({ to, icon: Icon, label }) => {
          const active = location.pathname === to;
          return (
            <NavLink
              key={to}
              to={to}
              className={`flex flex-col items-center gap-0.5 px-1.5 py-2 text-[10px] font-medium transition-colors ${
                active ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <Icon className={`h-5 w-5 ${active ? 'text-primary' : ''}`} />
              <span>{label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
