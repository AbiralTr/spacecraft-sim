from sqlalchemy import Column, DateTime, Float, Integer, String, func
from db import Base


class SpacecraftRecord(Base):
    __tablename__ = "spacecraft"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    altitude = Column(Float, nullable=False)
    inclination = Column(Float, nullable=False)
    eccentricity = Column(Float, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
