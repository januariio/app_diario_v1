import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/StoreContext';
import { calcularLitros, calcularCustoDiesel, calcularCustoPorKm, formatCurrency } from '@/utils/calculadora';
import { getDistance, findGasStations, getTollCost, isGoogleMapsAvailable, type GasStation, type TollResult, type DistanceLocation } from '@/lib/googleMaps';
import { getMediaDieselPorCidade } from '@/utils/precosDiesel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import CurrencyInput from '@/components/CurrencyInput';
import CityAutocomplete, { type CitySelection } from '@/components/CityAutocomplete';
import {
  ArrowLeft, Calculator,
  Loader2, Fuel, Star, ExternalLink, RefreshCw,
  ChevronDown, ChevronUp, Info,
} from 'lucide-react';

export default function NovaViagem() {
  const navigate = useNavigate();
  const { profile, addViagem, addDespesa } = useAppStore();

  const [valorFrete, setValorFrete] = useState(0);
  const [origem, setOrigem] = useState<CitySelection | null>(null);
  const [destino, setDestino] = useState<CitySelection | null>(null);
  const [origemText, setOrigemText] = useState('');
  const [destinoText, setDestinoText] = useState('');
  const [distanciaKm, setDistanciaKm] = useState('');
  const [precoDiesel, setPrecoDiesel] = useState('');
  const [durationText, setDurationText] = useState('');
  const [loadingDistance, setLoadingDistance] = useState(false);

  // Média diesel
  const [mediaEstado, setMediaEstado] = useState<{ preco: number; estado: string; referencia: string } | null>(null);
  const [dieselEditado, setDieselEditado] = useState(false);

  // Postos (colapsável)
  const [postosAbertos, setPostosAbertos] = useState(false);
  const [gasStations, setGasStations] = useState<GasStation[]>([]);
  const [loadingStations, setLoadingStations] = useState(false);

  // Eixos — inicia com valor do perfil
  const [eixos, setEixos] = useState<number>(profile.eixos ?? 6);

  // Pedágio
  const [pedagio, setPedagio] = useState<TollResult | null>(null);
  const [loadingPedagio, setLoadingPedagio] = useState(false);

  const distancia = parseFloat(distanciaKm) || 0;
  const precoDieselNum = parseFloat(precoDiesel) || 0;

  const litros = calcularLitros(distancia, profile.media_km_litro);
  const custoDiesel = calcularCustoDiesel(litros, precoDieselNum);
  const custoPorKm = calcularCustoPorKm(custoDiesel, distancia);
  const comissaoPct = profile.comissao ?? null;
  const valorComissao = comissaoPct != null && valorFrete > 0
    ? valorFrete * (comissaoPct / 100)
    : null;

  // Calcula distância ao selecionar origem + destino
  const calcularDistancia = useCallback(async () => {
    if (!origem || !destino || !isGoogleMapsAvailable()) return;
    const toLocation = (c: CitySelection): DistanceLocation => {
      if (c.placeId) return { placeId: c.placeId };
      const base = c.description.replace(' - ', ', ');
      return base.includes('Brasil') ? base : base + ', Brasil';
    };
    setLoadingDistance(true);
    try {
      const result = await getDistance(toLocation(origem), toLocation(destino));
      setDistanciaKm(String(result.distanceKm));
      setDurationText(result.durationText);
    } catch (err) {
      console.error('Erro ao calcular distância:', err);
      setDurationText('');
    } finally {
      setLoadingDistance(false);
    }
  }, [origem, destino]);

  useEffect(() => {
    if (origem && destino) calcularDistancia();
  }, [origem, destino, calcularDistancia]);

  // Calcula pedágio quando distância + eixos estiverem prontos
  const calcularPedagio = useCallback(async () => {
    if (!distancia || !origem || !destino || !isGoogleMapsAvailable()) return;
    const toLocation = (c: CitySelection): DistanceLocation => {
      if (c.placeId) return { placeId: c.placeId };
      const base = c.description.replace(' - ', ', ');
      return base.includes('Brasil') ? base : base + ', Brasil';
    };
    setLoadingPedagio(true);
    try {
      const result = await getTollCost(toLocation(origem), toLocation(destino), eixos, distancia);
      setPedagio(result);
    } catch {
      setPedagio(null);
    } finally {
      setLoadingPedagio(false);
    }
  }, [origem, destino, distancia, eixos]);

  useEffect(() => {
    if (distancia > 0 && origem && destino) calcularPedagio();
    else setPedagio(null);
  }, [distancia, eixos, calcularPedagio, origem, destino]);

  // Busca média do diesel ao selecionar origem
  useEffect(() => {
    if (!origem) {
      setMediaEstado(null);
      if (!dieselEditado) setPrecoDiesel('');
      return;
    }
    const media = getMediaDieselPorCidade(origem.description);
    if (media) {
      setMediaEstado({ preco: media.preco, estado: media.estado, referencia: media.referencia });
      if (!dieselEditado) {
        setPrecoDiesel(media.preco.toFixed(2));
      }
    } else {
      setMediaEstado(null);
    }
  }, [origem, dieselEditado]);

  // Busca postos sob demanda
  const buscarPostos = useCallback(async () => {
    if (!origem?.lat || !origem?.lng || origem.lat === 0) return;
    setLoadingStations(true);
    try {
      const stations = await findGasStations(origem.lat, origem.lng);
      setGasStations(stations);
    } catch {
      setGasStations([]);
    } finally {
      setLoadingStations(false);
    }
  }, [origem]);

  const handleTogglePostos = () => {
    if (!postosAbertos && gasStations.length === 0) buscarPostos();
    setPostosAbertos(v => !v);
  };

  const handleOrigemChange = (city: CitySelection | null) => {
    setOrigem(city);
    setDieselEditado(false); // reseta edição ao trocar cidade
    setGasStations([]);
    setPostosAbertos(false);
    if (city) setOrigemText(city.description);
  };

  const handleDestinoChange = (city: CitySelection | null) => {
    setDestino(city);
    if (city) setDestinoText(city.description);
  };

  const cidadeOrigem = origem?.description ?? origemText;
  const cidadeDestino = destino?.description ?? destinoText;

  const handleIniciar = () => {
    if (!cidadeOrigem || !cidadeDestino || !valorFrete || !distancia) return;
    const viagem = addViagem({
      cidade_origem: cidadeOrigem,
      cidade_destino: cidadeDestino,
      distancia_km: distancia,
      valor_frete: valorFrete,
      preco_diesel: precoDieselNum,
      litros_estimados: litros,
      custo_estimado_diesel: custoDiesel,
      status: 'ativa',
      data_inicio: new Date().toISOString(),
    });
    // Salva comissão automaticamente como despesa, se existir
    if (valorComissao != null && valorComissao > 0) {
      addDespesa({
        viagem_id: viagem.id,
        categoria: 'Comissão',
        valor: valorComissao,
        observacao: `Comissão ${comissaoPct}% sobre frete de ${formatCurrency(valorFrete)}`,
      });
    }
    navigate(`/viagem/${viagem.id}`);
  };

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold">Simulador de Frete</h1>
      </div>

      <div className="space-y-4">
        {/* Valor do Frete */}
        <div>
          <Label>Valor do Frete</Label>
          <CurrencyInput
            value={valorFrete}
            onChange={setValorFrete}
            placeholder="0,00"
            className="mt-1 h-12 text-lg"
          />
        </div>

        {/* Origem e Destino */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Origem</Label>
            <CityAutocomplete
              value={origemText}
              onChange={handleOrigemChange}
              onTextChange={setOrigemText}
              placeholder="Ex: Londrina"
              className="mt-1 h-12"
            />
          </div>
          <div>
            <Label>Destino</Label>
            <CityAutocomplete
              value={destinoText}
              onChange={handleDestinoChange}
              onTextChange={setDestinoText}
              placeholder="Ex: São Paulo"
              className="mt-1 h-12"
            />
          </div>
        </div>

        {/* Distância e Diesel */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Distância (km)</Label>
            <div className="relative">
              <Input
                type="number"
                inputMode="numeric"
                placeholder="400"
                value={distanciaKm}
                onChange={e => setDistanciaKm(e.target.value)}
                className="mt-1 h-12"
              />
              {loadingDistance && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary animate-spin" />
              )}
            </div>
            {durationText && (
              <p className="mt-1 text-xs text-muted-foreground">⏱ {durationText}</p>
            )}
          </div>

          <div>
            <Label>Diesel (R$/L)</Label>
            <div className="relative">
              <Input
                type="number"
                inputMode="decimal"
                placeholder="6.20"
                value={precoDiesel}
                onChange={e => {
                  setPrecoDiesel(e.target.value);
                  setDieselEditado(true);
                }}
                className="mt-1 h-12"
              />
            </div>
            {/* Badge de média ANP */}
            {mediaEstado && (
              <div className="mt-1 flex items-center gap-1">
                <Info className="h-3 w-3 text-primary shrink-0" />
                <p className="text-[11px] text-primary font-medium">
                  Média {mediaEstado.estado}: R$ {mediaEstado.preco.toFixed(2)}/L
                  <span className="text-muted-foreground font-normal"> · ANP {mediaEstado.referencia}</span>
                </p>
              </div>
            )}
            {dieselEditado && mediaEstado && (
              <button
                type="button"
                onClick={() => { setPrecoDiesel(mediaEstado.preco.toFixed(2)); setDieselEditado(false); }}
                className="mt-0.5 text-[11px] text-primary hover:underline"
              >
                Usar média do estado
              </button>
            )}
          </div>
        </div>

        {/* Eixos do caminhão */}
        <div>
          <Label>Eixos do Caminhão</Label>
          <div className="mt-1 flex gap-2 flex-wrap">
            {[2,3,4,5,6,7,8,9].map(n => (
              <button
                key={n}
                type="button"
                onClick={() => setEixos(n)}
                className={`flex-1 min-w-[48px] h-10 rounded-md border text-sm font-semibold transition-colors ${
                  eixos === n
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card text-muted-foreground border-border hover:border-primary/50'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Número de eixos — usado para calcular o pedágio
          </p>
        </div>

        {/* Postos de diesel — colapsável */}
        {origem && origem.lat !== 0 && (
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <button
              type="button"
              onClick={handleTogglePostos}
              className="flex w-full items-center justify-between px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <span className="flex items-center gap-2">
                <Fuel className="h-4 w-4 text-primary" />
                Ver postos de diesel próximos
              </span>
              <span className="flex items-center gap-1 text-xs">
                {loadingStations && <Loader2 className="h-3 w-3 animate-spin" />}
                {postosAbertos ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </span>
            </button>

            {postosAbertos && (
              <div className="border-t border-border p-3 space-y-2">
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={buscarPostos}
                    disabled={loadingStations}
                    className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3 w-3 ${loadingStations ? 'animate-spin' : ''}`} />
                    Atualizar
                  </button>
                </div>
                {loadingStations ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : gasStations.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-3">Nenhum posto encontrado</p>
                ) : (
                  <ul className="space-y-2 max-h-52 overflow-y-auto">
                    {gasStations.map(station => (
                      <li key={station.placeId} className="flex items-start gap-2 rounded-md bg-secondary/50 p-2.5 text-sm">
                        <Fuel className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-foreground truncate">{station.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{station.address}</p>
                          {station.openNow !== undefined && (
                            <span className={`text-[11px] font-medium ${station.openNow ? 'text-green-500' : 'text-red-400'}`}>
                              {station.openNow ? 'Aberto agora' : 'Fechado'}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          {station.rating && (
                            <span className="flex items-center gap-0.5 text-xs text-amber-500">
                              <Star className="h-3 w-3 fill-current" />
                              {station.rating.toFixed(1)}
                            </span>
                          )}
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(station.name)}&query_place_id=${station.placeId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-0.5 text-[11px] text-primary hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Ver no Maps
                          </a>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Resultado */}
      {distancia > 0 && valorFrete > 0 && (
        <div className="rounded-lg border border-border bg-card p-4 space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Calculator className="h-4 w-4 text-primary" />
            Resumo do frete
          </h3>

          {/* Cards de custos */}
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="rounded-lg bg-secondary/50 p-3">
              <span className="text-xs text-muted-foreground">Litros estimados</span>
              <p className="text-base font-bold mt-0.5">{litros.toFixed(1)} L</p>
            </div>
            <div className="rounded-lg bg-secondary/50 p-3">
              <span className="text-xs text-muted-foreground">Custo diesel</span>
              <p className="text-base font-bold mt-0.5">{formatCurrency(custoDiesel)}</p>
            </div>
            <div className="rounded-lg bg-secondary/50 p-3">
              <span className="text-xs text-muted-foreground">Custo/km</span>
              <p className="text-base font-bold mt-0.5">{formatCurrency(custoPorKm)}</p>
            </div>
          </div>

          {/* Pedágio */}
          <div className="border-t border-border pt-3 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1.5">
                Pedágio ({eixos} eixos)
                {loadingPedagio && <Loader2 className="h-3 w-3 animate-spin" />}
                {pedagio?.estimado && !loadingPedagio && (
                  <span className="text-[10px] bg-secondary px-1.5 py-0.5 rounded text-muted-foreground">estimado</span>
                )}
              </span>
              <span className="font-semibold">
                {loadingPedagio ? '...' : pedagio ? formatCurrency(pedagio.valor) : '—'}
              </span>
            </div>
          </div>

          {/* Comissão + Valor líquido */}
          {valorComissao != null && (
            <div className="border-t border-border pt-3 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Valor do frete</span>
                <span className="font-semibold">{formatCurrency(valorFrete)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Comissão ({comissaoPct}%)</span>
                <span className="font-semibold">{formatCurrency(valorComissao)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-2">
                <span className="font-semibold">Valor líquido</span>
                <span className="text-base font-bold text-primary">{formatCurrency(valorFrete - valorComissao)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button variant="secondary" className="flex-1 h-14 text-base" onClick={() => navigate(-1)}>
          Voltar
        </Button>
        <Button
          className="flex-1 h-14 text-base font-bold"
          onClick={handleIniciar}
          disabled={!cidadeOrigem || !cidadeDestino || !valorFrete || !distancia}
        >
          <Calculator className="mr-2 h-5 w-5" />
          Iniciar Viagem
        </Button>
      </div>
    </div>
  );
}
