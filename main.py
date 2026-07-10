from spacecraft import Spacecraft
from groundstation import GroundStation

pos = [0,0,0]
g1 = GroundStation("Argent", pos)
s1 = Spacecraft("ENZO-10", 500, 20, .01)

windows = g1.get_all_contact_windows(s1)

print(windows)

