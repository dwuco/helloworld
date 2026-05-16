import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Star, Fuel, Zap, Navigation, Users,
  ExternalLink, Package, Info, BarChart2
} from 'lucide-react';
import SpecsTable from '../components/SpecsTable';
import PriceChart from '../components/PriceChart';
import CarCard from '../components/CarCard';
import { api, CarDetail as CarDetailType, PriceData } from '../api/client';

const FUEL_TYPE_BADGE: Record<string, string> = {
  'Electric': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  'Gasoline': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  'Hybrid': 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
  'Diesel': 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

const GRADIENT_MAP: Record<string, string> = {
  Toyota: 'from-red-600 to-red-800',
  Honda: 'from-red-500 to-red-700',
  Ford: 'from-blue-600 to-blue-800',
  Chevrolet: 'from-yellow-500 to-orange-600',
  Tesla: 'from-red-700 to-gray-900',
  BMW: 'from-blue-700 to-gray-800',
  'Mercedes-Benz': 'from-gray-600 to-gray-900',
  Audi: 'from-gray-700 to-gray-900',
  Nissan: 'from-red-600 to-gray-800',
  Jeep: 'from-green-700 to-gray-800',
  Hyundai: 'from-blue-500 to-blue-800',
  Kia: 'from-red-500 to-gray-700',
  Subaru: 'from-blue-600 to-blue-900',
  Dodge: 'from-gray-700 to-red-800',
  Mazda: 'from-red-600 to-red-900',
  Volkswagen: 'from-blue-500 to-blue-800',
  GMC: 'from-red-600 to-gray-800',
  Ram: 'from-gray-600 to-gray-900',
  Porsche: 'from-yellow-500 to-orange-700',
  Cadillac: 'from-gray-600 to-purple-900',
  Lexus: 'from-gray-700 to-gray-900',
  Rivian: 'from-teal-600 to-teal-900',
  Lucid: 'from-purple-600 to-purple-900',
};

function getGradient(make: string): string {
  return GRADIENT_MAP[make] || 'from-gray-600 to-gray-900';
}

function StarRow({ label, value }: { label: string; value: number | null }) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`w-3.5 h-3.5 ${i < value ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}
          />
        ))}
        <span className="text-xs text-gray-400 ml-1">({value}/5)</span>
      </div>
    </div>
  );
}

type TabId = 'overview' | 'specs' | 'pricing';

export default function CarDetail() {
  const { trimId } = useParams<{ trimId: string }>();
  const [car, setCar] = useState<CarDetailType | null>(null);
  const [prices, setPrices] = useState<PriceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  useEffect(() => {
    if (!trimId) return;
    setLoading(true);
    setError(null);

    Promise.all([
      api.getCarDetail(trimId),
      api.getPrices(trimId),
    ]).then(([carData, priceData]) => {
      setCar(carData);
      setPrices(priceData);
    }).catch(err => {
      setError(err.message || 'Failed to load car data');
    }).finally(() => setLoading(false));
  }, [trimId]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-6 w-32 bg-gray-200 dark:bg-gray-800 rounded mb-6" />
          <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-2xl mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-3/4" />
              <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/2" />
              <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-2/3" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !car) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link to="/browse" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Browse
        </Link>
        <div className="text-center py-20">
          <div className="text-6xl mb-4">😕</div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Car not found</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">{error}</p>
          <Link to="/browse" className="btn-primary">Browse all cars</Link>
        </div>
      </div>
    );
  }

  const specs = car.specs;
  const isElectric = specs?.fuel_type === 'Electric';
  const gradient = getGradient(car.make_name);

  const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Overview', icon: Info },
    { id: 'specs', label: 'Full Specs', icon: Package },
    { id: 'pricing', label: 'Price History', icon: BarChart2 },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back */}
      <Link to="/browse" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white mb-6 w-fit">
        <ArrowLeft className="w-4 h-4" /> Back to Browse
      </Link>

      {/* Hero */}
      <div className={`relative rounded-2xl overflow-hidden bg-gradient-to-br ${gradient} mb-6`}>
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl" />
        </div>
        <div className="relative px-6 py-8 sm:px-10 sm:py-12">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="text-white">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                {car.body_style && (
                  <span className="bg-white/20 backdrop-blur-sm text-white text-xs font-medium px-2.5 py-1 rounded-full border border-white/30">
                    {car.body_style}
                  </span>
                )}
                {isElectric && (
                  <span className="bg-green-400/20 backdrop-blur-sm text-green-300 text-xs font-medium px-2.5 py-1 rounded-full border border-green-400/30">
                    Electric
                  </span>
                )}
                {car.country && (
                  <span className="bg-white/10 backdrop-blur-sm text-white/70 text-xs px-2.5 py-1 rounded-full">
                    {car.country}
                  </span>
                )}
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
                {car.year} {car.make_name} {car.model_name}
              </h1>
              <p className="text-white/70 mt-1 text-lg">{car.trim_name}</p>
            </div>

            <div className="text-right text-white">
              {prices?.current_price && (
                <div>
                  <div className="text-xs text-white/60 mb-0.5">Current Market Price</div>
                  <div className="text-3xl font-black">${prices.current_price.toLocaleString()}</div>
                  {car.msrp_new && (
                    <div className="text-sm text-white/60 mt-0.5">
                      MSRP: ${car.msrp_new.toLocaleString()}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Key stats */}
          {specs && (
            <div className="mt-6 flex flex-wrap gap-4">
              {specs.engine_horsepower && (
                <div className="flex items-center gap-2 text-white/90">
                  <Zap className="w-4 h-4 text-yellow-300" />
                  <span className="text-sm">{specs.engine_horsepower} hp</span>
                </div>
              )}
              {!isElectric && specs.fuel_combined && specs.fuel_combined > 0 && (
                <div className="flex items-center gap-2 text-white/90">
                  <Fuel className="w-4 h-4 text-green-300" />
                  <span className="text-sm">{specs.fuel_combined} mpg combined</span>
                </div>
              )}
              {specs.drivetrain && (
                <div className="flex items-center gap-2 text-white/90">
                  <Navigation className="w-4 h-4 text-blue-300" />
                  <span className="text-sm">{specs.drivetrain}</span>
                </div>
              )}
              {specs.seating_capacity && (
                <div className="flex items-center gap-2 text-white/90">
                  <Users className="w-4 h-4 text-purple-300" />
                  <span className="text-sm">{specs.seating_capacity} seats</span>
                </div>
              )}
              {specs.nhtsa_overall_rating && (
                <div className="flex items-center gap-1.5 text-white/90">
                  <Star className="w-4 h-4 fill-yellow-300 text-yellow-300" />
                  <span className="text-sm">NHTSA {specs.nhtsa_overall_rating}/5</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200 dark:border-gray-800">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === tab.id
                ? 'border-primary-600 text-primary-600 dark:text-primary-400 dark:border-primary-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          {/* Left: quick specs */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick specs grid */}
            {specs && (
              <div className="card p-6">
                <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Key Specifications</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {[
                    { label: 'Engine', value: specs.engine_type },
                    { label: 'Horsepower', value: specs.engine_horsepower ? `${specs.engine_horsepower} hp` : null },
                    { label: 'Torque', value: specs.engine_torque ? `${specs.engine_torque} lb-ft` : null },
                    { label: 'Transmission', value: specs.transmission_type },
                    { label: 'Drivetrain', value: specs.drivetrain },
                    { label: isElectric ? 'Powertrain' : 'Fuel Economy', value: isElectric ? 'Electric' : specs.fuel_combined ? `${specs.fuel_combined} mpg` : null },
                    { label: 'Body Style', value: car.body_style },
                    { label: 'Seating', value: specs.seating_capacity ? `${specs.seating_capacity} passengers` : null },
                    { label: 'Curb Weight', value: specs.curb_weight_lbs ? `${specs.curb_weight_lbs.toLocaleString()} lbs` : null },
                  ].filter(s => s.value).map((stat, i) => (
                    <div key={i} className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3">
                      <div className="text-xs text-gray-400 mb-1">{stat.label}</div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">{stat.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Price chart preview */}
            {prices && prices.history.length > 0 && (
              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-gray-900 dark:text-white">Market Price Trend</h2>
                  <button
                    onClick={() => setActiveTab('pricing')}
                    className="text-sm text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
                  >
                    Full history <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
                <PriceChart
                  history={prices.history}
                  msrpNew={prices.msrp_new}
                  currentPrice={prices.current_price}
                  priceChange1y={prices.price_change_1y}
                  priceChange1yPct={prices.price_change_1y_pct}
                />
              </div>
            )}
          </div>

          {/* Right: sidebar */}
          <div className="space-y-6">
            {/* Fuel/power badge */}
            {specs?.fuel_type && (
              <div className="card p-4">
                <div className="flex items-center gap-3">
                  {isElectric ? <Zap className="w-8 h-8 text-green-500" /> : <Fuel className="w-8 h-8 text-orange-500" />}
                  <div>
                    <div className={`badge ${FUEL_TYPE_BADGE[specs.fuel_type] || 'bg-gray-100 text-gray-700'}`}>
                      {specs.fuel_type}
                    </div>
                    {!isElectric && specs.fuel_combined && (
                      <div className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                        {specs.fuel_combined} <span className="text-sm font-normal text-gray-400">mpg combined</span>
                      </div>
                    )}
                    {!isElectric && specs.fuel_city && specs.fuel_highway && (
                      <div className="text-xs text-gray-400 mt-0.5">
                        {specs.fuel_city} city / {specs.fuel_highway} hwy
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Safety */}
            {specs && (specs.nhtsa_overall_rating || specs.nhtsa_frontal_rating) && (
              <div className="card p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-400" /> NHTSA Safety
                </h3>
                <StarRow label="Overall" value={specs.nhtsa_overall_rating} />
                <StarRow label="Frontal Crash" value={specs.nhtsa_frontal_rating} />
                <StarRow label="Side Crash" value={specs.nhtsa_side_rating} />
                <StarRow label="Rollover" value={specs.nhtsa_rollover_rating} />
              </div>
            )}

            {/* Dimensions */}
            {specs && specs.length_inches && (
              <div className="card p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Dimensions</h3>
                <div className="space-y-1.5">
                  {[
                    { label: 'Length', value: `${specs.length_inches}"` },
                    { label: 'Width', value: `${specs.width_inches}"` },
                    { label: 'Height', value: `${specs.height_inches}"` },
                    { label: 'Wheelbase', value: `${specs.wheelbase_inches}"` },
                  ].filter(d => d.value !== '"').map((d, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">{d.label}</span>
                      <span className="font-medium text-gray-900 dark:text-white">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Towing */}
            {specs?.towing_capacity_lbs && (
              <div className="card p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Towing Capacity</h3>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {specs.towing_capacity_lbs.toLocaleString()} <span className="text-sm font-normal text-gray-400">lbs</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'specs' && (
        <div className="card p-6 animate-fade-in">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-6 text-lg">Complete Specifications</h2>
          {specs ? (
            <SpecsTable specs={specs} msrpNew={car.msrp_new} />
          ) : (
            <p className="text-gray-400">No detailed specifications available.</p>
          )}
        </div>
      )}

      {activeTab === 'pricing' && (
        <div className="card p-6 animate-fade-in">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-6 text-lg">
            24-Month Price History
          </h2>
          {prices ? (
            <PriceChart
              history={prices.history}
              msrpNew={prices.msrp_new}
              currentPrice={prices.current_price}
              priceChange1y={prices.price_change_1y}
              priceChange1yPct={prices.price_change_1y_pct}
            />
          ) : (
            <p className="text-gray-400">No pricing data available.</p>
          )}
        </div>
      )}

      {/* Similar cars */}
      {car.similar_cars && car.similar_cars.length > 0 && (
        <div className="mt-10">
          <h2 className="section-title mb-4">Similar Vehicles</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {car.similar_cars.map(c => (
              <CarCard key={c.trim_id} car={c} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
