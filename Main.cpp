#include "Spacecraft.h"
#include "GroundStation.h"
#include <iostream>
#include <string>

int main(){
	Spacecraft s1;
	std::cout << s1.get_id() << std::endl;
	GroundStation g1(1000, 90, "ALPHA-1", "Argentina");
	std::cout << g1.get_name() << " " << g1.get_country() << std::endl;
	auto [x,y] = g1.get_coordinates();
	std::cout << std::to_string(x) << "," << std::to_string(y) << std::endl;
	return 0;
}
