from datetime import datetime
from pydantic import BaseModel, Field


class SpacecraftBase(BaseModel):
    name: str = Field(min_length=1, max_length=64)
    altitude: float = Field(gt=0)
    inclination: float = Field(ge=0, le=180)
    eccentricity: float = Field(ge=0, le=0.99)


class SpacecraftCreate(SpacecraftBase):
    pass


class SpacecraftUpdate(SpacecraftBase):
    pass


class SpacecraftOut(SpacecraftBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}
