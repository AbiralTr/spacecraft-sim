import uuid

class Spacecraft:

    def __init__(self, name):
        self.spacecraft_id = uuid.uuid4()
        self.spacecraft_name = name
    
    @property
    def get_id(self):
        return self.spacecraft_id

    @property
    def get_name(self):
        return self.spacecraft_name

