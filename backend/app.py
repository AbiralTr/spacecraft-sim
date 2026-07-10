from fastapi import FastAPI
from spacecraft import Spacecraft

app = FastAPI()

spacecraft = Spacecraft("ZETA", 500, 0, .1)

@app.get("/")
def read_root():
    return {"status": "ok"}

@app.get("/position")
def read_position(time: float):
    return spacecraft.get_position(time)
