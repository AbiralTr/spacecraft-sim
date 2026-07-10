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
        satellite_position = tuple(spacecraft.get_position(time).values())
        station_position = self.get_cartesian_coordinates
        
        to_sat = MathHelpers.subtract_two_vectors(satellite_position, station_position)
        dot_product = MathHelpers.compute_dot_product(to_sat, station_position)
        
        cos_theta = dot_product / (MathHelpers.compute_magnitude(station_position) * MathHelpers.compute_magnitude(to_sat))
        theta = math.acos(cos_theta)

        if theta < math.pi/2:
            return True

        return False
        
    def get_contact_windows(self, spacecraft, start_time=0, max_search_time=None):
        interval = 60 # seconds
        if max_search_time is None:
            max_search_time = spacecraft.get_period * 2

        time = start_time
        deadline = start_time + max_search_time

        is_visible = self.check_spacecraft_visibility(time, spacecraft)

        while not is_visible:
            if time > deadline:
                raise TimeoutError("No contact window found within max_search_time")
            time += interval
            is_visible = self.check_spacecraft_visibility(time, spacecraft)

        start = time

        while is_visible:
            if time > deadline:
                raise TimeoutError("Contact window did not end within max_search_time")
            time += interval
            is_visible = self.check_spacecraft_visibility(time, spacecraft)

        end = time

        return (start, end)

    def get_all_contact_windows(self, spacecraft, start_time=0, max_search_time=None):
        list = []
        while start_time < 86400:
            window = self.get_contact_windows(spacecraft, start_time, max_search_time)
            start_time = window[1]
            list.append(window)
        
        return list
