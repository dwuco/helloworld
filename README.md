# CarSpecs - Car Specs & Pricing Web App

A full-stack web application for looking up detailed car specifications and historical market pricing for 50+ popular vehicles.

## Features

- **Search & Browse** - Find any of 50+ popular vehicles by make, model, year, body style, or price range
- **Detailed Specs** - Engine, transmission, drivetrain, fuel economy, dimensions, safety ratings, and more
- **Price History** - 24 months of historical market pricing with interactive charts
- **Depreciation Modeling** - Realistic pricing based on age, seasonal demand, and market noise
- **NHTSA Safety Data** - Official crash test ratings for every vehicle
- **Daily Updates** - Cron job refreshes prices every night at midnight

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + Recharts
- **Backend**: Node.js + Express + TypeScript
- **Database**: SQLite via better-sqlite3
- **Data Sources**: NHTSA API for makes/models; computed depreciation model for pricing

## Quick Start

```bash
# Install all dependencies
npm install

# Seed the database with 50+ cars and 24 months of price history
npm run seed

# Start both frontend and backend in development mode
npm run dev
```

The app will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start both client and server with hot reload |
| `npm run dev:server` | Start server only (port 3001) |
| `npm run dev:client` | Start client only (port 3000) |
| `npm run seed` | Populate database with seed data |
| `npm run build` | Build both client and server for production |
| `npm run start` | Run production server |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/makes` | All car makes |
| GET | `/api/makes/:makeId/models` | Models for a make |
| GET | `/api/models/:modelId/years` | Available years |
| GET | `/api/cars/search?q=&make=&model=&year=` | Search cars |
| GET | `/api/cars/popular` | Popular/featured cars |
| GET | `/api/cars/:id` | Full car details + specs |
| GET | `/api/prices/:id` | Current + 24-month price history |
| POST | `/api/admin/sync` | Trigger manual data sync |

## Database Schema

- **makes** - Car manufacturers (Toyota, Ford, BMW, etc.)
- **models** - Car model lines (Camry, F-150, 3 Series, etc.)
- **car_trims** - Specific year + trim combinations
- **car_specs** - Detailed specifications per trim
- **price_history** - Monthly market price snapshots (24 months)

## Pricing Model

Prices are computed using a realistic depreciation model:

- First year: ~18% depreciation
- Second year: ~13% additional
- Years 3-5: ~9-11% per year
- Years 5-8: ~5% per year
- Beyond 8 years: 3% per year (floor at 8% of MSRP)

Plus seasonal variation (convertibles peak in summer, trucks in spring) and ±3% random market noise.

## Daily Update Job

A `node-cron` job runs at midnight Eastern time to:
1. Check NHTSA for new makes/models
2. Recalculate all current prices
3. Insert new `price_history` records
4. Log the sync summary

Trigger manually: `POST /api/admin/sync`

## Vehicles Included

50+ vehicles across all major segments including:

Toyota (Camry, Corolla, RAV4, Tacoma, Highlander), Honda (Accord, Civic, CR-V, Pilot), Ford (F-150, Mustang, Explorer, Bronco), Chevrolet (Silverado, Equinox, Corvette), Tesla (Model 3, Model Y, Model X), BMW (3 Series, 5 Series, X5), Mercedes-Benz (C-Class, E-Class, GLE), Audi (A4, Q7), Nissan (Altima, Rogue, GT-R), Jeep (Wrangler, Grand Cherokee), Hyundai (Elantra, Tucson, IONIQ 6), Kia (Telluride, Sorento), Subaru (Outback, Forester), Lexus (RX, ES), Porsche (911, Cayenne), Cadillac (Escalade), GMC (Sierra, Yukon), Ram (1500), Dodge (Charger, Challenger), Mazda (CX-5, MX-5 Miata), Volkswagen (Jetta, Tiguan), Rivian (R1T), Lucid (Air), Land Rover (Defender), Volvo (XC90), Genesis (GV80), Acura (MDX), Lincoln (Navigator)
