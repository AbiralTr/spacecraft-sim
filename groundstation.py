import uuid
import math
from spacecraft import Spacecraft
from utils import MathHelpers

class GroundStation:

    def __init__(self, name, pos):
        self.name = name
        self.groundstation_id = uuid.uuid4()
        self.longitude = pos[0]
        self.latitude = pos[1]
        self.altitude = pos[2]

    @property
    def get_name(self):
        return self.name

    @property
    def get_spacecrafts(self):
        return self.spacecraft_list

    @property
    def get_id(self):
        return self.groundstation_id

    @property
    def get_coordinates(self):
        return (self.longitude, self.latitude, self.altitude)
    
    @property
    def get_cartesian_coordinates(self):
        R = 6371
        lat = math.radians(self.latitude)
        lon = math.radians(self.longitude)

        x = (R + self.altitude) * math.cos(lat) * math.cos(lon)
        y = (R + self.altitude) * math.cos(lat) * math.sin(lon)
        z = (R + self.altitude) * math.sin(lat)

        return (x, y, z)
    
    def check_spacecraft_visibility(self, time, spacecraft) -> bool:
        satellite_position = spacecraft.get_position(time)
        station_position = self.get_cartesian_coordinates
        
        to_sat = MathHelpers.subtract_two_vectors(satellite_position, station_position)
        dot_product = MathHelpers.compute_dot_product(to_sat, station_position)
        
        cos_theta = dot_product / (MathHelpers.compute_magnitude(station_position) * MathHelpers.compute_magnitude(to_sat))
        theta = math.acos(cos_theta)

        if theta < math.pi/2:
            return True

        return False
        

