from datetime import datetime
from pydantic import BaseModel, Field, model_validator


class SpacecraftFields(BaseModel):
    name: str = Field(min_length=1, max_length=64)
    altitude: float = Field(gt=0)
    inclination: float = Field(ge=0, le=180)
    eccentricity: float = Field(ge=0, le=0.99)

class SpacecraftBase(SpacecraftFields):
    @model_validator(mode="after")
    def check_periapsis(self):
        """
        Steps:
        - Compute periapsis altitude
        - if it's <= 150 (km distance to surface), throw error
        """
        a = 6371 + self.altitude
        e = self.eccentricity
        periapsis_altitude = a * (1 - e) - 6371
        if periapsis_altitude <= 150:
            raise ValueError("Orbit periapsis is too low, spacecraft would crash")
        return self

class SpacecraftCreate(SpacecraftBase):
    pass


class SpacecraftUpdate(SpacecraftBase):
    pass


class SpacecraftOut(SpacecraftFields):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}
