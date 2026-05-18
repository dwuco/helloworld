-- Car Makes (Toyota, Honda, Ford, etc.)
CREATE TABLE IF NOT EXISTS makes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  make_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  country TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Car Models (Camry, Accord, F-150, etc.)
CREATE TABLE IF NOT EXISTS models (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  model_id TEXT UNIQUE NOT NULL,
  make_id TEXT NOT NULL,
  name TEXT NOT NULL,
  body_style TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (make_id) REFERENCES makes(make_id)
);

-- Car Trims (specific year + trim combinations)
CREATE TABLE IF NOT EXISTS car_trims (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trim_id TEXT UNIQUE NOT NULL,
  model_id TEXT NOT NULL,
  make_id TEXT NOT NULL,
  year INTEGER NOT NULL,
  trim_name TEXT NOT NULL DEFAULT 'Base',
  msrp_new REAL,
  is_popular INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (model_id) REFERENCES models(model_id),
  FOREIGN KEY (make_id) REFERENCES makes(make_id)
);

-- Car Specs (detailed specifications)
CREATE TABLE IF NOT EXISTS car_specs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trim_id TEXT UNIQUE NOT NULL,
  -- Engine
  engine_displacement REAL,
  engine_cylinders INTEGER,
  engine_horsepower INTEGER,
  engine_torque INTEGER,
  engine_type TEXT,
  -- Transmission
  transmission_type TEXT,
  transmission_gears INTEGER,
  -- Drivetrain
  drivetrain TEXT,
  -- Fuel Economy
  fuel_city INTEGER,
  fuel_highway INTEGER,
  fuel_combined INTEGER,
  fuel_type TEXT,
  -- Dimensions
  length_inches REAL,
  width_inches REAL,
  height_inches REAL,
  wheelbase_inches REAL,
  curb_weight_lbs INTEGER,
  -- Safety
  nhtsa_overall_rating INTEGER,
  nhtsa_frontal_rating INTEGER,
  nhtsa_side_rating INTEGER,
  nhtsa_rollover_rating INTEGER,
  -- Other
  seating_capacity INTEGER,
  cargo_volume_cuft REAL,
  towing_capacity_lbs INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (trim_id) REFERENCES car_trims(trim_id)
);

-- Price History (monthly price snapshots)
CREATE TABLE IF NOT EXISTS price_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trim_id TEXT NOT NULL,
  price_date DATE NOT NULL,
  market_price REAL NOT NULL,
  price_type TEXT DEFAULT 'used',
  mileage_basis INTEGER DEFAULT 0,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (trim_id) REFERENCES car_trims(trim_id),
  UNIQUE(trim_id, price_date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_models_make_id ON models(make_id);
CREATE INDEX IF NOT EXISTS idx_car_trims_model_id ON car_trims(model_id);
CREATE INDEX IF NOT EXISTS idx_car_trims_make_id ON car_trims(make_id);
CREATE INDEX IF NOT EXISTS idx_car_trims_year ON car_trims(year);
CREATE INDEX IF NOT EXISTS idx_price_history_trim_id ON price_history(trim_id);
CREATE INDEX IF NOT EXISTS idx_price_history_date ON price_history(price_date);
