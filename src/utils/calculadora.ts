export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatDate(date: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date));
}

export function formatDateShort(date: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
  }).format(new Date(date));
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function calcularLitros(distancia: number, mediaKmL: number): number {
  if (mediaKmL <= 0) return 0;
  return distancia / mediaKmL;
}

export function calcularCustoDiesel(litros: number, precoDiesel: number): number {
  return litros * precoDiesel;
}

export function calcularMargem(frete: number, custoDiesel: number): number {
  return frete - custoDiesel;
}

export function calcularCustoPorKm(custoTotal: number, distancia: number): number {
  if (distancia <= 0) return 0;
  return custoTotal / distancia;
}

export function calcularLucroLiquido(frete: number, despesas: number): number {
  return frete - despesas;
}
