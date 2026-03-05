import { setOptions, importLibrary } from '@googlemaps/js-api-loader';

let configured = false;
let routesLoaded = false;
let placesLoaded = false;

function configure() {
  if (configured) return;
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string;
  if (!key) throw new Error('VITE_GOOGLE_MAPS_API_KEY não definida');
  setOptions({ key, version: 'weekly', language: 'pt-BR', region: 'BR' });
  configured = true;
}

export function isGoogleMapsAvailable(): boolean {
  return !!import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
}

export async function loadRoutes(): Promise<void> {
  if (routesLoaded) return;
  configure();
  await importLibrary('routes');
  routesLoaded = true;
}

export async function loadPlaces(): Promise<void> {
  if (placesLoaded) return;
  configure();
  await importLibrary('places');
  placesLoaded = true;
}

export interface DistanceResult {
  distanceKm: number;
  durationText: string;
}

export type DistanceLocation = string | { placeId: string };

export async function getDistance(
  origin: DistanceLocation,
  destination: DistanceLocation,
): Promise<DistanceResult> {
  await loadRoutes();

  return new Promise((resolve, reject) => {
    const service = new google.maps.DistanceMatrixService();
    service.getDistanceMatrix(
      {
        origins: [origin],
        destinations: [destination],
        travelMode: google.maps.TravelMode.DRIVING,
        unitSystem: google.maps.UnitSystem.METRIC,
      },
      (response, status) => {
        if (status !== 'OK' || !response) {
          reject(new Error(`Distance Matrix falhou: ${status}`));
          return;
        }
        const element = response.rows[0]?.elements[0];
        if (!element || element.status !== 'OK') {
          reject(new Error(`Elemento inválido: ${element?.status}`));
          return;
        }
        resolve({
          distanceKm: Math.round(element.distance.value / 1000),
          durationText: element.duration.text,
        });
      },
    );
  });
}

export interface GasStation {
  name: string;
  address: string;
  rating?: number;
  openNow?: boolean;
  placeId: string;
  location: { lat: number; lng: number };
}

export async function findGasStations(
  lat: number,
  lng: number,
  radius = 15000,
): Promise<GasStation[]> {
  await loadPlaces();
  const container = document.createElement('div');
  const service = new google.maps.places.PlacesService(container);
  return new Promise(resolve => {
    service.nearbySearch(
      { location: new google.maps.LatLng(lat, lng), radius, type: 'gas_station', keyword: 'diesel' },
      (results, status) => {
        if (status !== google.maps.places.PlacesServiceStatus.OK || !results) { resolve([]); return; }
        const stations: GasStation[] = results
          .slice(0, 10)
          .map(r => ({
            name: r.name ?? 'Posto',
            address: r.vicinity ?? '',
            rating: r.rating,
            openNow: r.opening_hours?.open_now,
            placeId: r.place_id ?? '',
            location: { lat: r.geometry?.location?.lat() ?? lat, lng: r.geometry?.location?.lng() ?? lng },
          }))
          .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
        resolve(stations);
      },
    );
  });
}

export interface TollResult {
  estimado: boolean; // true = calculado por estimativa, false = dado real da API
  valor: number;
}

// Multiplicador de pedágio por número de eixos (base ANTT — veículo 2 eixos = 1x)
const MULTIPLICADOR_EIXOS: Record<number, number> = {
  2: 1.0,
  3: 1.5,
  4: 2.0,
  5: 2.5,
  6: 3.0,
  7: 3.5,
  8: 4.0,
  9: 4.5,
};

// Taxa base estimada de pedágio para veículo 2 eixos em rodovias federais brasileiras (R$/km)
const TAXA_BASE_POR_KM = 0.10;

export async function getTollCost(
  origin: DistanceLocation,
  destination: DistanceLocation,
  eixos: number,
  distanciaKm: number,
): Promise<TollResult> {
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string;
  if (!key) throw new Error('Chave não definida');

  const multiplicador = MULTIPLICADOR_EIXOS[eixos] ?? 3.0;

  // Tenta Google Routes API (nova) com cálculo de pedágio
  try {
    const toWaypoint = (loc: DistanceLocation) =>
      typeof loc === 'string'
        ? { address: loc }
        : { placeId: loc.placeId };

    const body = {
      origin: toWaypoint(origin),
      destination: toWaypoint(destination),
      travelMode: 'DRIVE',
      extraComputations: ['TOLLS'],
      routeModifiers: { vehicleInfo: { emissionType: 'GASOLINE' } },
    };

    const res = await fetch(
      'https://routes.googleapis.com/directions/v2:computeRoutes',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': key,
          'X-Goog-FieldMask':
            'routes.travelAdvisory.tollInfo,routes.legs.travelAdvisory.tollInfo',
        },
        body: JSON.stringify(body),
      },
    );

    if (res.ok) {
      const data = await res.json();
      const tollInfo = data?.routes?.[0]?.travelAdvisory?.tollInfo;
      const prices = tollInfo?.estimatedPrice;
      if (prices && prices.length > 0) {
        // API retornou preço base (2 eixos) — aplica multiplicador de eixos
        const baseValue = prices[0].units
          ? parseFloat(`${prices[0].units}.${String(prices[0].nanos ?? 0).padStart(9, '0').slice(0, 2)}`)
          : 0;
        if (baseValue > 0) {
          return { estimado: false, valor: Math.round(baseValue * multiplicador * 100) / 100 };
        }
      }
    }
  } catch {
    // silencioso — cai para estimativa
  }

  // Fallback: estimativa por distância × taxa base × multiplicador de eixos
  const valorEstimado = Math.round(distanciaKm * TAXA_BASE_POR_KM * multiplicador * 100) / 100;
  return { estimado: true, valor: valorEstimado };
}
