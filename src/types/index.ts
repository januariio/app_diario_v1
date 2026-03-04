export interface Viagem {
  id: string;
  cidade_origem: string;
  cidade_destino: string;
  distancia_km: number;
  valor_frete: number;
  preco_diesel: number;
  litros_estimados: number;
  custo_estimado_diesel: number;
  status: 'simulacao' | 'ativa' | 'encerrada' | 'cancelada';
  data_inicio: string;
  data_fim?: string;
  created_at: string;
}

export interface Despesa {
  id: string;
  viagem_id: string;
  categoria: string;
  valor: number;
  observacao?: string;
  created_at: string;
}

export interface Abastecimento {
  id: string;
  cidade: string;
  preco_diesel: number;
  hodometro: number;
  litragem: number;
  media_calculada: number;
  observacao?: string;
  imagem?: string;
  created_at: string;
}

export interface UserProfile {
  id?: string;
  nome: string;
  email?: string;
  whatsapp?: string;
  modelo_caminhao: string;
  media_km_litro: number;
  tipo_combustivel: string;
  comissao?: number;
  eixos?: number;
}

export const CATEGORIAS_DESPESA = [
  'Combustível',
  'Alimentação',
  'Pedágio',
  'Manutenção',
  'Estacionamento',
  'Comissão',
  'Reserva manutenção',
  'Outros',
] as const;

export type CategoriaDespesa = typeof CATEGORIAS_DESPESA[number];
