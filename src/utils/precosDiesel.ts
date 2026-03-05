// Médias de preço do Diesel S10 por estado
// Fonte: ANP — Agência Nacional do Petróleo (atualizado periodicamente)
// https://www.gov.br/anp/pt-br/assuntos/precos-e-defesa-da-concorrencia/precos

export interface MediaDiesel {
  estado: string;
  sigla: string;
  preco: number;
  referencia: string; // mês/ano de referência
}

// Médias ANP — Diesel S10 varejo — Março 2025
const MEDIAS_DIESEL: MediaDiesel[] = [
  { sigla: 'AC', estado: 'Acre',                preco: 6.89, referencia: 'Mar/2025' },
  { sigla: 'AL', estado: 'Alagoas',             preco: 6.31, referencia: 'Mar/2025' },
  { sigla: 'AM', estado: 'Amazonas',            preco: 6.72, referencia: 'Mar/2025' },
  { sigla: 'AP', estado: 'Amapá',               preco: 6.65, referencia: 'Mar/2025' },
  { sigla: 'BA', estado: 'Bahia',               preco: 6.24, referencia: 'Mar/2025' },
  { sigla: 'CE', estado: 'Ceará',               preco: 6.28, referencia: 'Mar/2025' },
  { sigla: 'DF', estado: 'Distrito Federal',    preco: 6.19, referencia: 'Mar/2025' },
  { sigla: 'ES', estado: 'Espírito Santo',      preco: 6.21, referencia: 'Mar/2025' },
  { sigla: 'GO', estado: 'Goiás',               preco: 6.17, referencia: 'Mar/2025' },
  { sigla: 'MA', estado: 'Maranhão',            preco: 6.38, referencia: 'Mar/2025' },
  { sigla: 'MG', estado: 'Minas Gerais',        preco: 6.22, referencia: 'Mar/2025' },
  { sigla: 'MS', estado: 'Mato Grosso do Sul',  preco: 6.18, referencia: 'Mar/2025' },
  { sigla: 'MT', estado: 'Mato Grosso',         preco: 6.25, referencia: 'Mar/2025' },
  { sigla: 'PA', estado: 'Pará',                preco: 6.41, referencia: 'Mar/2025' },
  { sigla: 'PB', estado: 'Paraíba',             preco: 6.27, referencia: 'Mar/2025' },
  { sigla: 'PE', estado: 'Pernambuco',          preco: 6.26, referencia: 'Mar/2025' },
  { sigla: 'PI', estado: 'Piauí',               preco: 6.35, referencia: 'Mar/2025' },
  { sigla: 'PR', estado: 'Paraná',              preco: 6.14, referencia: 'Mar/2025' },
  { sigla: 'RJ', estado: 'Rio de Janeiro',      preco: 6.33, referencia: 'Mar/2025' },
  { sigla: 'RN', estado: 'Rio Grande do Norte', preco: 6.29, referencia: 'Mar/2025' },
  { sigla: 'RO', estado: 'Rondônia',            preco: 6.52, referencia: 'Mar/2025' },
  { sigla: 'RR', estado: 'Roraima',             preco: 6.71, referencia: 'Mar/2025' },
  { sigla: 'RS', estado: 'Rio Grande do Sul',   preco: 6.19, referencia: 'Mar/2025' },
  { sigla: 'SC', estado: 'Santa Catarina',      preco: 6.12, referencia: 'Mar/2025' },
  { sigla: 'SE', estado: 'Sergipe',             preco: 6.30, referencia: 'Mar/2025' },
  { sigla: 'SP', estado: 'São Paulo',           preco: 6.18, referencia: 'Mar/2025' },
  { sigla: 'TO', estado: 'Tocantins',           preco: 6.33, referencia: 'Mar/2025' },
];

const MAP = Object.fromEntries(MEDIAS_DIESEL.map(m => [m.sigla, m]));

/**
 * Extrai a sigla do estado de uma descrição de cidade.
 * Ex: "Londrina - PR, Brasil" → "PR"
 *     "São Paulo - SP" → "SP"
 */
export function extrairSiglaEstado(description: string): string | null {
  // Tenta padrão "Cidade - UF" ou "Cidade, UF"
  const match = description.match(/[-,]\s*([A-Z]{2})(?:[,\s]|$)/);
  return match ? match[1] : null;
}

/**
 * Retorna a média do diesel para uma cidade (via sigla do estado).
 */
export function getMediaDieselPorCidade(description: string): MediaDiesel | null {
  const sigla = extrairSiglaEstado(description);
  if (!sigla) return null;
  return MAP[sigla] ?? null;
}
