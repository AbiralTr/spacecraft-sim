# Spacecraft Simulator

A personal learning project by Abiral Tuladhar: 3D web simulation of fake spacecraft orbiting Earth, built on hand-derived two-body Keplerian orbital mechanics rather than a library like SGP4. Eventually this will pull in real weather data via an external API.

WIP

## Stack

- **Backend**: Python + FastAPI
- **Frontend**: React (Vite) + Ant Design + Three.js/react-three-fiber

## Status

- Orbital mechanics: circular orbits, inclination, and elliptical orbits (via Kepler's equation) are implemented in `backend/spacecraft.py`
- Ground station visibility and contact-window scheduling are implemented in `backend/groundstation.py`
- FastAPI backend exposes spacecraft position over HTTP (`backend/app.py`)
- Frontend is scaffolded but not yet built out

## Project structure

```
backend/
  app.py            FastAPI app
  main.py           standalone script for manually exercising the sim
  spacecraft.py      orbital mechanics (position, period, eccentricity)
  groundstation.py   ground station visibility + contact windows
  utils.py           shared math helpers
  requirements.txt

frontend/            Vite + React app
  src/
```

## Running it

**Backend**
```
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --reload
```
Then visit `http://localhost:8000/docs` for the interactive API docs.

**Frontend**
```
cd frontend
npm install
npm run dev
```
