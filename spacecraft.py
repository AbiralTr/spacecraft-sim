import uuid
import time
import math
from utils import MathHelpers

class Spacecraft:

    def __init__(self, name, alt, inc, ecc):
        self.spacecraft_id = uuid.uuid4()
        self.spacecraft_name = name
        self.mean_altitude = alt
        self.inclination = inc
        self.eccentricity = ecc
    
    @property
    def get_eccentricity(self):
        return self.eccentricity

    @property
    def get_id(self):
        return self.spacecraft_id

    @property
    def get_name(self):
        return self.spacecraft_name
    
    @property
    def get_mean_altitude(self):
        """
        Reference altitude used primarily to derive the semi major axis
        """
        return self.mean_altitude

    @property
    def get_inclination(self):
        """Unit: Degrees"""
        return self.inclination
    
    def get_position(self, time):
        M = self.get_angle(time)
        e = self.eccentricity
        E = MathHelpers.keplers_equation(M, e)
        v = 2 * math.atan2( math.sqrt(1+e) * math.sin(E/2), math.sqrt(1-e) * math.cos(E/2) )
        a = 6371 + self.mean_altitude
        r = a * (1 - self.eccentricity * math.cos(E))
        x = r * math.cos(v)
        y = r * math.sin(v)
        inc = math.radians(self.get_inclination)
        y_inc = y * math.cos(inc)
        z_inc = y * math.sin(inc)
        return (x, y_inc, z_inc)
        
    @property
    def get_period(self):
        """Unit: Seconds"""
        earth_radius = 6371
        a = earth_radius + self.mean_altitude
        u = 398600
        return 2 * math.pi * math.sqrt(a**3 / u)
    
    def get_angle(self, time):
        return (2 * math.pi) * (time / self.get_period) % (2 * math.pi)
