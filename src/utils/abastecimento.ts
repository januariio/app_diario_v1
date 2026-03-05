import { Abastecimento } from '@/types';
import { formatCurrency, formatDate } from '@/utils/calculadora';

export const MAX_IMAGE_WIDTH = 1200;
export const IMAGE_QUALITY = 0.7;

export function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > MAX_IMAGE_WIDTH) {
          height = (height * MAX_IMAGE_WIDTH) / width;
          width = MAX_IMAGE_WIDTH;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', IMAGE_QUALITY));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function buildShareText(a: Abastecimento): string {
  const lines = [
    `⛽ *Abastecimento — Diário de Bordo*`,
    ``,
    `📍 Cidade: ${a.cidade}`,
    `📅 Data: ${formatDate(a.created_at)}`,
    `⛽ Diesel: R$ ${a.preco_diesel.toFixed(2)}/L`,
    `🛢️ Litros: ${a.litragem.toFixed(0)}L`,
    `💰 Total: ${formatCurrency(a.preco_diesel * a.litragem)}`,
    `🔢 Hodômetro: ${a.hodometro.toLocaleString('pt-BR')} km`,
  ];
  if (a.media_calculada > 0) {
    lines.push(`📊 Média: ${a.media_calculada.toFixed(2)} km/L`);
  }
  if (a.observacao) {
    lines.push(`📝 Obs: ${a.observacao}`);
  }
  return lines.join('\n');
}

export async function dataUrlToFile(dataUrl: string, filename: string): Promise<File> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], filename, { type: blob.type });
}

export async function shareViaWhatsApp(record: Abastecimento): Promise<void> {
  const text = buildShareText(record);

  if (navigator.share && record.imagem) {
    try {
      const file = await dataUrlToFile(record.imagem, 'comprovante-abastecimento.jpg');
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ text, files: [file] });
        return;
      }
    } catch {
      // fallback below
    }
  }

  const encoded = encodeURIComponent(text);
  window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
}
