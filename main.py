from spacecraft import Spacecraft
from groundstation import GroundStation

pos = [0,0,0]
g1 = GroundStation("Argent", pos)

s1 = Spacecraft("ENZO-10", 500, 0)

result = g1.check_spacecraft_visibility(6000, s1)

print(result)
