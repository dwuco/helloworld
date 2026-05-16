const BASE = '/api';

export interface Make {
  make_id: string;
  name: string;
  country: string | null;
  model_count: number;
}

export interface CarModel {
  model_id: string;
  make_id: string;
  name: string;
  body_style: string | null;
  trim_count: number;
  min_year: number | null;
  max_year: number | null;
}

export interface CarTrim {
  trim_id: string;
  year: number;
  trim_name: string;
  msrp_new: number | null;
  is_popular: number;
  model_name: string;
  body_style: string | null;
  make_name: string;
  make_id: string;
  model_id: string;
  engine_horsepower: number | null;
  fuel_combined: number | null;
  drivetrain: string | null;
  current_price: number | null;
}

export interface CarSpecs {
  trim_id: string;
  // Engine
  engine_displacement: number | null;
  engine_cylinders: number | null;
  engine_horsepower: number | null;
  engine_torque: number | null;
  engine_type: string | null;
  // Transmission
  transmission_type: string | null;
  transmission_gears: number | null;
  // Drivetrain
  drivetrain: string | null;
  // Fuel
  fuel_city: number | null;
  fuel_highway: number | null;
  fuel_combined: number | null;
  fuel_type: string | null;
  // Dimensions
  length_inches: number | null;
  width_inches: number | null;
  height_inches: number | null;
  wheelbase_inches: number | null;
  curb_weight_lbs: number | null;
  // Safety
  nhtsa_overall_rating: number | null;
  nhtsa_frontal_rating: number | null;
  nhtsa_side_rating: number | null;
  nhtsa_rollover_rating: number | null;
  // Other
  seating_capacity: number | null;
  cargo_volume_cuft: number | null;
  towing_capacity_lbs: number | null;
}

export interface CarDetail extends CarTrim {
  country: string | null;
  specs: CarSpecs | null;
  similar_cars: CarTrim[];
}

export interface PricePoint {
  date: string;
  price: number;
  type: string;
}

export interface PriceData {
  trim_id: string;
  make: string;
  model: string;
  year: number;
  trim: string;
  msrp_new: number | null;
  current_price: number | null;
  price_change_1y: number | null;
  price_change_1y_pct: number | null;
  history: PricePoint[];
}

export interface SearchParams {
  q?: string;
  make?: string;
  model?: string;
  year?: string | number;
  body_style?: string;
  min_price?: string | number;
  max_price?: string | number;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.data as T;
}

export const api = {
  getMakes: () => get<Make[]>('/makes'),

  getModels: (makeId: string) => get<CarModel[]>(`/makes/${makeId}/models`),

  getYears: (modelId: string) => get<number[]>(`/models/${modelId}/years`),

  searchCars: (params: SearchParams) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') qs.set(k, String(v));
    });
    return get<CarTrim[]>(`/cars/search?${qs.toString()}`);
  },

  getPopularCars: () => get<CarTrim[]>('/cars/popular'),

  getCarDetail: (trimId: string) => get<CarDetail>(`/cars/${trimId}`),

  getPrices: (trimId: string) => get<PriceData>(`/prices/${trimId}`),

  triggerSync: async () => {
    const res = await fetch(`${BASE}/admin/sync`, { method: 'POST' });
    const data = await res.json();
    return data;
  },
};
