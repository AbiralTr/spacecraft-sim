import os
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from db import Base, engine, get_db
from ground_stations import GROUND_STATIONS
from groundstation import GroundStation
from models import SpacecraftRecord
from schemas import SpacecraftCreate, SpacecraftOut, SpacecraftUpdate
from spacecraft import Spacecraft

Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["*"],
)


def get_spacecraft_record(spacecraft_id: int, db: Session) -> SpacecraftRecord:
    record = db.get(SpacecraftRecord, spacecraft_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Spacecraft not found")
    return record


def to_spacecraft(record: SpacecraftRecord) -> Spacecraft:
    return Spacecraft(record.name, record.altitude, record.inclination, record.eccentricity)


def to_ground_station(station_config: dict) -> GroundStation:
    return GroundStation(
        station_config["name"],
        (station_config["longitude"], station_config["latitude"], station_config["altitude"]),
    )


@app.get("/api/health")
def read_health():
    return {"status": "ok"}


@app.post("/api/spacecraft", response_model=SpacecraftOut, status_code=201)
def create_spacecraft(payload: SpacecraftCreate, db: Session = Depends(get_db)):
    record = SpacecraftRecord(**payload.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@app.get("/api/spacecraft", response_model=list[SpacecraftOut])
def list_spacecraft(db: Session = Depends(get_db)):
    return db.query(SpacecraftRecord).order_by(SpacecraftRecord.created_at).all()


@app.get("/api/spacecraft/{spacecraft_id}", response_model=SpacecraftOut)
def read_spacecraft(spacecraft_id: int, db: Session = Depends(get_db)):
    return get_spacecraft_record(spacecraft_id, db)


@app.patch("/api/spacecraft/{spacecraft_id}", response_model=SpacecraftOut)
def update_spacecraft(spacecraft_id: int, payload: SpacecraftUpdate, db: Session = Depends(get_db)):
    record = get_spacecraft_record(spacecraft_id, db)
    for field, value in payload.model_dump().items():
        setattr(record, field, value)
    db.commit()
    db.refresh(record)
    return record


@app.delete("/api/spacecraft/{spacecraft_id}", status_code=204)
def delete_spacecraft(spacecraft_id: int, db: Session = Depends(get_db)):
    record = get_spacecraft_record(spacecraft_id, db)
    db.delete(record)
    db.commit()


@app.get("/api/spacecraft/{spacecraft_id}/position")
def read_position(spacecraft_id: int, time: float, db: Session = Depends(get_db)):
    record = get_spacecraft_record(spacecraft_id, db)
    spacecraft = to_spacecraft(record)
    position = spacecraft.get_position(time)
    position["period"] = spacecraft.get_period
    return position


@app.get("/api/spacecraft/{spacecraft_id}/orbit-track")
def read_orbit_track(spacecraft_id: int, steps: int = 180, db: Session = Depends(get_db)):
    record = get_spacecraft_record(spacecraft_id, db)
    spacecraft = to_spacecraft(record)
    period = spacecraft.get_period
    step_size = period / steps
    track = []
    for i in range(steps + 1):
        t = i * step_size
        position = spacecraft.get_position(t)
        track.append({"time": t, **position})
    return {"period": period, "track": track}


@app.get("/api/spacecraft/{spacecraft_id}/contact-windows")
def read_contact_windows(spacecraft_id: int, db: Session = Depends(get_db)):
    record = get_spacecraft_record(spacecraft_id, db)
    spacecraft = to_spacecraft(record)
    results = []
    for station_config in GROUND_STATIONS:
        station = to_ground_station(station_config)
        try:
            windows = station.get_all_contact_windows(spacecraft)
        except TimeoutError:
            windows = []
        results.append(
            {
                "station_id": station_config["id"],
                "station_name": station_config["name"],
                "windows": [{"start": start, "end": end} for start, end in windows],
            }
        )
    return results


@app.get("/api/ground-stations")
def read_ground_stations():
    stations = []
    for station_config in GROUND_STATIONS:
        x, y, z = to_ground_station(station_config).get_cartesian_coordinates
        stations.append({**station_config, "x": x, "y": y, "z": z})
    return stations


frontend_dist = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.isdir(frontend_dist):
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")
