import uuid
import time
import math

class Spacecraft:

    def __init__(self, name, alt, inc):
        self.spacecraft_id = uuid.uuid4()
        self.spacecraft_name = name
        self.altitude = alt
        self.inclination = inc
    
    @property
    def get_id(self):
        return self.spacecraft_id

    @property
    def get_name(self):
        return self.spacecraft_name
    
    @property
    def get_altitude(self):
        """Unit: Kilometers"""
        return self.altitude

    @property
    def get_inclination(self):
        """Unit: Degrees"""
        return self.inclination

    def get_position(self, time):
        angle = self.get_angle(time)
        a = 6371 + self.altitude
        x = a * math.cos(angle)
        y = (a * math.sin(angle))
        
        inc = math.radians(self.get_inclination)
        y_inc = y * math.cos(inc)
        z_inc = y * math.sin(inc)

        return (x, y_inc, z_inc)

    def get_period(self):
        """Unit: Seconds"""
        earth_radius = 6371
        a = earth_radius + self.altitude
        u = 398600
        return 2 * math.pi * math.sqrt(a**3 / u)
    
    def get_angle(self, time):
        return (2 * math.pi) * (time / self.get_period()) % (2 * math.pi)
