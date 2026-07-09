import uuid
from spacecraft import Spacecraft

class GroundStation:

    def __init__(self, name, pos, spacecraft_list):
        self.name = name
        self.spacecraft_list = spacecraft_list
        self.groundstation_id = uuid.uuid4()
        self.coordinateX =      pos[0]
        self.coordinateY =      pos[1]
        self.altitude =         pos[2]

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
        return (self.coordinateX, self.coordinateY)

    @property
    def get_altitude(self):
        return self.altitude
