import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, X, ChevronDown, Search } from 'lucide-react';
import CarCard from '../components/CarCard';
import { api, CarTrim, Make, CarModel } from '../api/client';

const BODY_STYLES = ['Sedan', 'SUV', 'Pickup Truck', 'Coupe', 'Convertible', 'Wagon', 'Hatchback'];
const YEARS = Array.from({ length: 10 }, (_, i) => 2024 - i);
const PRICE_RANGES = [
  { label: 'Under $25k', min: 0, max: 25000 },
  { label: '$25k–$40k', min: 25000, max: 40000 },
  { label: '$40k–$60k', min: 40000, max: 60000 },
  { label: '$60k–$80k', min: 60000, max: 80000 },
  { label: 'Over $80k', min: 80000, max: 999999 },
];

interface Filters {
  q: string;
  make: string;
  model: string;
  year: string;
  body_style: string;
  price_range: string;
}

function Select({ value, onChange, options, placeholder, className = '' }: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full appearance-none input pr-8 text-sm"
      >
        <option value="">{placeholder}</option>
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
    </div>
  );
}

export default function Browse() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [cars, setCars] = useState<CarTrim[]>([]);
  const [makes, setMakes] = useState<Make[]>([]);
  const [models, setModels] = useState<CarModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [filters, setFilters] = useState<Filters>({
    q: searchParams.get('q') || '',
    make: searchParams.get('make') || '',
    model: searchParams.get('model') || '',
    year: searchParams.get('year') || '',
    body_style: searchParams.get('body_style') || '',
    price_range: searchParams.get('price_range') || '',
  });

  // Load makes on mount
  useEffect(() => {
    api.getMakes().then(setMakes).catch(console.error);
  }, []);

  // Load models when make changes
  useEffect(() => {
    if (filters.make) {
      api.getModels(filters.make).then(setModels).catch(console.error);
    } else {
      setModels([]);
    }
    setFilters(f => ({ ...f, model: '' }));
  }, [filters.make]);

  const search = useCallback(async (f: Filters) => {
    setLoading(true);
    try {
      const priceRange = PRICE_RANGES.find(r => r.label === f.price_range);
      const results = await api.searchCars({
        q: f.q,
        make: f.make,
        model: f.model,
        year: f.year,
        body_style: f.body_style,
        min_price: priceRange?.min,
        max_price: priceRange?.max,
      });
      setCars(results);
    } catch {
      setCars([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
    setSearchParams(params, { replace: true });
    const timer = setTimeout(() => search(filters), 200);
    return () => clearTimeout(timer);
  }, [filters, search, setSearchParams]);

  const update = (key: keyof Filters) => (val: string) => setFilters(f => ({ ...f, [key]: val }));

  const hasFilters = Object.values(filters).some(Boolean);
  const clearFilters = () => setFilters({ q: '', make: '', model: '', year: '', body_style: '', price_range: '' });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="section-title">Browse Vehicles</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {loading ? 'Searching...' : `${cars.length} vehicle${cars.length !== 1 ? 's' : ''} found`}
        </p>
      </div>

      {/* Search + Filters */}
      <div className="mb-6 space-y-3">
        {/* Main search */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={filters.q}
              onChange={e => update('q')(e.target.value)}
              placeholder="Search make, model, trim..."
              className="input pl-10"
            />
          </div>
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
              filtersOpen || (hasFilters && filters.q !== (hasFilters ? filters.q : ''))
                ? 'border-primary-500 text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20'
                : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden sm:inline">Filters</span>
            {hasFilters && <span className="bg-primary-600 text-white w-4 h-4 rounded-full text-xs flex items-center justify-center">!</span>}
          </button>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-500 dark:text-gray-400 hover:text-red-500 bg-white dark:bg-gray-800 transition-colors"
            >
              <X className="w-4 h-4" />
              <span className="hidden sm:inline">Clear</span>
            </button>
          )}
        </div>

        {/* Expandable filters */}
        {filtersOpen && (
          <div className="card p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 animate-fade-in">
            <Select
              value={filters.make}
              onChange={update('make')}
              options={makes.map(m => ({ value: m.make_id, label: m.name }))}
              placeholder="All Makes"
            />
            <Select
              value={filters.model}
              onChange={update('model')}
              options={models.map(m => ({ value: m.model_id, label: m.name }))}
              placeholder="All Models"
              className={!filters.make ? 'opacity-50 pointer-events-none' : ''}
            />
            <Select
              value={filters.year}
              onChange={update('year')}
              options={YEARS.map(y => ({ value: String(y), label: String(y) }))}
              placeholder="All Years"
            />
            <Select
              value={filters.body_style}
              onChange={update('body_style')}
              options={BODY_STYLES.map(s => ({ value: s, label: s }))}
              placeholder="All Types"
            />
            <Select
              value={filters.price_range}
              onChange={update('price_range')}
              options={PRICE_RANGES.map(r => ({ value: r.label, label: r.label }))}
              placeholder="Any Price"
            />
          </div>
        )}

        {/* Active filter chips */}
        {hasFilters && (
          <div className="flex flex-wrap gap-2">
            {filters.q && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 rounded-full text-sm">
                "{filters.q}"
                <button onClick={() => update('q')('')}><X className="w-3 h-3" /></button>
              </span>
            )}
            {filters.make && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 rounded-full text-sm">
                {makes.find(m => m.make_id === filters.make)?.name || filters.make}
                <button onClick={() => update('make')('')}><X className="w-3 h-3" /></button>
              </span>
            )}
            {filters.body_style && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 rounded-full text-sm">
                {filters.body_style}
                <button onClick={() => update('body_style')('')}><X className="w-3 h-3" /></button>
              </span>
            )}
            {filters.year && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 rounded-full text-sm">
                {filters.year}
                <button onClick={() => update('year')('')}><X className="w-3 h-3" /></button>
              </span>
            )}
            {filters.price_range && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 rounded-full text-sm">
                {filters.price_range}
                <button onClick={() => update('price_range')('')}><X className="w-3 h-3" /></button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Results */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="card h-64 animate-pulse">
              <div className="h-36 bg-gray-200 dark:bg-gray-800 rounded-t-xl" />
              <div className="p-4 space-y-3">
                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-3/4" />
                <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : cars.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">🚗</div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No vehicles found</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">Try adjusting your search filters</p>
          <button onClick={clearFilters} className="btn-primary">Clear filters</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-fade-in">
          {cars.map(car => (
            <CarCard key={car.trim_id} car={car} />
          ))}
        </div>
      )}
    </div>
  );
}
