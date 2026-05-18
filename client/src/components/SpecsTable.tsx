import { CarSpecs } from '../api/client';
import { Zap, Gauge, RotateCw, Fuel, Ruler, Shield, Users, Package } from 'lucide-react';

interface SpecsTableProps {
  specs: CarSpecs;
  msrpNew?: number | null;
}

interface SpecRow {
  label: string;
  value: string | number | null | undefined;
  unit?: string;
}

function SpecSection({ title, icon: Icon, rows }: { title: string; icon: React.ElementType; rows: SpecRow[] }) {
  const validRows = rows.filter(r => r.value !== null && r.value !== undefined && r.value !== '');
  if (validRows.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary-600 dark:text-primary-400" />
        </div>
        <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
      </div>
      <div className="divide-y divide-gray-100 dark:divide-gray-800 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        {validRows.map((row, i) => (
          <div key={i} className="flex items-center justify-between px-4 py-2.5 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
            <span className="text-sm text-gray-500 dark:text-gray-400">{row.label}</span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {row.value}{row.unit ? ` ${row.unit}` : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StarRating({ value, max = 5 }: { value: number | null; max?: number }) {
  if (!value) return <span className="text-gray-400 text-sm">N/A</span>;
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: max }).map((_, i) => (
        <div
          key={i}
          className={`w-3.5 h-3.5 rounded-sm ${i < value ? 'bg-yellow-400' : 'bg-gray-200 dark:bg-gray-700'}`}
        />
      ))}
      <span className="text-xs text-gray-500 ml-1">{value}/{max}</span>
    </div>
  );
}

export default function SpecsTable({ specs, msrpNew }: SpecsTableProps) {
  const isElectric = specs.fuel_type === 'Electric';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
      {/* Engine */}
      <SpecSection
        title="Engine & Performance"
        icon={Zap}
        rows={[
          { label: 'Engine Type', value: specs.engine_type },
          { label: 'Displacement', value: specs.engine_displacement, unit: 'L' },
          { label: 'Cylinders', value: specs.engine_cylinders },
          { label: 'Horsepower', value: specs.engine_horsepower, unit: 'hp' },
          { label: 'Torque', value: specs.engine_torque, unit: 'lb-ft' },
        ]}
      />

      {/* Transmission & Drivetrain */}
      <SpecSection
        title="Transmission & Drive"
        icon={RotateCw}
        rows={[
          { label: 'Transmission', value: specs.transmission_type },
          { label: 'Gears', value: specs.transmission_gears },
          { label: 'Drivetrain', value: specs.drivetrain },
        ]}
      />

      {/* Fuel Economy */}
      {!isElectric && (
        <SpecSection
          title="Fuel Economy"
          icon={Fuel}
          rows={[
            { label: 'City', value: specs.fuel_city, unit: 'mpg' },
            { label: 'Highway', value: specs.fuel_highway, unit: 'mpg' },
            { label: 'Combined', value: specs.fuel_combined, unit: 'mpg' },
            { label: 'Fuel Type', value: specs.fuel_type },
          ]}
        />
      )}

      {/* Dimensions */}
      <SpecSection
        title="Dimensions & Weight"
        icon={Ruler}
        rows={[
          { label: 'Length', value: specs.length_inches ? `${specs.length_inches}"` : null },
          { label: 'Width', value: specs.width_inches ? `${specs.width_inches}"` : null },
          { label: 'Height', value: specs.height_inches ? `${specs.height_inches}"` : null },
          { label: 'Wheelbase', value: specs.wheelbase_inches ? `${specs.wheelbase_inches}"` : null },
          { label: 'Curb Weight', value: specs.curb_weight_lbs ? `${specs.curb_weight_lbs.toLocaleString()} lbs` : null },
        ]}
      />

      {/* Capacity */}
      <SpecSection
        title="Capacity"
        icon={Users}
        rows={[
          { label: 'Seating', value: specs.seating_capacity, unit: 'passengers' },
          { label: 'Cargo Volume', value: specs.cargo_volume_cuft, unit: 'cu ft' },
          { label: 'Towing Capacity', value: specs.towing_capacity_lbs ? `${specs.towing_capacity_lbs.toLocaleString()} lbs` : null },
        ]}
      />

      {/* Pricing */}
      {msrpNew && (
        <SpecSection
          title="Pricing"
          icon={Gauge}
          rows={[
            { label: 'Original MSRP', value: `$${msrpNew.toLocaleString()}` },
          ]}
        />
      )}

      {/* Safety */}
      {(specs.nhtsa_overall_rating || specs.nhtsa_frontal_rating || specs.nhtsa_side_rating || specs.nhtsa_rollover_rating) && (
        <div className="mb-6 md:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <Shield className="w-4 h-4 text-primary-600 dark:text-primary-400" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">NHTSA Safety Ratings</h3>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
            {[
              { label: 'Overall', value: specs.nhtsa_overall_rating },
              { label: 'Frontal Crash', value: specs.nhtsa_frontal_rating },
              { label: 'Side Crash', value: specs.nhtsa_side_rating },
              { label: 'Rollover', value: specs.nhtsa_rollover_rating },
            ].filter(r => r.value !== null).map((row, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-2.5 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <span className="text-sm text-gray-500 dark:text-gray-400">{row.label}</span>
                <StarRating value={row.value} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* EV info */}
      {isElectric && (
        <SpecSection
          title="Electric Vehicle"
          icon={Package}
          rows={[
            { label: 'Fuel Type', value: 'Electric' },
            { label: 'Engine Type', value: specs.engine_type },
          ]}
        />
      )}
    </div>
  );
}
