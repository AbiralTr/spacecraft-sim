from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from spacecraft import Spacecraft
from groundstation import GroundStation

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "ok"}

@app.get("/position")
def read_position(time: float, altitude: float = 500, inclination: float = 0, eccentricity: float = 0.1):
    spacecraft = Spacecraft("ZETA", altitude, inclination, eccentricity)
    position = spacecraft.get_position(time)
    position["period"] = spacecraft.get_period
    return position

@app.get("/contact-windows")
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
