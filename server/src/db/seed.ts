import { getDb } from './database';
import { generateHistoricalPrices } from '../services/pricingService';

interface CarSeedData {
  make_id: string;
  make_name: string;
  country: string;
  model_id: string;
  model_name: string;
  body_style: string;
  year: number;
  trim_name: string;
  msrp_new: number;
  is_popular: number;
  specs: {
    engine_displacement: number | null;
    engine_cylinders: number | null;
    engine_horsepower: number | null;
    engine_torque: number | null;
    engine_type: string | null;
    transmission_type: string | null;
    transmission_gears: number | null;
    drivetrain: string | null;
    fuel_city: number | null;
    fuel_highway: number | null;
    fuel_combined: number | null;
    fuel_type: string | null;
    length_inches: number | null;
    width_inches: number | null;
    height_inches: number | null;
    wheelbase_inches: number | null;
    curb_weight_lbs: number | null;
    nhtsa_overall_rating: number | null;
    nhtsa_frontal_rating: number | null;
    nhtsa_side_rating: number | null;
    nhtsa_rollover_rating: number | null;
    seating_capacity: number | null;
    cargo_volume_cuft: number | null;
    towing_capacity_lbs: number | null;
  };
}

const CARS: CarSeedData[] = [
  // ===== TOYOTA =====
  {
    make_id: 'toyota', make_name: 'Toyota', country: 'Japan',
    model_id: 'toyota_camry', model_name: 'Camry', body_style: 'Sedan',
    year: 2024, trim_name: 'LE', msrp_new: 27215, is_popular: 1,
    specs: {
      engine_displacement: 2.5, engine_cylinders: 4, engine_horsepower: 203, engine_torque: 184, engine_type: 'Inline-4',
      transmission_type: 'Automatic', transmission_gears: 8,
      drivetrain: 'FWD',
      fuel_city: 28, fuel_highway: 39, fuel_combined: 32, fuel_type: 'Gasoline',
      length_inches: 192.1, width_inches: 72.4, height_inches: 56.9, wheelbase_inches: 111.2, curb_weight_lbs: 3310,
      nhtsa_overall_rating: 5, nhtsa_frontal_rating: 5, nhtsa_side_rating: 5, nhtsa_rollover_rating: 4,
      seating_capacity: 5, cargo_volume_cuft: 15.1, towing_capacity_lbs: null,
    }
  },
  {
    make_id: 'toyota', make_name: 'Toyota', country: 'Japan',
    model_id: 'toyota_camry', model_name: 'Camry', body_style: 'Sedan',
    year: 2023, trim_name: 'XSE V6', msrp_new: 35600, is_popular: 0,
    specs: {
      engine_displacement: 3.5, engine_cylinders: 6, engine_horsepower: 301, engine_torque: 267, engine_type: 'V6',
      transmission_type: 'Automatic', transmission_gears: 8,
      drivetrain: 'FWD',
      fuel_city: 22, fuel_highway: 33, fuel_combined: 26, fuel_type: 'Gasoline',
      length_inches: 192.7, width_inches: 72.4, height_inches: 56.9, wheelbase_inches: 111.2, curb_weight_lbs: 3582,
      nhtsa_overall_rating: 5, nhtsa_frontal_rating: 5, nhtsa_side_rating: 5, nhtsa_rollover_rating: 4,
      seating_capacity: 5, cargo_volume_cuft: 15.1, towing_capacity_lbs: null,
    }
  },
  {
    make_id: 'toyota', make_name: 'Toyota', country: 'Japan',
    model_id: 'toyota_rav4', model_name: 'RAV4', body_style: 'SUV',
    year: 2024, trim_name: 'XLE', msrp_new: 31700, is_popular: 1,
    specs: {
      engine_displacement: 2.5, engine_cylinders: 4, engine_horsepower: 203, engine_torque: 184, engine_type: 'Inline-4',
      transmission_type: 'Automatic', transmission_gears: 8,
      drivetrain: 'AWD',
      fuel_city: 27, fuel_highway: 35, fuel_combined: 30, fuel_type: 'Gasoline',
      length_inches: 180.9, width_inches: 73.0, height_inches: 67.1, wheelbase_inches: 105.9, curb_weight_lbs: 3786,
      nhtsa_overall_rating: 5, nhtsa_frontal_rating: 5, nhtsa_side_rating: 5, nhtsa_rollover_rating: 4,
      seating_capacity: 5, cargo_volume_cuft: 37.6, towing_capacity_lbs: 1500,
    }
  },
  {
    make_id: 'toyota', make_name: 'Toyota', country: 'Japan',
    model_id: 'toyota_corolla', model_name: 'Corolla', body_style: 'Sedan',
    year: 2024, trim_name: 'LE', msrp_new: 22050, is_popular: 1,
    specs: {
      engine_displacement: 2.0, engine_cylinders: 4, engine_horsepower: 169, engine_torque: 151, engine_type: 'Inline-4',
      transmission_type: 'CVT', transmission_gears: null,
      drivetrain: 'FWD',
      fuel_city: 31, fuel_highway: 40, fuel_combined: 34, fuel_type: 'Gasoline',
      length_inches: 182.3, width_inches: 70.1, height_inches: 56.5, wheelbase_inches: 106.3, curb_weight_lbs: 2910,
      nhtsa_overall_rating: 5, nhtsa_frontal_rating: 5, nhtsa_side_rating: 5, nhtsa_rollover_rating: 5,
      seating_capacity: 5, cargo_volume_cuft: 13.1, towing_capacity_lbs: null,
    }
  },
  {
    make_id: 'toyota', make_name: 'Toyota', country: 'Japan',
    model_id: 'toyota_tacoma', model_name: 'Tacoma', body_style: 'Pickup Truck',
    year: 2024, trim_name: 'SR5', msrp_new: 36850, is_popular: 1,
    specs: {
      engine_displacement: 2.4, engine_cylinders: 4, engine_horsepower: 278, engine_torque: 317, engine_type: 'Inline-4 Turbo',
      transmission_type: 'Automatic', transmission_gears: 8,
      drivetrain: '4WD',
      fuel_city: 20, fuel_highway: 24, fuel_combined: 22, fuel_type: 'Gasoline',
      length_inches: 212.3, width_inches: 74.4, height_inches: 70.6, wheelbase_inches: 127.4, curb_weight_lbs: 4425,
      nhtsa_overall_rating: 4, nhtsa_frontal_rating: 4, nhtsa_side_rating: 5, nhtsa_rollover_rating: 3,
      seating_capacity: 5, cargo_volume_cuft: null, towing_capacity_lbs: 6500,
    }
  },
  {
    make_id: 'toyota', make_name: 'Toyota', country: 'Japan',
    model_id: 'toyota_highlander', model_name: 'Highlander', body_style: 'SUV',
    year: 2024, trim_name: 'LE', msrp_new: 39020, is_popular: 1,
    specs: {
      engine_displacement: 2.4, engine_cylinders: 4, engine_horsepower: 265, engine_torque: 310, engine_type: 'Inline-4 Turbo',
      transmission_type: 'Automatic', transmission_gears: 8,
      drivetrain: 'AWD',
      fuel_city: 21, fuel_highway: 29, fuel_combined: 24, fuel_type: 'Gasoline',
      length_inches: 194.9, width_inches: 76.0, height_inches: 68.1, wheelbase_inches: 112.2, curb_weight_lbs: 4585,
      nhtsa_overall_rating: 5, nhtsa_frontal_rating: 5, nhtsa_side_rating: 5, nhtsa_rollover_rating: 4,
      seating_capacity: 8, cargo_volume_cuft: 16.0, towing_capacity_lbs: 5000,
    }
  },
  // ===== HONDA =====
  {
    make_id: 'honda', make_name: 'Honda', country: 'Japan',
    model_id: 'honda_accord', model_name: 'Accord', body_style: 'Sedan',
    year: 2024, trim_name: 'Sport', msrp_new: 30490, is_popular: 1,
    specs: {
      engine_displacement: 1.5, engine_cylinders: 4, engine_horsepower: 192, engine_torque: 192, engine_type: 'Inline-4 Turbo',
      transmission_type: 'CVT', transmission_gears: null,
      drivetrain: 'FWD',
      fuel_city: 29, fuel_highway: 37, fuel_combined: 32, fuel_type: 'Gasoline',
      length_inches: 195.7, width_inches: 73.3, height_inches: 57.1, wheelbase_inches: 111.4, curb_weight_lbs: 3239,
      nhtsa_overall_rating: 5, nhtsa_frontal_rating: 5, nhtsa_side_rating: 5, nhtsa_rollover_rating: 5,
      seating_capacity: 5, cargo_volume_cuft: 16.7, towing_capacity_lbs: null,
    }
  },
  {
    make_id: 'honda', make_name: 'Honda', country: 'Japan',
    model_id: 'honda_crv', model_name: 'CR-V', body_style: 'SUV',
    year: 2024, trim_name: 'EX', msrp_new: 33850, is_popular: 1,
    specs: {
      engine_displacement: 1.5, engine_cylinders: 4, engine_horsepower: 190, engine_torque: 179, engine_type: 'Inline-4 Turbo',
      transmission_type: 'CVT', transmission_gears: null,
      drivetrain: 'AWD',
      fuel_city: 28, fuel_highway: 34, fuel_combined: 30, fuel_type: 'Gasoline',
      length_inches: 182.1, width_inches: 73.0, height_inches: 66.5, wheelbase_inches: 106.3, curb_weight_lbs: 3540,
      nhtsa_overall_rating: 5, nhtsa_frontal_rating: 5, nhtsa_side_rating: 5, nhtsa_rollover_rating: 4,
      seating_capacity: 5, cargo_volume_cuft: 39.3, towing_capacity_lbs: 1500,
    }
  },
  {
    make_id: 'honda', make_name: 'Honda', country: 'Japan',
    model_id: 'honda_civic', model_name: 'Civic', body_style: 'Sedan',
    year: 2024, trim_name: 'Sport', msrp_new: 25500, is_popular: 1,
    specs: {
      engine_displacement: 2.0, engine_cylinders: 4, engine_horsepower: 158, engine_torque: 138, engine_type: 'Inline-4',
      transmission_type: 'CVT', transmission_gears: null,
      drivetrain: 'FWD',
      fuel_city: 31, fuel_highway: 40, fuel_combined: 35, fuel_type: 'Gasoline',
      length_inches: 184.0, width_inches: 70.9, height_inches: 55.7, wheelbase_inches: 107.7, curb_weight_lbs: 2877,
      nhtsa_overall_rating: 5, nhtsa_frontal_rating: 5, nhtsa_side_rating: 5, nhtsa_rollover_rating: 5,
      seating_capacity: 5, cargo_volume_cuft: 14.8, towing_capacity_lbs: null,
    }
  },
  {
    make_id: 'honda', make_name: 'Honda', country: 'Japan',
    model_id: 'honda_pilot', model_name: 'Pilot', body_style: 'SUV',
    year: 2024, trim_name: 'EX-L', msrp_new: 43620, is_popular: 0,
    specs: {
      engine_displacement: 3.5, engine_cylinders: 6, engine_horsepower: 285, engine_torque: 262, engine_type: 'V6',
      transmission_type: 'Automatic', transmission_gears: 10,
      drivetrain: 'AWD',
      fuel_city: 20, fuel_highway: 27, fuel_combined: 23, fuel_type: 'Gasoline',
      length_inches: 196.5, width_inches: 78.6, height_inches: 70.4, wheelbase_inches: 113.8, curb_weight_lbs: 4282,
      nhtsa_overall_rating: 5, nhtsa_frontal_rating: 5, nhtsa_side_rating: 5, nhtsa_rollover_rating: 4,
      seating_capacity: 8, cargo_volume_cuft: 18.5, towing_capacity_lbs: 5000,
    }
  },
  // ===== FORD =====
  {
    make_id: 'ford', make_name: 'Ford', country: 'USA',
    model_id: 'ford_f150', model_name: 'F-150', body_style: 'Pickup Truck',
    year: 2024, trim_name: 'XLT', msrp_new: 42035, is_popular: 1,
    specs: {
      engine_displacement: 2.7, engine_cylinders: 6, engine_horsepower: 325, engine_torque: 400, engine_type: 'V6 Turbo',
      transmission_type: 'Automatic', transmission_gears: 10,
      drivetrain: '4WD',
      fuel_city: 20, fuel_highway: 26, fuel_combined: 22, fuel_type: 'Gasoline',
      length_inches: 231.9, width_inches: 79.9, height_inches: 77.2, wheelbase_inches: 145.4, curb_weight_lbs: 4705,
      nhtsa_overall_rating: 4, nhtsa_frontal_rating: 4, nhtsa_side_rating: 5, nhtsa_rollover_rating: 3,
      seating_capacity: 6, cargo_volume_cuft: null, towing_capacity_lbs: 13000,
    }
  },
  {
    make_id: 'ford', make_name: 'Ford', country: 'USA',
    model_id: 'ford_mustang', model_name: 'Mustang', body_style: 'Coupe',
    year: 2024, trim_name: 'GT', msrp_new: 42995, is_popular: 1,
    specs: {
      engine_displacement: 5.0, engine_cylinders: 8, engine_horsepower: 486, engine_torque: 418, engine_type: 'V8',
      transmission_type: 'Manual', transmission_gears: 6,
      drivetrain: 'RWD',
      fuel_city: 15, fuel_highway: 24, fuel_combined: 18, fuel_type: 'Gasoline',
      length_inches: 188.5, width_inches: 75.4, height_inches: 54.5, wheelbase_inches: 107.1, curb_weight_lbs: 3812,
      nhtsa_overall_rating: 4, nhtsa_frontal_rating: 4, nhtsa_side_rating: 4, nhtsa_rollover_rating: 3,
      seating_capacity: 4, cargo_volume_cuft: 13.5, towing_capacity_lbs: null,
    }
  },
  {
    make_id: 'ford', make_name: 'Ford', country: 'USA',
    model_id: 'ford_explorer', model_name: 'Explorer', body_style: 'SUV',
    year: 2024, trim_name: 'XLT', msrp_new: 38010, is_popular: 1,
    specs: {
      engine_displacement: 2.3, engine_cylinders: 4, engine_horsepower: 300, engine_torque: 310, engine_type: 'Inline-4 Turbo',
      transmission_type: 'Automatic', transmission_gears: 10,
      drivetrain: '4WD',
      fuel_city: 21, fuel_highway: 28, fuel_combined: 24, fuel_type: 'Gasoline',
      length_inches: 198.8, width_inches: 78.9, height_inches: 70.0, wheelbase_inches: 119.1, curb_weight_lbs: 4345,
      nhtsa_overall_rating: 5, nhtsa_frontal_rating: 5, nhtsa_side_rating: 5, nhtsa_rollover_rating: 4,
      seating_capacity: 7, cargo_volume_cuft: 21.0, towing_capacity_lbs: 5600,
    }
  },
  {
    make_id: 'ford', make_name: 'Ford', country: 'USA',
    model_id: 'ford_bronco', model_name: 'Bronco', body_style: 'SUV',
    year: 2024, trim_name: 'Big Bend', msrp_new: 38000, is_popular: 1,
    specs: {
      engine_displacement: 2.3, engine_cylinders: 4, engine_horsepower: 300, engine_torque: 325, engine_type: 'Inline-4 Turbo',
      transmission_type: 'Manual', transmission_gears: 7,
      drivetrain: '4WD',
      fuel_city: 20, fuel_highway: 22, fuel_combined: 21, fuel_type: 'Gasoline',
      length_inches: 173.7, width_inches: 83.6, height_inches: 73.0, wheelbase_inches: 100.4, curb_weight_lbs: 4418,
      nhtsa_overall_rating: null, nhtsa_frontal_rating: null, nhtsa_side_rating: null, nhtsa_rollover_rating: null,
      seating_capacity: 5, cargo_volume_cuft: 35.6, towing_capacity_lbs: 3500,
    }
  },
  // ===== CHEVROLET =====
  {
    make_id: 'chevrolet', make_name: 'Chevrolet', country: 'USA',
    model_id: 'chevy_silverado', model_name: 'Silverado 1500', body_style: 'Pickup Truck',
    year: 2024, trim_name: 'LT', msrp_new: 43500, is_popular: 1,
    specs: {
      engine_displacement: 2.7, engine_cylinders: 4, engine_horsepower: 310, engine_torque: 430, engine_type: 'Inline-4 Turbo',
      transmission_type: 'Automatic', transmission_gears: 8,
      drivetrain: '4WD',
      fuel_city: 20, fuel_highway: 23, fuel_combined: 21, fuel_type: 'Gasoline',
      length_inches: 231.7, width_inches: 81.2, height_inches: 75.6, wheelbase_inches: 147.4, curb_weight_lbs: 4674,
      nhtsa_overall_rating: 4, nhtsa_frontal_rating: 4, nhtsa_side_rating: 4, nhtsa_rollover_rating: 3,
      seating_capacity: 6, cargo_volume_cuft: null, towing_capacity_lbs: 11500,
    }
  },
  {
    make_id: 'chevrolet', make_name: 'Chevrolet', country: 'USA',
    model_id: 'chevy_equinox', model_name: 'Equinox', body_style: 'SUV',
    year: 2024, trim_name: 'LT', msrp_new: 31800, is_popular: 1,
    specs: {
      engine_displacement: 1.5, engine_cylinders: 4, engine_horsepower: 175, engine_torque: 203, engine_type: 'Inline-4 Turbo',
      transmission_type: 'Automatic', transmission_gears: 6,
      drivetrain: 'AWD',
      fuel_city: 25, fuel_highway: 30, fuel_combined: 27, fuel_type: 'Gasoline',
      length_inches: 183.1, width_inches: 72.6, height_inches: 65.4, wheelbase_inches: 107.3, curb_weight_lbs: 3615,
      nhtsa_overall_rating: 4, nhtsa_frontal_rating: 4, nhtsa_side_rating: 5, nhtsa_rollover_rating: 4,
      seating_capacity: 5, cargo_volume_cuft: 29.9, towing_capacity_lbs: 1500,
    }
  },
  {
    make_id: 'chevrolet', make_name: 'Chevrolet', country: 'USA',
    model_id: 'chevy_corvette', model_name: 'Corvette', body_style: 'Coupe',
    year: 2024, trim_name: 'Stingray', msrp_new: 67895, is_popular: 1,
    specs: {
      engine_displacement: 6.2, engine_cylinders: 8, engine_horsepower: 495, engine_torque: 470, engine_type: 'V8',
      transmission_type: 'Automatic', transmission_gears: 8,
      drivetrain: 'RWD',
      fuel_city: 15, fuel_highway: 27, fuel_combined: 19, fuel_type: 'Gasoline',
      length_inches: 182.3, width_inches: 76.1, height_inches: 48.6, wheelbase_inches: 107.2, curb_weight_lbs: 3366,
      nhtsa_overall_rating: null, nhtsa_frontal_rating: null, nhtsa_side_rating: null, nhtsa_rollover_rating: null,
      seating_capacity: 2, cargo_volume_cuft: 12.6, towing_capacity_lbs: null,
    }
  },
  // ===== TESLA =====
  {
    make_id: 'tesla', make_name: 'Tesla', country: 'USA',
    model_id: 'tesla_model3', model_name: 'Model 3', body_style: 'Sedan',
    year: 2024, trim_name: 'Long Range AWD', msrp_new: 45990, is_popular: 1,
    specs: {
      engine_displacement: null, engine_cylinders: null, engine_horsepower: 358, engine_torque: 394, engine_type: 'Electric Dual Motor',
      transmission_type: 'Single-Speed', transmission_gears: 1,
      drivetrain: 'AWD',
      fuel_city: null, fuel_highway: null, fuel_combined: null, fuel_type: 'Electric',
      length_inches: 184.8, width_inches: 72.8, height_inches: 56.8, wheelbase_inches: 113.2, curb_weight_lbs: 4034,
      nhtsa_overall_rating: 5, nhtsa_frontal_rating: 5, nhtsa_side_rating: 5, nhtsa_rollover_rating: 5,
      seating_capacity: 5, cargo_volume_cuft: 23.0, towing_capacity_lbs: null,
    }
  },
  {
    make_id: 'tesla', make_name: 'Tesla', country: 'USA',
    model_id: 'tesla_modely', model_name: 'Model Y', body_style: 'SUV',
    year: 2024, trim_name: 'Long Range AWD', msrp_new: 48490, is_popular: 1,
    specs: {
      engine_displacement: null, engine_cylinders: null, engine_horsepower: 384, engine_torque: 376, engine_type: 'Electric Dual Motor',
      transmission_type: 'Single-Speed', transmission_gears: 1,
      drivetrain: 'AWD',
      fuel_city: null, fuel_highway: null, fuel_combined: null, fuel_type: 'Electric',
      length_inches: 187.0, width_inches: 75.6, height_inches: 63.9, wheelbase_inches: 113.8, curb_weight_lbs: 4416,
      nhtsa_overall_rating: 5, nhtsa_frontal_rating: 5, nhtsa_side_rating: 5, nhtsa_rollover_rating: 5,
      seating_capacity: 7, cargo_volume_cuft: 76.2, towing_capacity_lbs: 3500,
    }
  },
  {
    make_id: 'tesla', make_name: 'Tesla', country: 'USA',
    model_id: 'tesla_modelx', model_name: 'Model X', body_style: 'SUV',
    year: 2024, trim_name: 'Long Range AWD', msrp_new: 79990, is_popular: 0,
    specs: {
      engine_displacement: null, engine_cylinders: null, engine_horsepower: 670, engine_torque: 713, engine_type: 'Electric Tri Motor',
      transmission_type: 'Single-Speed', transmission_gears: 1,
      drivetrain: 'AWD',
      fuel_city: null, fuel_highway: null, fuel_combined: null, fuel_type: 'Electric',
      length_inches: 198.3, width_inches: 78.7, height_inches: 66.3, wheelbase_inches: 116.7, curb_weight_lbs: 5185,
      nhtsa_overall_rating: 5, nhtsa_frontal_rating: 5, nhtsa_side_rating: 5, nhtsa_rollover_rating: 4,
      seating_capacity: 7, cargo_volume_cuft: 88.0, towing_capacity_lbs: 5000,
    }
  },
  // ===== BMW =====
  {
    make_id: 'bmw', make_name: 'BMW', country: 'Germany',
    model_id: 'bmw_3series', model_name: '3 Series', body_style: 'Sedan',
    year: 2024, trim_name: '330i', msrp_new: 44900, is_popular: 1,
    specs: {
      engine_displacement: 2.0, engine_cylinders: 4, engine_horsepower: 255, engine_torque: 295, engine_type: 'Inline-4 Turbo',
      transmission_type: 'Automatic', transmission_gears: 8,
      drivetrain: 'RWD',
      fuel_city: 26, fuel_highway: 36, fuel_combined: 30, fuel_type: 'Gasoline',
      length_inches: 185.7, width_inches: 71.9, height_inches: 56.8, wheelbase_inches: 112.2, curb_weight_lbs: 3582,
      nhtsa_overall_rating: 5, nhtsa_frontal_rating: 5, nhtsa_side_rating: 5, nhtsa_rollover_rating: 4,
      seating_capacity: 5, cargo_volume_cuft: 17.0, towing_capacity_lbs: null,
    }
  },
  {
    make_id: 'bmw', make_name: 'BMW', country: 'Germany',
    model_id: 'bmw_5series', model_name: '5 Series', body_style: 'Sedan',
    year: 2024, trim_name: '530i', msrp_new: 57700, is_popular: 1,
    specs: {
      engine_displacement: 2.0, engine_cylinders: 4, engine_horsepower: 248, engine_torque: 295, engine_type: 'Inline-4 Turbo',
      transmission_type: 'Automatic', transmission_gears: 8,
      drivetrain: 'RWD',
      fuel_city: 25, fuel_highway: 34, fuel_combined: 29, fuel_type: 'Gasoline',
      length_inches: 195.5, width_inches: 74.3, height_inches: 58.6, wheelbase_inches: 116.9, curb_weight_lbs: 4024,
      nhtsa_overall_rating: 5, nhtsa_frontal_rating: 5, nhtsa_side_rating: 5, nhtsa_rollover_rating: 4,
      seating_capacity: 5, cargo_volume_cuft: 18.7, towing_capacity_lbs: null,
    }
  },
  {
    make_id: 'bmw', make_name: 'BMW', country: 'Germany',
    model_id: 'bmw_x5', model_name: 'X5', body_style: 'SUV',
    year: 2024, trim_name: 'xDrive40i', msrp_new: 65900, is_popular: 1,
    specs: {
      engine_displacement: 3.0, engine_cylinders: 6, engine_horsepower: 375, engine_torque: 398, engine_type: 'Inline-6 Turbo',
      transmission_type: 'Automatic', transmission_gears: 8,
      drivetrain: 'AWD',
      fuel_city: 21, fuel_highway: 26, fuel_combined: 23, fuel_type: 'Gasoline',
      length_inches: 194.3, width_inches: 78.9, height_inches: 68.8, wheelbase_inches: 117.1, curb_weight_lbs: 4860,
      nhtsa_overall_rating: 5, nhtsa_frontal_rating: 5, nhtsa_side_rating: 5, nhtsa_rollover_rating: 4,
      seating_capacity: 5, cargo_volume_cuft: 33.9, towing_capacity_lbs: 7200,
    }
  },
  // ===== MERCEDES-BENZ =====
  {
    make_id: 'mercedes', make_name: 'Mercedes-Benz', country: 'Germany',
    model_id: 'mercedes_cclass', model_name: 'C-Class', body_style: 'Sedan',
    year: 2024, trim_name: 'C300', msrp_new: 48100, is_popular: 1,
    specs: {
      engine_displacement: 2.0, engine_cylinders: 4, engine_horsepower: 255, engine_torque: 295, engine_type: 'Inline-4 Turbo',
      transmission_type: 'Automatic', transmission_gears: 9,
      drivetrain: 'RWD',
      fuel_city: 23, fuel_highway: 33, fuel_combined: 27, fuel_type: 'Gasoline',
      length_inches: 187.4, width_inches: 71.3, height_inches: 56.5, wheelbase_inches: 111.8, curb_weight_lbs: 3880,
      nhtsa_overall_rating: null, nhtsa_frontal_rating: null, nhtsa_side_rating: null, nhtsa_rollover_rating: null,
      seating_capacity: 5, cargo_volume_cuft: 12.6, towing_capacity_lbs: null,
    }
  },
  {
    make_id: 'mercedes', make_name: 'Mercedes-Benz', country: 'Germany',
    model_id: 'mercedes_eclass', model_name: 'E-Class', body_style: 'Sedan',
    year: 2024, trim_name: 'E350', msrp_new: 63150, is_popular: 0,
    specs: {
      engine_displacement: 2.0, engine_cylinders: 4, engine_horsepower: 255, engine_torque: 295, engine_type: 'Inline-4 Turbo',
      transmission_type: 'Automatic', transmission_gears: 9,
      drivetrain: 'RWD',
      fuel_city: 22, fuel_highway: 31, fuel_combined: 26, fuel_type: 'Gasoline',
      length_inches: 196.6, width_inches: 73.7, height_inches: 58.2, wheelbase_inches: 116.2, curb_weight_lbs: 4035,
      nhtsa_overall_rating: 5, nhtsa_frontal_rating: 5, nhtsa_side_rating: 5, nhtsa_rollover_rating: 4,
      seating_capacity: 5, cargo_volume_cuft: 13.1, towing_capacity_lbs: null,
    }
  },
  {
    make_id: 'mercedes', make_name: 'Mercedes-Benz', country: 'Germany',
    model_id: 'mercedes_gle', model_name: 'GLE', body_style: 'SUV',
    year: 2024, trim_name: 'GLE350', msrp_new: 60750, is_popular: 1,
    specs: {
      engine_displacement: 2.0, engine_cylinders: 4, engine_horsepower: 255, engine_torque: 369, engine_type: 'Inline-4 Turbo',
      transmission_type: 'Automatic', transmission_gears: 9,
      drivetrain: 'AWD',
      fuel_city: 19, fuel_highway: 25, fuel_combined: 21, fuel_type: 'Gasoline',
      length_inches: 194.0, width_inches: 76.8, height_inches: 70.6, wheelbase_inches: 115.0, curb_weight_lbs: 4653,
      nhtsa_overall_rating: 5, nhtsa_frontal_rating: 5, nhtsa_side_rating: 5, nhtsa_rollover_rating: 4,
      seating_capacity: 5, cargo_volume_cuft: 33.3, towing_capacity_lbs: 7700,
    }
  },
  // ===== AUDI =====
  {
    make_id: 'audi', make_name: 'Audi', country: 'Germany',
    model_id: 'audi_a4', model_name: 'A4', body_style: 'Sedan',
    year: 2024, trim_name: '45 TFSI quattro', msrp_new: 43900, is_popular: 1,
    specs: {
      engine_displacement: 2.0, engine_cylinders: 4, engine_horsepower: 261, engine_torque: 273, engine_type: 'Inline-4 Turbo',
      transmission_type: 'Automatic', transmission_gears: 7,
      drivetrain: 'AWD',
      fuel_city: 24, fuel_highway: 33, fuel_combined: 27, fuel_type: 'Gasoline',
      length_inches: 187.5, width_inches: 72.7, height_inches: 55.7, wheelbase_inches: 111.0, curb_weight_lbs: 3880,
      nhtsa_overall_rating: 5, nhtsa_frontal_rating: 5, nhtsa_side_rating: 5, nhtsa_rollover_rating: 4,
      seating_capacity: 5, cargo_volume_cuft: 13.7, towing_capacity_lbs: null,
    }
  },
  {
    make_id: 'audi', make_name: 'Audi', country: 'Germany',
    model_id: 'audi_q7', model_name: 'Q7', body_style: 'SUV',
    year: 2024, trim_name: '45 TFSI', msrp_new: 59900, is_popular: 1,
    specs: {
      engine_displacement: 2.0, engine_cylinders: 4, engine_horsepower: 261, engine_torque: 273, engine_type: 'Inline-4 Turbo',
      transmission_type: 'Automatic', transmission_gears: 8,
      drivetrain: 'AWD',
      fuel_city: 19, fuel_highway: 25, fuel_combined: 21, fuel_type: 'Gasoline',
      length_inches: 199.4, width_inches: 77.9, height_inches: 68.9, wheelbase_inches: 117.9, curb_weight_lbs: 4707,
      nhtsa_overall_rating: 5, nhtsa_frontal_rating: 5, nhtsa_side_rating: 5, nhtsa_rollover_rating: 4,
      seating_capacity: 7, cargo_volume_cuft: 35.4, towing_capacity_lbs: 7700,
    }
  },
  // ===== NISSAN =====
  {
    make_id: 'nissan', make_name: 'Nissan', country: 'Japan',
    model_id: 'nissan_altima', model_name: 'Altima', body_style: 'Sedan',
    year: 2024, trim_name: 'SV', msrp_new: 28930, is_popular: 1,
    specs: {
      engine_displacement: 2.5, engine_cylinders: 4, engine_horsepower: 188, engine_torque: 180, engine_type: 'Inline-4',
      transmission_type: 'CVT', transmission_gears: null,
      drivetrain: 'AWD',
      fuel_city: 27, fuel_highway: 36, fuel_combined: 30, fuel_type: 'Gasoline',
      length_inches: 192.8, width_inches: 72.9, height_inches: 57.9, wheelbase_inches: 111.2, curb_weight_lbs: 3338,
      nhtsa_overall_rating: 5, nhtsa_frontal_rating: 5, nhtsa_side_rating: 5, nhtsa_rollover_rating: 5,
      seating_capacity: 5, cargo_volume_cuft: 15.4, towing_capacity_lbs: null,
    }
  },
  {
    make_id: 'nissan', make_name: 'Nissan', country: 'Japan',
    model_id: 'nissan_rogue', model_name: 'Rogue', body_style: 'SUV',
    year: 2024, trim_name: 'SV', msrp_new: 30850, is_popular: 1,
    specs: {
      engine_displacement: 1.5, engine_cylinders: 3, engine_horsepower: 201, engine_torque: 225, engine_type: 'Inline-3 Turbo',
      transmission_type: 'CVT', transmission_gears: null,
      drivetrain: 'AWD',
      fuel_city: 30, fuel_highway: 37, fuel_combined: 33, fuel_type: 'Gasoline',
      length_inches: 184.6, width_inches: 72.4, height_inches: 66.5, wheelbase_inches: 106.5, curb_weight_lbs: 3737,
      nhtsa_overall_rating: 5, nhtsa_frontal_rating: 5, nhtsa_side_rating: 5, nhtsa_rollover_rating: 4,
      seating_capacity: 5, cargo_volume_cuft: 36.5, towing_capacity_lbs: 1350,
    }
  },
  {
    make_id: 'nissan', make_name: 'Nissan', country: 'Japan',
    model_id: 'nissan_gt_r', model_name: 'GT-R', body_style: 'Coupe',
    year: 2023, trim_name: 'Premium', msrp_new: 113540, is_popular: 0,
    specs: {
      engine_displacement: 3.8, engine_cylinders: 6, engine_horsepower: 565, engine_torque: 467, engine_type: 'V6 Twin Turbo',
      transmission_type: 'Automatic', transmission_gears: 6,
      drivetrain: 'AWD',
      fuel_city: 16, fuel_highway: 22, fuel_combined: 18, fuel_type: 'Gasoline',
      length_inches: 184.6, width_inches: 74.6, height_inches: 54.5, wheelbase_inches: 109.4, curb_weight_lbs: 3946,
      nhtsa_overall_rating: null, nhtsa_frontal_rating: null, nhtsa_side_rating: null, nhtsa_rollover_rating: null,
      seating_capacity: 4, cargo_volume_cuft: 8.8, towing_capacity_lbs: null,
    }
  },
  // ===== JEEP =====
  {
    make_id: 'jeep', make_name: 'Jeep', country: 'USA',
    model_id: 'jeep_wrangler', model_name: 'Wrangler', body_style: 'SUV',
    year: 2024, trim_name: 'Sport', msrp_new: 33895, is_popular: 1,
    specs: {
      engine_displacement: 3.6, engine_cylinders: 6, engine_horsepower: 285, engine_torque: 260, engine_type: 'V6',
      transmission_type: 'Manual', transmission_gears: 6,
      drivetrain: '4WD',
      fuel_city: 17, fuel_highway: 23, fuel_combined: 19, fuel_type: 'Gasoline',
      length_inches: 166.8, width_inches: 73.8, height_inches: 73.6, wheelbase_inches: 96.8, curb_weight_lbs: 4163,
      nhtsa_overall_rating: 4, nhtsa_frontal_rating: 4, nhtsa_side_rating: 3, nhtsa_rollover_rating: 2,
      seating_capacity: 5, cargo_volume_cuft: 31.7, towing_capacity_lbs: 3500,
    }
  },
  {
    make_id: 'jeep', make_name: 'Jeep', country: 'USA',
    model_id: 'jeep_grand_cherokee', model_name: 'Grand Cherokee', body_style: 'SUV',
    year: 2024, trim_name: 'Laredo', msrp_new: 41290, is_popular: 1,
    specs: {
      engine_displacement: 3.6, engine_cylinders: 6, engine_horsepower: 293, engine_torque: 260, engine_type: 'V6',
      transmission_type: 'Automatic', transmission_gears: 8,
      drivetrain: '4WD',
      fuel_city: 18, fuel_highway: 25, fuel_combined: 21, fuel_type: 'Gasoline',
      length_inches: 193.5, width_inches: 76.1, height_inches: 70.1, wheelbase_inches: 115.5, curb_weight_lbs: 4552,
      nhtsa_overall_rating: 5, nhtsa_frontal_rating: 5, nhtsa_side_rating: 5, nhtsa_rollover_rating: 4,
      seating_capacity: 5, cargo_volume_cuft: 36.3, towing_capacity_lbs: 6200,
    }
  },
  // ===== HYUNDAI =====
  {
    make_id: 'hyundai', make_name: 'Hyundai', country: 'South Korea',
    model_id: 'hyundai_elantra', model_name: 'Elantra', body_style: 'Sedan',
    year: 2024, trim_name: 'SEL', msrp_new: 23200, is_popular: 1,
    specs: {
      engine_displacement: 2.0, engine_cylinders: 4, engine_horsepower: 147, engine_torque: 132, engine_type: 'Inline-4',
      transmission_type: 'Automatic', transmission_gears: 6,
      drivetrain: 'FWD',
      fuel_city: 33, fuel_highway: 43, fuel_combined: 37, fuel_type: 'Gasoline',
      length_inches: 184.1, width_inches: 71.9, height_inches: 55.7, wheelbase_inches: 107.1, curb_weight_lbs: 2869,
      nhtsa_overall_rating: 5, nhtsa_frontal_rating: 5, nhtsa_side_rating: 5, nhtsa_rollover_rating: 5,
      seating_capacity: 5, cargo_volume_cuft: 14.2, towing_capacity_lbs: null,
    }
  },
  {
    make_id: 'hyundai', make_name: 'Hyundai', country: 'South Korea',
    model_id: 'hyundai_tucson', model_name: 'Tucson', body_style: 'SUV',
    year: 2024, trim_name: 'SEL', msrp_new: 31450, is_popular: 1,
    specs: {
      engine_displacement: 2.5, engine_cylinders: 4, engine_horsepower: 187, engine_torque: 178, engine_type: 'Inline-4',
      transmission_type: 'Automatic', transmission_gears: 8,
      drivetrain: 'AWD',
      fuel_city: 24, fuel_highway: 29, fuel_combined: 26, fuel_type: 'Gasoline',
      length_inches: 182.3, width_inches: 73.4, height_inches: 65.6, wheelbase_inches: 108.5, curb_weight_lbs: 3829,
      nhtsa_overall_rating: 5, nhtsa_frontal_rating: 5, nhtsa_side_rating: 5, nhtsa_rollover_rating: 4,
      seating_capacity: 5, cargo_volume_cuft: 38.7, towing_capacity_lbs: 2000,
    }
  },
  {
    make_id: 'hyundai', make_name: 'Hyundai', country: 'South Korea',
    model_id: 'hyundai_ioniq6', model_name: 'IONIQ 6', body_style: 'Sedan',
    year: 2024, trim_name: 'SE Standard Range', msrp_new: 38615, is_popular: 1,
    specs: {
      engine_displacement: null, engine_cylinders: null, engine_horsepower: 225, engine_torque: 258, engine_type: 'Electric',
      transmission_type: 'Single-Speed', transmission_gears: 1,
      drivetrain: 'RWD',
      fuel_city: null, fuel_highway: null, fuel_combined: null, fuel_type: 'Electric',
      length_inches: 191.1, width_inches: 74.4, height_inches: 59.1, wheelbase_inches: 116.1, curb_weight_lbs: 4255,
      nhtsa_overall_rating: 5, nhtsa_frontal_rating: 5, nhtsa_side_rating: 5, nhtsa_rollover_rating: 5,
      seating_capacity: 5, cargo_volume_cuft: 11.1, towing_capacity_lbs: null,
    }
  },
  // ===== KIA =====
  {
    make_id: 'kia', make_name: 'Kia', country: 'South Korea',
    model_id: 'kia_telluride', model_name: 'Telluride', body_style: 'SUV',
    year: 2024, trim_name: 'LX', msrp_new: 36590, is_popular: 1,
    specs: {
      engine_displacement: 3.8, engine_cylinders: 6, engine_horsepower: 291, engine_torque: 262, engine_type: 'V6',
      transmission_type: 'Automatic', transmission_gears: 8,
      drivetrain: 'AWD',
      fuel_city: 20, fuel_highway: 26, fuel_combined: 23, fuel_type: 'Gasoline',
      length_inches: 196.9, width_inches: 78.3, height_inches: 68.9, wheelbase_inches: 114.2, curb_weight_lbs: 4573,
      nhtsa_overall_rating: 5, nhtsa_frontal_rating: 5, nhtsa_side_rating: 5, nhtsa_rollover_rating: 4,
      seating_capacity: 8, cargo_volume_cuft: 21.0, towing_capacity_lbs: 5000,
    }
  },
  {
    make_id: 'kia', make_name: 'Kia', country: 'South Korea',
    model_id: 'kia_sorento', model_name: 'Sorento', body_style: 'SUV',
    year: 2024, trim_name: 'LX', msrp_new: 30990, is_popular: 1,
    specs: {
      engine_displacement: 2.5, engine_cylinders: 4, engine_horsepower: 191, engine_torque: 181, engine_type: 'Inline-4',
      transmission_type: 'Automatic', transmission_gears: 8,
      drivetrain: 'AWD',
      fuel_city: 24, fuel_highway: 29, fuel_combined: 26, fuel_type: 'Gasoline',
      length_inches: 188.4, width_inches: 74.8, height_inches: 67.1, wheelbase_inches: 110.4, curb_weight_lbs: 4011,
      nhtsa_overall_rating: 5, nhtsa_frontal_rating: 5, nhtsa_side_rating: 5, nhtsa_rollover_rating: 4,
      seating_capacity: 7, cargo_volume_cuft: 39.6, towing_capacity_lbs: 3500,
    }
  },
  // ===== SUBARU =====
  {
    make_id: 'subaru', make_name: 'Subaru', country: 'Japan',
    model_id: 'subaru_outback', model_name: 'Outback', body_style: 'Wagon',
    year: 2024, trim_name: 'Premium', msrp_new: 32895, is_popular: 1,
    specs: {
      engine_displacement: 2.5, engine_cylinders: 4, engine_horsepower: 182, engine_torque: 176, engine_type: 'Flat-4',
      transmission_type: 'CVT', transmission_gears: null,
      drivetrain: 'AWD',
      fuel_city: 26, fuel_highway: 33, fuel_combined: 29, fuel_type: 'Gasoline',
      length_inches: 191.3, width_inches: 73.0, height_inches: 66.1, wheelbase_inches: 108.1, curb_weight_lbs: 3814,
      nhtsa_overall_rating: 5, nhtsa_frontal_rating: 5, nhtsa_side_rating: 5, nhtsa_rollover_rating: 4,
      seating_capacity: 5, cargo_volume_cuft: 32.5, towing_capacity_lbs: 3500,
    }
  },
  {
    make_id: 'subaru', make_name: 'Subaru', country: 'Japan',
    model_id: 'subaru_forester', model_name: 'Forester', body_style: 'SUV',
    year: 2024, trim_name: 'Premium', msrp_new: 30395, is_popular: 1,
    specs: {
      engine_displacement: 2.5, engine_cylinders: 4, engine_horsepower: 182, engine_torque: 176, engine_type: 'Flat-4',
      transmission_type: 'CVT', transmission_gears: null,
      drivetrain: 'AWD',
      fuel_city: 26, fuel_highway: 33, fuel_combined: 29, fuel_type: 'Gasoline',
      length_inches: 182.1, width_inches: 71.5, height_inches: 67.5, wheelbase_inches: 105.1, curb_weight_lbs: 3692,
      nhtsa_overall_rating: 5, nhtsa_frontal_rating: 5, nhtsa_side_rating: 5, nhtsa_rollover_rating: 4,
      seating_capacity: 5, cargo_volume_cuft: 31.1, towing_capacity_lbs: 1500,
    }
  },
  // ===== LEXUS =====
  {
    make_id: 'lexus', make_name: 'Lexus', country: 'Japan',
    model_id: 'lexus_rx', model_name: 'RX', body_style: 'SUV',
    year: 2024, trim_name: 'RX350', msrp_new: 50150, is_popular: 1,
    specs: {
      engine_displacement: 2.4, engine_cylinders: 4, engine_horsepower: 275, engine_torque: 317, engine_type: 'Inline-4 Turbo',
      transmission_type: 'Automatic', transmission_gears: 8,
      drivetrain: 'AWD',
      fuel_city: 22, fuel_highway: 29, fuel_combined: 25, fuel_type: 'Gasoline',
      length_inches: 192.5, width_inches: 74.8, height_inches: 67.5, wheelbase_inches: 112.2, curb_weight_lbs: 4299,
      nhtsa_overall_rating: 5, nhtsa_frontal_rating: 5, nhtsa_side_rating: 5, nhtsa_rollover_rating: 4,
      seating_capacity: 5, cargo_volume_cuft: 29.6, towing_capacity_lbs: 3500,
    }
  },
  {
    make_id: 'lexus', make_name: 'Lexus', country: 'Japan',
    model_id: 'lexus_es', model_name: 'ES', body_style: 'Sedan',
    year: 2024, trim_name: 'ES350', msrp_new: 43100, is_popular: 1,
    specs: {
      engine_displacement: 3.5, engine_cylinders: 6, engine_horsepower: 302, engine_torque: 267, engine_type: 'V6',
      transmission_type: 'Automatic', transmission_gears: 8,
      drivetrain: 'FWD',
      fuel_city: 22, fuel_highway: 32, fuel_combined: 26, fuel_type: 'Gasoline',
      length_inches: 194.9, width_inches: 72.4, height_inches: 56.5, wheelbase_inches: 113.0, curb_weight_lbs: 3902,
      nhtsa_overall_rating: 5, nhtsa_frontal_rating: 5, nhtsa_side_rating: 5, nhtsa_rollover_rating: 5,
      seating_capacity: 5, cargo_volume_cuft: 16.7, towing_capacity_lbs: null,
    }
  },
  // ===== DODGE =====
  {
    make_id: 'dodge', make_name: 'Dodge', country: 'USA',
    model_id: 'dodge_charger', model_name: 'Charger', body_style: 'Sedan',
    year: 2023, trim_name: 'R/T', msrp_new: 43295, is_popular: 1,
    specs: {
      engine_displacement: 5.7, engine_cylinders: 8, engine_horsepower: 370, engine_torque: 395, engine_type: 'V8',
      transmission_type: 'Automatic', transmission_gears: 8,
      drivetrain: 'RWD',
      fuel_city: 16, fuel_highway: 25, fuel_combined: 19, fuel_type: 'Gasoline',
      length_inches: 197.9, width_inches: 75.0, height_inches: 57.1, wheelbase_inches: 116.2, curb_weight_lbs: 4186,
      nhtsa_overall_rating: 4, nhtsa_frontal_rating: 4, nhtsa_side_rating: 4, nhtsa_rollover_rating: 4,
      seating_capacity: 5, cargo_volume_cuft: 16.5, towing_capacity_lbs: null,
    }
  },
  {
    make_id: 'dodge', make_name: 'Dodge', country: 'USA',
    model_id: 'dodge_challenger', model_name: 'Challenger', body_style: 'Coupe',
    year: 2023, trim_name: 'R/T', msrp_new: 41790, is_popular: 1,
    specs: {
      engine_displacement: 5.7, engine_cylinders: 8, engine_horsepower: 375, engine_torque: 410, engine_type: 'V8',
      transmission_type: 'Automatic', transmission_gears: 8,
      drivetrain: 'RWD',
      fuel_city: 16, fuel_highway: 25, fuel_combined: 19, fuel_type: 'Gasoline',
      length_inches: 197.9, width_inches: 75.7, height_inches: 56.7, wheelbase_inches: 116.2, curb_weight_lbs: 4243,
      nhtsa_overall_rating: 4, nhtsa_frontal_rating: 4, nhtsa_side_rating: 4, nhtsa_rollover_rating: 4,
      seating_capacity: 5, cargo_volume_cuft: 16.2, towing_capacity_lbs: null,
    }
  },
  // ===== MAZDA =====
  {
    make_id: 'mazda', make_name: 'Mazda', country: 'Japan',
    model_id: 'mazda_cx5', model_name: 'CX-5', body_style: 'SUV',
    year: 2024, trim_name: 'Sport', msrp_new: 30045, is_popular: 1,
    specs: {
      engine_displacement: 2.5, engine_cylinders: 4, engine_horsepower: 187, engine_torque: 186, engine_type: 'Inline-4',
      transmission_type: 'Automatic', transmission_gears: 6,
      drivetrain: 'AWD',
      fuel_city: 24, fuel_highway: 30, fuel_combined: 26, fuel_type: 'Gasoline',
      length_inches: 179.8, width_inches: 72.5, height_inches: 66.1, wheelbase_inches: 106.3, curb_weight_lbs: 3668,
      nhtsa_overall_rating: 5, nhtsa_frontal_rating: 5, nhtsa_side_rating: 5, nhtsa_rollover_rating: 4,
      seating_capacity: 5, cargo_volume_cuft: 30.9, towing_capacity_lbs: 2000,
    }
  },
  {
    make_id: 'mazda', make_name: 'Mazda', country: 'Japan',
    model_id: 'mazda_miata', model_name: 'MX-5 Miata', body_style: 'Convertible',
    year: 2024, trim_name: 'Sport', msrp_new: 29050, is_popular: 1,
    specs: {
      engine_displacement: 2.0, engine_cylinders: 4, engine_horsepower: 181, engine_torque: 151, engine_type: 'Inline-4',
      transmission_type: 'Manual', transmission_gears: 6,
      drivetrain: 'RWD',
      fuel_city: 26, fuel_highway: 35, fuel_combined: 30, fuel_type: 'Gasoline',
      length_inches: 154.1, width_inches: 68.3, height_inches: 48.8, wheelbase_inches: 90.9, curb_weight_lbs: 2341,
      nhtsa_overall_rating: null, nhtsa_frontal_rating: null, nhtsa_side_rating: null, nhtsa_rollover_rating: null,
      seating_capacity: 2, cargo_volume_cuft: 4.6, towing_capacity_lbs: null,
    }
  },
  // ===== VOLKSWAGEN =====
  {
    make_id: 'volkswagen', make_name: 'Volkswagen', country: 'Germany',
    model_id: 'vw_jetta', model_name: 'Jetta', body_style: 'Sedan',
    year: 2024, trim_name: 'SE', msrp_new: 24990, is_popular: 1,
    specs: {
      engine_displacement: 1.5, engine_cylinders: 4, engine_horsepower: 158, engine_torque: 184, engine_type: 'Inline-4 Turbo',
      transmission_type: 'Automatic', transmission_gears: 8,
      drivetrain: 'FWD',
      fuel_city: 29, fuel_highway: 41, fuel_combined: 34, fuel_type: 'Gasoline',
      length_inches: 186.1, width_inches: 70.9, height_inches: 57.9, wheelbase_inches: 105.6, curb_weight_lbs: 3230,
      nhtsa_overall_rating: 4, nhtsa_frontal_rating: 5, nhtsa_side_rating: 4, nhtsa_rollover_rating: 4,
      seating_capacity: 5, cargo_volume_cuft: 14.1, towing_capacity_lbs: null,
    }
  },
  {
    make_id: 'volkswagen', make_name: 'Volkswagen', country: 'Germany',
    model_id: 'vw_tiguan', model_name: 'Tiguan', body_style: 'SUV',
    year: 2024, trim_name: 'SE', msrp_new: 31990, is_popular: 1,
    specs: {
      engine_displacement: 2.0, engine_cylinders: 4, engine_horsepower: 184, engine_torque: 221, engine_type: 'Inline-4 Turbo',
      transmission_type: 'Automatic', transmission_gears: 8,
      drivetrain: 'AWD',
      fuel_city: 22, fuel_highway: 29, fuel_combined: 25, fuel_type: 'Gasoline',
      length_inches: 185.5, width_inches: 72.5, height_inches: 65.3, wheelbase_inches: 109.9, curb_weight_lbs: 4024,
      nhtsa_overall_rating: 5, nhtsa_frontal_rating: 5, nhtsa_side_rating: 5, nhtsa_rollover_rating: 4,
      seating_capacity: 7, cargo_volume_cuft: 37.6, towing_capacity_lbs: 1500,
    }
  },
  // ===== GMC =====
  {
    make_id: 'gmc', make_name: 'GMC', country: 'USA',
    model_id: 'gmc_sierra', model_name: 'Sierra 1500', body_style: 'Pickup Truck',
    year: 2024, trim_name: 'SLE', msrp_new: 44700, is_popular: 1,
    specs: {
      engine_displacement: 2.7, engine_cylinders: 4, engine_horsepower: 310, engine_torque: 430, engine_type: 'Inline-4 Turbo',
      transmission_type: 'Automatic', transmission_gears: 8,
      drivetrain: '4WD',
      fuel_city: 18, fuel_highway: 22, fuel_combined: 20, fuel_type: 'Gasoline',
      length_inches: 231.9, width_inches: 81.2, height_inches: 75.9, wheelbase_inches: 147.4, curb_weight_lbs: 4746,
      nhtsa_overall_rating: 4, nhtsa_frontal_rating: 4, nhtsa_side_rating: 4, nhtsa_rollover_rating: 3,
      seating_capacity: 6, cargo_volume_cuft: null, towing_capacity_lbs: 11000,
    }
  },
  {
    make_id: 'gmc', make_name: 'GMC', country: 'USA',
    model_id: 'gmc_yukon', model_name: 'Yukon', body_style: 'SUV',
    year: 2024, trim_name: 'SLE', msrp_new: 55800, is_popular: 1,
    specs: {
      engine_displacement: 5.3, engine_cylinders: 8, engine_horsepower: 355, engine_torque: 383, engine_type: 'V8',
      transmission_type: 'Automatic', transmission_gears: 10,
      drivetrain: '4WD',
      fuel_city: 15, fuel_highway: 20, fuel_combined: 17, fuel_type: 'Gasoline',
      length_inches: 224.3, width_inches: 81.1, height_inches: 74.4, wheelbase_inches: 130.0, curb_weight_lbs: 5756,
      nhtsa_overall_rating: 5, nhtsa_frontal_rating: 5, nhtsa_side_rating: 5, nhtsa_rollover_rating: 4,
      seating_capacity: 9, cargo_volume_cuft: 25.5, towing_capacity_lbs: 8500,
    }
  },
  // ===== RAM =====
  {
    make_id: 'ram', make_name: 'Ram', country: 'USA',
    model_id: 'ram_1500', model_name: '1500', body_style: 'Pickup Truck',
    year: 2024, trim_name: 'Big Horn', msrp_new: 42020, is_popular: 1,
    specs: {
      engine_displacement: 3.6, engine_cylinders: 6, engine_horsepower: 305, engine_torque: 269, engine_type: 'V6',
      transmission_type: 'Automatic', transmission_gears: 8,
      drivetrain: '4WD',
      fuel_city: 20, fuel_highway: 26, fuel_combined: 22, fuel_type: 'Gasoline',
      length_inches: 232.9, width_inches: 82.1, height_inches: 77.6, wheelbase_inches: 144.5, curb_weight_lbs: 4930,
      nhtsa_overall_rating: 5, nhtsa_frontal_rating: 5, nhtsa_side_rating: 5, nhtsa_rollover_rating: 3,
      seating_capacity: 6, cargo_volume_cuft: null, towing_capacity_lbs: 12750,
    }
  },
  // ===== PORSCHE =====
  {
    make_id: 'porsche', make_name: 'Porsche', country: 'Germany',
    model_id: 'porsche_911', model_name: '911', body_style: 'Coupe',
    year: 2024, trim_name: 'Carrera', msrp_new: 115650, is_popular: 1,
    specs: {
      engine_displacement: 3.0, engine_cylinders: 6, engine_horsepower: 379, engine_torque: 331, engine_type: 'Flat-6 Twin Turbo',
      transmission_type: 'Automatic', transmission_gears: 8,
      drivetrain: 'RWD',
      fuel_city: 18, fuel_highway: 24, fuel_combined: 20, fuel_type: 'Gasoline',
      length_inches: 178.2, width_inches: 74.0, height_inches: 51.3, wheelbase_inches: 96.5, curb_weight_lbs: 3282,
      nhtsa_overall_rating: null, nhtsa_frontal_rating: null, nhtsa_side_rating: null, nhtsa_rollover_rating: null,
      seating_capacity: 4, cargo_volume_cuft: 4.9, towing_capacity_lbs: null,
    }
  },
  {
    make_id: 'porsche', make_name: 'Porsche', country: 'Germany',
    model_id: 'porsche_cayenne', model_name: 'Cayenne', body_style: 'SUV',
    year: 2024, trim_name: 'Base', msrp_new: 77200, is_popular: 0,
    specs: {
      engine_displacement: 3.0, engine_cylinders: 6, engine_horsepower: 348, engine_torque: 369, engine_type: 'V6 Turbo',
      transmission_type: 'Automatic', transmission_gears: 8,
      drivetrain: 'AWD',
      fuel_city: 19, fuel_highway: 23, fuel_combined: 20, fuel_type: 'Gasoline',
      length_inches: 193.3, width_inches: 76.5, height_inches: 66.5, wheelbase_inches: 113.9, curb_weight_lbs: 4586,
      nhtsa_overall_rating: null, nhtsa_frontal_rating: null, nhtsa_side_rating: null, nhtsa_rollover_rating: null,
      seating_capacity: 5, cargo_volume_cuft: 27.1, towing_capacity_lbs: 7716,
    }
  },
  // ===== CADILLAC =====
  {
    make_id: 'cadillac', make_name: 'Cadillac', country: 'USA',
    model_id: 'cadillac_escalade', model_name: 'Escalade', body_style: 'SUV',
    year: 2024, trim_name: 'Premium Luxury', msrp_new: 99490, is_popular: 1,
    specs: {
      engine_displacement: 6.2, engine_cylinders: 8, engine_horsepower: 420, engine_torque: 460, engine_type: 'V8',
      transmission_type: 'Automatic', transmission_gears: 10,
      drivetrain: '4WD',
      fuel_city: 14, fuel_highway: 19, fuel_combined: 16, fuel_type: 'Gasoline',
      length_inches: 224.3, width_inches: 81.1, height_inches: 74.6, wheelbase_inches: 130.0, curb_weight_lbs: 5969,
      nhtsa_overall_rating: 4, nhtsa_frontal_rating: 4, nhtsa_side_rating: 4, nhtsa_rollover_rating: 3,
      seating_capacity: 8, cargo_volume_cuft: 25.5, towing_capacity_lbs: 8200,
    }
  },
  // ===== LINCOLN =====
  {
    make_id: 'lincoln', make_name: 'Lincoln', country: 'USA',
    model_id: 'lincoln_navigator', model_name: 'Navigator', body_style: 'SUV',
    year: 2024, trim_name: 'Standard', msrp_new: 81435, is_popular: 0,
    specs: {
      engine_displacement: 3.5, engine_cylinders: 6, engine_horsepower: 440, engine_torque: 510, engine_type: 'V6 Twin Turbo',
      transmission_type: 'Automatic', transmission_gears: 10,
      drivetrain: '4WD',
      fuel_city: 16, fuel_highway: 22, fuel_combined: 18, fuel_type: 'Gasoline',
      length_inches: 224.0, width_inches: 79.9, height_inches: 76.6, wheelbase_inches: 131.2, curb_weight_lbs: 5797,
      nhtsa_overall_rating: null, nhtsa_frontal_rating: null, nhtsa_side_rating: null, nhtsa_rollover_rating: null,
      seating_capacity: 8, cargo_volume_cuft: 28.7, towing_capacity_lbs: 8700,
    }
  },
  // ===== VOLVO =====
  {
    make_id: 'volvo', make_name: 'Volvo', country: 'Sweden',
    model_id: 'volvo_xc90', model_name: 'XC90', body_style: 'SUV',
    year: 2024, trim_name: 'Core B5', msrp_new: 57550, is_popular: 1,
    specs: {
      engine_displacement: 2.0, engine_cylinders: 4, engine_horsepower: 247, engine_torque: 258, engine_type: 'Inline-4 Turbo+Supercharger',
      transmission_type: 'Automatic', transmission_gears: 8,
      drivetrain: 'AWD',
      fuel_city: 22, fuel_highway: 28, fuel_combined: 24, fuel_type: 'Gasoline',
      length_inches: 194.9, width_inches: 84.3, height_inches: 68.8, wheelbase_inches: 117.5, curb_weight_lbs: 4718,
      nhtsa_overall_rating: 5, nhtsa_frontal_rating: 5, nhtsa_side_rating: 5, nhtsa_rollover_rating: 4,
      seating_capacity: 7, cargo_volume_cuft: 35.4, towing_capacity_lbs: 5000,
    }
  },
  // ===== ACURA =====
  {
    make_id: 'acura', make_name: 'Acura', country: 'Japan',
    model_id: 'acura_mdx', model_name: 'MDX', body_style: 'SUV',
    year: 2024, trim_name: 'Base', msrp_new: 50650, is_popular: 1,
    specs: {
      engine_displacement: 3.5, engine_cylinders: 6, engine_horsepower: 290, engine_torque: 267, engine_type: 'V6',
      transmission_type: 'Automatic', transmission_gears: 10,
      drivetrain: 'AWD',
      fuel_city: 19, fuel_highway: 26, fuel_combined: 22, fuel_type: 'Gasoline',
      length_inches: 198.9, width_inches: 78.0, height_inches: 68.1, wheelbase_inches: 113.8, curb_weight_lbs: 4382,
      nhtsa_overall_rating: 5, nhtsa_frontal_rating: 5, nhtsa_side_rating: 5, nhtsa_rollover_rating: 4,
      seating_capacity: 7, cargo_volume_cuft: 18.6, towing_capacity_lbs: 5000,
    }
  },
  // ===== LAND ROVER =====
  {
    make_id: 'land_rover', make_name: 'Land Rover', country: 'UK',
    model_id: 'lr_defender', model_name: 'Defender', body_style: 'SUV',
    year: 2024, trim_name: 'S', msrp_new: 55300, is_popular: 1,
    specs: {
      engine_displacement: 2.0, engine_cylinders: 4, engine_horsepower: 296, engine_torque: 295, engine_type: 'Inline-4 Turbo',
      transmission_type: 'Automatic', transmission_gears: 8,
      drivetrain: 'AWD',
      fuel_city: 19, fuel_highway: 23, fuel_combined: 21, fuel_type: 'Gasoline',
      length_inches: 189.8, width_inches: 78.0, height_inches: 77.9, wheelbase_inches: 119.4, curb_weight_lbs: 5226,
      nhtsa_overall_rating: null, nhtsa_frontal_rating: null, nhtsa_side_rating: null, nhtsa_rollover_rating: null,
      seating_capacity: 5, cargo_volume_cuft: 34.3, towing_capacity_lbs: 8200,
    }
  },
  // ===== GENESIS =====
  {
    make_id: 'genesis', make_name: 'Genesis', country: 'South Korea',
    model_id: 'genesis_gv80', model_name: 'GV80', body_style: 'SUV',
    year: 2024, trim_name: '2.5T Standard', msrp_new: 55500, is_popular: 0,
    specs: {
      engine_displacement: 2.5, engine_cylinders: 4, engine_horsepower: 300, engine_torque: 311, engine_type: 'Inline-4 Turbo',
      transmission_type: 'Automatic', transmission_gears: 8,
      drivetrain: 'AWD',
      fuel_city: 19, fuel_highway: 25, fuel_combined: 22, fuel_type: 'Gasoline',
      length_inches: 194.7, width_inches: 77.2, height_inches: 67.9, wheelbase_inches: 116.3, curb_weight_lbs: 4640,
      nhtsa_overall_rating: null, nhtsa_frontal_rating: null, nhtsa_side_rating: null, nhtsa_rollover_rating: null,
      seating_capacity: 5, cargo_volume_cuft: 35.5, towing_capacity_lbs: 4500,
    }
  },
  // ===== RIVIAN =====
  {
    make_id: 'rivian', make_name: 'Rivian', country: 'USA',
    model_id: 'rivian_r1t', model_name: 'R1T', body_style: 'Pickup Truck',
    year: 2024, trim_name: 'Adventure', msrp_new: 73000, is_popular: 1,
    specs: {
      engine_displacement: null, engine_cylinders: null, engine_horsepower: 835, engine_torque: 908, engine_type: 'Electric Quad Motor',
      transmission_type: 'Single-Speed', transmission_gears: 1,
      drivetrain: 'AWD',
      fuel_city: null, fuel_highway: null, fuel_combined: null, fuel_type: 'Electric',
      length_inches: 217.1, width_inches: 79.9, height_inches: 71.4, wheelbase_inches: 135.8, curb_weight_lbs: 7148,
      nhtsa_overall_rating: null, nhtsa_frontal_rating: null, nhtsa_side_rating: null, nhtsa_rollover_rating: null,
      seating_capacity: 5, cargo_volume_cuft: null, towing_capacity_lbs: 11000,
    }
  },
  // ===== LUCID =====
  {
    make_id: 'lucid', make_name: 'Lucid', country: 'USA',
    model_id: 'lucid_air', model_name: 'Air', body_style: 'Sedan',
    year: 2024, trim_name: 'Pure', msrp_new: 69900, is_popular: 0,
    specs: {
      engine_displacement: null, engine_cylinders: null, engine_horsepower: 480, engine_torque: 400, engine_type: 'Electric',
      transmission_type: 'Single-Speed', transmission_gears: 1,
      drivetrain: 'RWD',
      fuel_city: null, fuel_highway: null, fuel_combined: null, fuel_type: 'Electric',
      length_inches: 195.9, width_inches: 76.3, height_inches: 55.5, wheelbase_inches: 116.5, curb_weight_lbs: 4882,
      nhtsa_overall_rating: null, nhtsa_frontal_rating: null, nhtsa_side_rating: null, nhtsa_rollover_rating: null,
      seating_capacity: 5, cargo_volume_cuft: 20.0, towing_capacity_lbs: null,
    }
  },
];

