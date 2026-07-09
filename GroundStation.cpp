#include "GroundStation.h"
#include <string>

GroundStation::GroundStation(int x, int y, std::string n, std::string c): coordinateX(x), coordinateY(y), name(n), country(c)  {};

std::string GroundStation::get_name(){ return name; };
std::string GroundStation::get_country(){ return country; };

std::tuple<int, int> GroundStation::get_coordinates(){ 
	return {coordinateX, coordinateY};
};
