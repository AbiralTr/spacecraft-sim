# Spacecraft Simulator

A personal learning project by Abiral Tuladhar: 3D web simulation of a fake spacecraft orbiting Earth, built on hand-derived two-body Keplerian orbital mechanics rather than a library like SGP4. Eventually this will pull in real weather data via an external API.

Live at [spacecraft.abiraltuladhar.dev](https://spacecraft.abiraltuladhar.dev).

## Stack

- **Backend**: Python + FastAPI
- **Frontend**: React (Vite) + Ant Design + CesiumJS

## Status

- Orbital mechanics: circular orbits, inclination, and elliptical orbits (via Kepler's equation) are implemented in `backend/spacecraft.py`
- Ground station visibility and contact-window scheduling are implemented in `backend/groundstation.py`
- FastAPI backend exposes spacecraft position, orbit sampling, and ground-station endpoints under `/api/*` (`backend/app.py`), and serves the built frontend directly in production
- Frontend has forms for spacecraft position and ground-station contact windows, plus a 3D Cesium globe rendering the live orbit track and ground station
- Deployed as a single Render service, built from `render.yaml`

## Project structure

```
backend/
  app.py            FastAPI app, /api routes + static frontend mount
  main.py           standalone script for manually exercising the sim
  spacecraft.py      orbital mechanics (position, period, eccentricity)
  groundstation.py   ground station visibility + contact windows
  utils.py           shared math helpers
  requirements.txt

frontend/            Vite + React app
  src/
    App.jsx           forms + layout
    OrbitGlobe.jsx     Cesium 3D orbit/ground-station visualization
    main.jsx           Ant Design theme setup

render.yaml          Render Blueprint (build + start commands)
run.sh               runs backend + frontend together for local dev
```

## Running it

**Quick start** (runs both backend and frontend, Ctrl+C stops both):
```
./run.sh
```
Frontend: `http://localhost:5173`. Backend API docs: `http://localhost:8000/docs`.

**Backend only**
```
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --reload
```

**Frontend only**
```
cd frontend
npm install
npm run dev
```