function seed() {
  console.log('Starting database seed...');
  const db = getDb();

  // Insert makes
  const insertMake = db.prepare(`
    INSERT OR IGNORE INTO makes (make_id, name, country)
    VALUES (@make_id, @name, @country)
  `);

  // Insert models
  const insertModel = db.prepare(`
    INSERT OR IGNORE INTO models (model_id, make_id, name, body_style)
    VALUES (@model_id, @make_id, @name, @body_style)
  `);

  // Insert trims
  const insertTrim = db.prepare(`
    INSERT OR IGNORE INTO car_trims (trim_id, model_id, make_id, year, trim_name, msrp_new, is_popular)
    VALUES (@trim_id, @model_id, @make_id, @year, @trim_name, @msrp_new, @is_popular)
  `);

  // Insert specs
  const insertSpecs = db.prepare(`
    INSERT OR IGNORE INTO car_specs (
      trim_id, engine_displacement, engine_cylinders, engine_horsepower, engine_torque, engine_type,
      transmission_type, transmission_gears, drivetrain,
      fuel_city, fuel_highway, fuel_combined, fuel_type,
      length_inches, width_inches, height_inches, wheelbase_inches, curb_weight_lbs,
      nhtsa_overall_rating, nhtsa_frontal_rating, nhtsa_side_rating, nhtsa_rollover_rating,
      seating_capacity, cargo_volume_cuft, towing_capacity_lbs
    ) VALUES (
      @trim_id, @engine_displacement, @engine_cylinders, @engine_horsepower, @engine_torque, @engine_type,
      @transmission_type, @transmission_gears, @drivetrain,
      @fuel_city, @fuel_highway, @fuel_combined, @fuel_type,
      @length_inches, @width_inches, @height_inches, @wheelbase_inches, @curb_weight_lbs,
      @nhtsa_overall_rating, @nhtsa_frontal_rating, @nhtsa_side_rating, @nhtsa_rollover_rating,
      @seating_capacity, @cargo_volume_cuft, @towing_capacity_lbs
    )
  `);

  // Insert price history
  const insertPrice = db.prepare(`
    INSERT OR IGNORE INTO price_history (trim_id, price_date, market_price, price_type, mileage_basis)
    VALUES (@trim_id, @price_date, @market_price, @price_type, @mileage_basis)
  `);

  const runAll = db.transaction(() => {
    const seenMakes = new Set<string>();
    const seenModels = new Set<string>();
    let trimCount = 0;
    let priceCount = 0;

    for (let i = 0; i < CARS.length; i++) {
      const car = CARS[i];
      const trimId = `${car.model_id}_${car.year}_${car.trim_name.replace(/\s+/g, '_').toLowerCase()}`;

      // Make
      if (!seenMakes.has(car.make_id)) {
        insertMake.run({ make_id: car.make_id, name: car.make_name, country: car.country });
        seenMakes.add(car.make_id);
      }

      // Model
      if (!seenModels.has(car.model_id)) {
        insertModel.run({ model_id: car.model_id, make_id: car.make_id, name: car.model_name, body_style: car.body_style });
        seenModels.add(car.model_id);
      }

      // Trim
      insertTrim.run({
        trim_id: trimId,
        model_id: car.model_id,
        make_id: car.make_id,
        year: car.year,
        trim_name: car.trim_name,
        msrp_new: car.msrp_new,
        is_popular: car.is_popular,
      });
      trimCount++;

      // Specs
      insertSpecs.run({ trim_id: trimId, ...car.specs });

      // Price history (24 months)
      const prices = generateHistoricalPrices(trimId, car.msrp_new, car.year, car.body_style, i);
      for (const p of prices) {
        insertPrice.run(p);
        priceCount++;
      }
    }

    return { trimCount, priceCount, makeCount: seenMakes.size, modelCount: seenModels.size };
  });

  const result = runAll();
  console.log(`Seed complete!`);
  console.log(`  Makes: ${result.makeCount}`);
  console.log(`  Models: ${result.modelCount}`);
  console.log(`  Trims: ${result.trimCount}`);
  console.log(`  Price records: ${result.priceCount}`);
  process.exit(0);
}

seed();
