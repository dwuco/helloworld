import { Link } from 'react-router-dom';
import { Zap, Fuel, Navigation, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { CarTrim } from '../api/client';

interface CarCardProps {
  car: CarTrim;
  priceChange?: number | null;
}

const BODY_STYLE_COLORS: Record<string, string> = {
  'Sedan': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  'SUV': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  'Pickup Truck': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  'Coupe': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  'Convertible': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  'Wagon': 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
  'Hatchback': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
};

const CAR_BG_COLORS = [
  'from-blue-500 to-blue-700',
  'from-emerald-500 to-emerald-700',
  'from-violet-500 to-violet-700',
  'from-orange-500 to-orange-700',
  'from-rose-500 to-rose-700',
  'from-cyan-500 to-cyan-700',
  'from-amber-500 to-amber-700',
  'from-indigo-500 to-indigo-700',
];

function getCarGradient(trimId: string): string {
  let hash = 0;
  for (let i = 0; i < trimId.length; i++) hash = (hash * 31 + trimId.charCodeAt(i)) & 0xffffffff;
  return CAR_BG_COLORS[Math.abs(hash) % CAR_BG_COLORS.length];
}

function CarSilhouette({ bodyStyle }: { bodyStyle: string | null }) {
  // Simple SVG silhouettes based on body style
  if (bodyStyle === 'Pickup Truck') {
    return (
      <svg viewBox="0 0 200 80" className="w-full h-full opacity-30" fill="currentColor">
        <path d="M10 55 Q15 35 40 35 L90 35 L90 25 L130 25 L130 35 L185 35 Q195 35 195 45 L195 55 Q195 60 190 60 L175 60 Q175 50 165 50 Q155 50 155 60 L55 60 Q55 50 45 50 Q35 50 35 60 L15 60 Q10 60 10 55 Z" />
      </svg>
    );
  }
  if (bodyStyle === 'SUV') {
    return (
      <svg viewBox="0 0 200 80" className="w-full h-full opacity-30" fill="currentColor">
        <path d="M10 55 Q15 25 45 20 L155 20 Q185 20 190 40 L195 55 Q195 60 190 60 L170 60 Q170 50 160 50 Q150 50 150 60 L50 60 Q50 50 40 50 Q30 50 30 60 L15 60 Q10 60 10 55 Z" />
      </svg>
    );
  }
  if (bodyStyle === 'Coupe' || bodyStyle === 'Convertible') {
    return (
      <svg viewBox="0 0 200 80" className="w-full h-full opacity-30" fill="currentColor">
        <path d="M10 55 Q15 45 30 40 L60 25 Q90 15 120 15 Q145 15 165 30 L190 45 Q195 50 195 55 Q195 60 190 60 L170 60 Q170 50 160 50 Q150 50 150 60 L50 60 Q50 50 40 50 Q30 50 30 60 L15 60 Q10 60 10 55 Z" />
      </svg>
    );
  }
  // Default sedan
  return (
    <svg viewBox="0 0 200 80" className="w-full h-full opacity-30" fill="currentColor">
      <path d="M10 55 Q15 45 30 40 L50 28 Q75 18 110 18 Q140 18 160 28 L180 40 Q195 45 195 55 Q195 60 190 60 L170 60 Q170 50 160 50 Q150 50 150 60 L50 60 Q50 50 40 50 Q30 50 30 60 L15 60 Q10 60 10 55 Z" />
    </svg>
  );
}

export default function CarCard({ car, priceChange }: CarCardProps) {
  const gradient = getCarGradient(car.trim_id);
  const bodyColor = BODY_STYLE_COLORS[car.body_style || ''] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
  const isElectric = car.fuel_combined === null || car.fuel_combined === 0;

  return (
    <Link
      to={`/car/${car.trim_id}`}
      className="card hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden group block"
    >
      {/* Hero image area */}
      <div className={`relative h-36 bg-gradient-to-br ${gradient} flex items-center justify-center overflow-hidden`}>
        <div className="absolute inset-0 text-white">
          <CarSilhouette bodyStyle={car.body_style} />
        </div>
        <div className="relative text-center text-white px-4">
          <div className="text-2xl font-black tracking-tight drop-shadow">
            {car.year}
          </div>
          <div className="text-sm font-semibold opacity-90 truncate max-w-[160px]">
            {car.make_name} {car.model_name}
          </div>
        </div>
        {car.is_popular === 1 && (
          <div className="absolute top-2 right-2 bg-white/20 backdrop-blur-sm text-white text-xs font-medium px-2 py-0.5 rounded-full border border-white/30">
            Popular
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm leading-tight">
              {car.make_name} {car.model_name} {car.trim_name}
            </h3>
            {car.body_style && (
              <span className={`badge mt-1 ${bodyColor}`}>
                {car.body_style}
              </span>
            )}
          </div>
          <div className="text-right shrink-0">
            {car.current_price ? (
              <div className="text-base font-bold text-gray-900 dark:text-white">
                ${car.current_price.toLocaleString()}
              </div>
            ) : car.msrp_new ? (
              <div className="text-base font-bold text-gray-900 dark:text-white">
                ${car.msrp_new.toLocaleString()}
              </div>
            ) : null}
            <div className="text-xs text-gray-400">
              {car.current_price ? 'Market' : 'MSRP'}
            </div>
          </div>
        </div>

        {/* Specs row */}
        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
          {car.engine_horsepower && (
            <div className="flex items-center gap-1">
              <Zap className="w-3 h-3" />
              <span>{car.engine_horsepower} hp</span>
            </div>
          )}
          {!isElectric && car.fuel_combined && car.fuel_combined > 0 ? (
            <div className="flex items-center gap-1">
              <Fuel className="w-3 h-3" />
              <span>{car.fuel_combined} mpg</span>
            </div>
          ) : isElectric ? (
            <div className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-green-500" />
              <span className="text-green-600 dark:text-green-400">Electric</span>
            </div>
          ) : null}
          {car.drivetrain && (
            <div className="flex items-center gap-1">
              <Navigation className="w-3 h-3" />
              <span>{car.drivetrain}</span>
            </div>
          )}
        </div>

        {/* Price change indicator */}
        {priceChange !== null && priceChange !== undefined && (
          <div className={`mt-2 flex items-center gap-1 text-xs font-medium ${
            priceChange < 0 ? 'text-green-600 dark:text-green-400' : priceChange > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-400'
          }`}>
            {priceChange < 0 ? <TrendingDown className="w-3 h-3" /> : priceChange > 0 ? <TrendingUp className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
            <span>{priceChange < 0 ? '' : '+'}{Math.round(priceChange / 100) * 100 > 0 ? '+' : ''}{priceChange < 0 ? '-' : ''}${Math.abs(Math.round(priceChange / 100) * 100).toLocaleString()} vs 1yr ago</span>
          </div>
        )}
      </div>
    </Link>
  );
}
