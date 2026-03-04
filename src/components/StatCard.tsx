import { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: string;
  icon?: ReactNode;
  variant?: 'default' | 'success' | 'destructive';
}

export default function StatCard({ label, value, icon, variant = 'default' }: StatCardProps) {
  const variantClasses = {
    default: 'bg-card border-border',
    success: 'bg-card border-success/30',
    destructive: 'bg-card border-destructive/30',
  };

  const valueClasses = {
    default: 'text-foreground',
    success: 'text-success',
    destructive: 'text-destructive',
  };

  return (
    <div className={`rounded-lg border p-3 ${variantClasses[variant]} animate-fade-in`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {icon && <span className="text-muted-foreground">{icon}</span>}
      </div>
      <p className={`mt-1 text-lg font-bold ${valueClasses[variant]}`}>{value}</p>
    </div>
  );
}
