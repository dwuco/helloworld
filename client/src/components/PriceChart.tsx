import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  AreaChart,
} from 'recharts';
import { PricePoint } from '../api/client';
import { TrendingDown, TrendingUp, DollarSign } from 'lucide-react';

interface PriceChartProps {
  history: PricePoint[];
  msrpNew?: number | null;
  currentPrice?: number | null;
  priceChange1y?: number | null;
  priceChange1yPct?: number | null;
}

function formatPrice(val: number) {
  if (val >= 1000) return `$${(val / 1000).toFixed(0)}k`;
  return `$${val}`;
}

function formatMonth(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; payload: PricePoint }>;
  label?: string;
}

function CustomTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
        {new Date(d.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
      </div>
      <div className="text-lg font-bold text-gray-900 dark:text-white">
        ${payload[0].value.toLocaleString()}
      </div>
      <div className="text-xs text-gray-400 capitalize">{d.type} price</div>
    </div>
  );
}

export default function PriceChart({ history, msrpNew, currentPrice, priceChange1y, priceChange1yPct }: PriceChartProps) {
  if (!history || history.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
        No price history available
      </div>
    );
  }

  const minPrice = Math.min(...history.map(h => h.price));
  const maxPrice = Math.max(...history.map(h => h.price));
  const domain = [Math.floor(minPrice * 0.95 / 1000) * 1000, Math.ceil(maxPrice * 1.05 / 1000) * 1000];

  const trendPositive = (priceChange1y ?? 0) > 0;

  return (
    <div>
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Current Market</div>
          <div className="text-lg font-bold text-gray-900 dark:text-white">
            {currentPrice ? `$${currentPrice.toLocaleString()}` : 'N/A'}
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Original MSRP</div>
          <div className="text-lg font-bold text-gray-900 dark:text-white">
            {msrpNew ? `$${msrpNew.toLocaleString()}` : 'N/A'}
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">1-Year Change</div>
          {priceChange1y !== null && priceChange1y !== undefined ? (
            <div className={`text-lg font-bold flex items-center gap-1 ${
              trendPositive ? 'text-red-500' : 'text-green-500'
            }`}>
              {trendPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {trendPositive ? '+' : ''}{priceChange1y < 0 ? '-' : ''}${Math.abs(priceChange1y).toLocaleString()}
            </div>
          ) : (
            <div className="text-lg font-bold text-gray-400">—</div>
          )}
        </div>
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">1-Year % Change</div>
          {priceChange1yPct !== null && priceChange1yPct !== undefined ? (
            <div className={`text-lg font-bold ${
              priceChange1yPct > 0 ? 'text-red-500' : 'text-green-500'
            }`}>
              {priceChange1yPct > 0 ? '+' : ''}{priceChange1yPct.toFixed(1)}%
            </div>
          ) : (
            <div className="text-lg font-bold text-gray-400">—</div>
          )}
        </div>
      </div>

      {/* Depreciation from MSRP */}
      {msrpNew && currentPrice && (
        <div className="mb-4 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <DollarSign className="w-4 h-4" />
          <span>
            Depreciated <strong className="text-gray-900 dark:text-white">{Math.round((1 - currentPrice / msrpNew) * 100)}%</strong> from original MSRP
            (<strong className="text-gray-900 dark:text-white">${(msrpNew - currentPrice).toLocaleString()}</strong> lost)
          </span>
        </div>
      )}

      {/* Chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={history} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <defs>
              <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-200 dark:text-gray-700" opacity={0.5} />
            <XAxis
              dataKey="date"
              tickFormatter={formatMonth}
              tick={{ fontSize: 11, fill: 'currentColor' }}
              className="text-gray-400"
              tickLine={false}
              axisLine={false}
              interval={Math.floor(history.length / 6)}
            />
            <YAxis
              tickFormatter={formatPrice}
              tick={{ fontSize: 11, fill: 'currentColor' }}
              className="text-gray-400"
              tickLine={false}
              axisLine={false}
              domain={domain}
              width={50}
            />
            <Tooltip content={<CustomTooltip />} />
            {msrpNew && (
              <ReferenceLine
                y={msrpNew}
                stroke="#94a3b8"
                strokeDasharray="4 4"
                label={{ value: 'MSRP', position: 'right', fontSize: 10, fill: '#94a3b8' }}
              />
            )}
            <Area
              type="monotone"
              dataKey="price"
              stroke="#3b82f6"
              strokeWidth={2.5}
              fill="url(#priceGradient)"
              dot={false}
              activeDot={{ r: 5, strokeWidth: 2, fill: '#3b82f6', stroke: '#fff' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 text-xs text-gray-400 text-center">
        24-month historical market pricing · Prices computed using depreciation model
      </div>
    </div>
  );
}
