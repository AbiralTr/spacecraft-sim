import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from spacecraft import Spacecraft
from groundstation import GroundStation

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

@app.get("/api/health")
def read_health():
    return {"status": "ok"}

@app.get("/api/position")
def read_position(time: float, altitude: float = 500, inclination: float = 0, eccentricity: float = 0.1):
    spacecraft = Spacecraft("ZETA", altitude, inclination, eccentricity)
    position = spacecraft.get_position(time)
    position["period"] = spacecraft.get_period
    return position

@app.get("/api/orbit-track")
def read_orbit_track(
    altitude: float = 500,
    inclination: float = 0,
    eccentricity: float = 0.1,
    steps: int = 180,
):
    spacecraft = Spacecraft("ZETA", altitude, inclination, eccentricity)
    period = spacecraft.get_period
    step_size = period / steps
    track = []
    for i in range(steps + 1):
        t = i * step_size
        position = spacecraft.get_position(t)
        track.append({"time": t, **position})
    return {"period": period, "track": track}

@app.get("/api/contact-windows")
def read_contact_windows(
    altitude: float = 500,
    inclination: float = 0,
    eccentricity: float = 0.1,
    longitude: float = 0,
    latitude: float = 0,
    station_altitude: float = 0,
):
    spacecraft = Spacecraft("ZETA", altitude, inclination, eccentricity)
    station = GroundStation("Ground Station", (longitude, latitude, station_altitude))
    try:
        windows = station.get_all_contact_windows(spacecraft)
    except TimeoutError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    return [{"start": start, "end": end} for start, end in windows]

@app.get("/api/ground-station")
def read_ground_station(longitude: float = 0, latitude: float = 0, station_altitude: float = 0):
    station = GroundStation("Ground Station", (longitude, latitude, station_altitude))
    x, y, z = station.get_cartesian_coordinates
    return {"x": x, "y": y, "z": z}

frontend_dist = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.isdir(frontend_dist):
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")
