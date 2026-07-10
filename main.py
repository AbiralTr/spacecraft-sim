from spacecraft import Spacecraft
from groundstation import GroundStation
import math

s1 = Spacecraft("GAMMA-1", 400, 90.5)
sc_list = [s1]
geodetic_position = [101, 23, 1000]
g1 = GroundStation("Atlantis", geodetic_position, sc_list)

