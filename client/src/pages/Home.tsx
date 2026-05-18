import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, TrendingUp, Shield, BarChart2, RefreshCw } from 'lucide-react';
import SearchBar from '../components/SearchBar';
import CarCard from '../components/CarCard';
import { api, CarTrim } from '../api/client';

const FEATURES = [
  {
    icon: BarChart2,
    title: '24-Month Price History',
    desc: 'Track how market prices have changed over time with interactive charts.',
    color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20',
  },
  {
    icon: TrendingUp,
    title: 'Depreciation Modeling',
    desc: 'Realistic price computation based on age, mileage, and seasonal demand.',
    color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20',
  },
  {
    icon: Shield,
    title: 'NHTSA Safety Data',
    desc: 'Official government crash test ratings for every vehicle.',
    color: 'text-violet-500 bg-violet-50 dark:bg-violet-900/20',
  },
  {
    icon: RefreshCw,
    title: 'Daily Price Updates',
    desc: 'Prices refresh automatically every night with the latest market data.',
    color: 'text-orange-500 bg-orange-50 dark:bg-orange-900/20',
  },
];

const BODY_STYLES = ['Sedan', 'SUV', 'Pickup Truck', 'Coupe', 'Convertible', 'Wagon'];

export default function Home() {
  const [popular, setPopular] = useState<CarTrim[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);

  useEffect(() => {
    api.getPopularCars()
      .then(data => setPopular(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = selectedStyle
    ? popular.filter(c => c.body_style === selectedStyle)
    : popular;

  return (
    <div>
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-gray-900 via-primary-950 to-gray-900 text-white overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-64 h-64 bg-primary-500 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-80 h-80 bg-blue-500 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 text-sm mb-6">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span>Prices updated daily</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight mb-4">
              Find Your Car's
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-blue-300"> True Value</span>
            </h1>

            <p className="text-lg text-gray-300 mb-8 max-w-xl mx-auto">
              Detailed specs, NHTSA safety ratings, and 24 months of market pricing for 50+ popular vehicles.
            </p>

            <SearchBar
              large
              placeholder="Search by make, model, or year..."
              className="max-w-2xl mx-auto"
            />

            <div className="flex flex-wrap justify-center gap-2 mt-4">
              {['Toyota Camry', 'Ford F-150', 'Tesla Model 3', 'BMW 3 Series'].map(s => (
                <Link
                  key={s}
                  to={`/browse?q=${encodeURIComponent(s)}`}
                  className="text-sm text-gray-400 hover:text-white transition-colors px-3 py-1 rounded-full hover:bg-white/10"
                >
                  {s}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map(f => (
            <div key={f.title} className="card p-4 hover:shadow-md transition-shadow">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${f.color}`}>
                <f.icon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">{f.title}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Popular cars */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="section-title">Popular Vehicles</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Most-searched cars with complete specs and pricing</p>
          </div>
          <Link
            to="/browse"
            className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline"
          >
            Browse all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Filter chips */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setSelectedStyle(null)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              selectedStyle === null
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            All
          </button>
          {BODY_STYLES.map(style => (
            <button
              key={style}
              onClick={() => setSelectedStyle(style === selectedStyle ? null : style)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                selectedStyle === style
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {style}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="card h-64 animate-pulse">
                <div className="h-36 bg-gray-200 dark:bg-gray-800 rounded-t-xl" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-fade-in">
              {filtered.map(car => (
                <CarCard key={car.trim_id} car={car} />
              ))}
            </div>
            {filtered.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                No popular cars found for this category.
              </div>
            )}
          </>
        )}

        <div className="mt-6 text-center sm:hidden">
          <Link to="/browse" className="btn-primary inline-flex items-center gap-2">
            Browse all vehicles <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-400">
          <p>CarSpecs — Vehicle specs & pricing data. Pricing computed using depreciation modeling.</p>
          <p className="mt-1 text-xs">Data sources: NHTSA, manufacturer specifications. Prices are estimates only.</p>
        </div>
      </footer>
    </div>
  );
}
