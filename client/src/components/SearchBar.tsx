import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Loader2 } from 'lucide-react';
import { api, CarTrim } from '../api/client';

interface SearchBarProps {
  placeholder?: string;
  className?: string;
  large?: boolean;
}

export default function SearchBar({ placeholder = 'Search for a car...', className = '', large = false }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CarTrim[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await api.searchCars({ q: query });
        setResults(data.slice(0, 8));
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (car: CarTrim) => {
    setOpen(false);
    setQuery('');
    navigate(`/car/${car.trim_id}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setOpen(false);
      navigate(`/browse?q=${encodeURIComponent(query)}`);
    }
  };

  return (
    <div ref={ref} className={`relative ${className}`}>
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 ${large ? 'w-5 h-5' : 'w-4 h-4'}`} />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setOpen(true)}
            placeholder={placeholder}
            className={`w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all
              ${large ? 'pl-12 pr-12 py-4 text-lg' : 'pl-10 pr-10 py-2.5 text-sm'}`}
          />
          {(query || loading) && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {loading ? (
                <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
              ) : (
                <button
                  type="button"
                  onClick={() => { setQuery(''); setResults([]); setOpen(false); }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </form>

      {/* Dropdown */}
      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden animate-fade-in">
          {results.map(car => (
            <button
              key={car.trim_id}
              onClick={() => handleSelect(car)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left group"
            >
              <div>
                <div className="font-medium text-gray-900 dark:text-white text-sm">
                  {car.year} {car.make_name} {car.model_name}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {car.trim_name} {car.body_style && `· ${car.body_style}`} {car.drivetrain && `· ${car.drivetrain}`}
                </div>
              </div>
              <div className="text-right ml-4 shrink-0">
                {car.current_price && (
                  <div className="text-sm font-semibold text-primary-600 dark:text-primary-400">
                    ${car.current_price.toLocaleString()}
                  </div>
                )}
                {car.fuel_combined && car.fuel_combined > 0 && (
                  <div className="text-xs text-gray-400">{car.fuel_combined} mpg</div>
                )}
              </div>
            </button>
          ))}
          <div className="border-t border-gray-100 dark:border-gray-700 px-4 py-2">
            <button
              onClick={handleSubmit as unknown as React.MouseEventHandler}
              className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
            >
              View all results for "{query}"
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
