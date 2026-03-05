import { useEffect, useRef, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { MapPin, Loader2 } from 'lucide-react';
import { loadPlaces, isGoogleMapsAvailable } from '@/lib/googleMaps';

export interface CitySelection {
  description: string;
  placeId: string;
  lat: number;
  lng: number;
}

interface CityAutocompleteProps {
  value: string;
  onChange: (city: CitySelection | null) => void;
  onTextChange?: (text: string) => void;
  placeholder?: string;
  className?: string;
}

interface Suggestion {
  description: string;
  displayText: string;
  placeId?: string;
}

/* ------------------------------------------------------------------ */
/*  IBGE fallback                                                       */
/* ------------------------------------------------------------------ */
interface IBGECity { name: string; state: string; }
let ibgeCitiesCache: IBGECity[] | null = null;
let ibgeFetchPromise: Promise<IBGECity[]> | null = null;

function fetchIBGECities(): Promise<IBGECity[]> {
  if (ibgeCitiesCache) return Promise.resolve(ibgeCitiesCache);
  if (ibgeFetchPromise) return ibgeFetchPromise;
  ibgeFetchPromise = fetch('https://servicodados.ibge.gov.br/api/v1/localidades/municipios?orderBy=nome')
    .then(res => res.json())
    .then((data: Array<Record<string, unknown>>) => {
      ibgeCitiesCache = data.map(m => {
        const micro = m.microrregiao as Record<string, Record<string, Record<string, string>>> | null;
        const ri = m['regiao-imediata'] as Record<string, Record<string, Record<string, string>>> | null;
        const state = micro?.mesorregiao?.UF?.sigla ?? ri?.['regiao-intermediaria']?.UF?.sigla ?? '';
        return { name: m.nome as string, state };
      }).filter(c => c.state !== '');
      return ibgeCitiesCache!;
    })
    .catch(err => { ibgeFetchPromise = null; throw err; });
  return ibgeFetchPromise;
}

function stripAccents(text: string) {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function filterIBGE(cities: IBGECity[], query: string): Suggestion[] {
  const q = stripAccents(query.toLowerCase());
  const starts: IBGECity[] = [], contains: IBGECity[] = [];
  for (const c of cities) {
    const n = stripAccents(c.name.toLowerCase());
    if (n.startsWith(q)) starts.push(c);
    else if (n.includes(q)) contains.push(c);
  }
  return [...starts, ...contains].slice(0, 8).map(c => ({
    description: `${c.name} - ${c.state}, Brasil`,
    displayText: `${c.name} - ${c.state}`,
  }));
}

/* ------------------------------------------------------------------ */
/*  Google Places                                                       */
/* ------------------------------------------------------------------ */
let googlePlacesReady = false;
let googlePlacesFailed = false;

async function tryLoadGooglePlaces(): Promise<boolean> {
  if (googlePlacesReady) return true;
  if (googlePlacesFailed) return false;
  try {
    await loadPlaces();
    googlePlacesReady = true;
    return true;
  } catch (e) {
    console.warn('Google Places não disponível, usando IBGE:', e);
    googlePlacesFailed = true;
    return false;
  }
}

async function getGoogleSuggestions(input: string): Promise<Suggestion[]> {
  return new Promise(resolve => {
    const svc = new google.maps.places.AutocompleteService();
    svc.getPlacePredictions(
      { input, types: ['(cities)'], componentRestrictions: { country: 'br' } },
      (predictions, status) => {
        if (status !== google.maps.places.PlacesServiceStatus.OK || !predictions) {
          resolve([]);
          return;
        }
        resolve(predictions.slice(0, 6).map(p => ({
          description: p.description,
          displayText: p.structured_formatting?.main_text
            ? `${p.structured_formatting.main_text} - ${p.structured_formatting.secondary_text?.split(',')[0]?.trim() ?? ''}`
            : p.description,
          placeId: p.place_id,
        })));
      }
    );
  });
}

async function getPlaceLatLng(placeId: string): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    const container = document.createElement('div');
    const svc = new google.maps.places.PlacesService(container);
    svc.getDetails({ placeId, fields: ['geometry'] }, (result, status) => {
      if (status !== google.maps.places.PlacesServiceStatus.OK || !result?.geometry?.location) {
        reject(new Error('Place details falhou'));
        return;
      }
      resolve({ lat: result.geometry.location.lat(), lng: result.geometry.location.lng() });
    });
  });
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */
export default function CityAutocomplete({ value, onChange, onTextChange, placeholder, className }: CityAutocompleteProps) {
  const [input, setInput] = useState(value);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [usingGoogle, setUsingGoogle] = useState(false);
  const ibgeCitiesRef = useRef<IBGECity[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => { setInput(value); }, [value]);

  // Pré-carrega dados (Google ou IBGE) ao montar
  useEffect(() => {
    if (isGoogleMapsAvailable()) {
      tryLoadGooglePlaces().then(ok => {
        setUsingGoogle(ok);
        if (!ok) {
          // Google falhou — pré-carrega IBGE como fallback
          fetchIBGECities().then(c => { ibgeCitiesRef.current = c; }).catch(() => {});
        }
      });
    } else {
      fetchIBGECities().then(c => { ibgeCitiesRef.current = c; }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchSuggestions = useCallback(async (text: string) => {
    if (text.length < 2) { setSuggestions([]); return; }
    setLoading(true);
    try {
      const canUseGoogle = isGoogleMapsAvailable() && (usingGoogle || await tryLoadGooglePlaces());
      if (canUseGoogle) {
        const results = await getGoogleSuggestions(text);
        if (results.length > 0) {
          setSuggestions(results);
          setUsingGoogle(true);
          return;
        }
      }
      // Fallback para IBGE
      if (ibgeCitiesRef.current.length === 0) {
        ibgeCitiesRef.current = await fetchIBGECities();
      }
      setSuggestions(filterIBGE(ibgeCitiesRef.current, text));
    } catch {
      // Último recurso: IBGE
      try {
        if (ibgeCitiesRef.current.length === 0) {
          ibgeCitiesRef.current = await fetchIBGECities();
        }
        setSuggestions(filterIBGE(ibgeCitiesRef.current, text));
      } catch {
        setSuggestions([]);
      }
    } finally {
      setLoading(false);
    }
  }, [usingGoogle]);

  const handleInputChange = (text: string) => {
    setInput(text);
    setOpen(true);
    onChange(null);
    onTextChange?.(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(text), 300);
  };

  const handleSelect = async (suggestion: Suggestion) => {
    setInput(suggestion.displayText);
    onTextChange?.(suggestion.displayText);
    setSuggestions([]);
    setOpen(false);

    if (usingGoogle && suggestion.placeId) {
      try {
        const { lat, lng } = await getPlaceLatLng(suggestion.placeId);
        onChange({ description: suggestion.displayText, placeId: suggestion.placeId, lat, lng });
      } catch {
        onChange({ description: suggestion.displayText, placeId: suggestion.placeId, lat: 0, lng: 0 });
      }
    } else {
      onChange({ description: suggestion.description, placeId: '', lat: 0, lng: 0 });
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <MapPin className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={input}
          onChange={e => handleInputChange(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder={placeholder}
          className={cn(
            'flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-8 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:text-sm',
            className,
          )}
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
        )}
      </div>

      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-lg max-h-48 overflow-y-auto">
          {suggestions.map((s, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => handleSelect(s)}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-left hover:bg-accent transition-colors"
              >
                <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="truncate">{s.displayText}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
