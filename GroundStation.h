#include <string>
#include <tuple>

class GroundStation{
	private:
		int coordinateX;
		int coordinateY;
		std::string name;
		std::string country;
	public:
		GroundStation(int x, int y, std::string s, std::string c);
		
		std::string get_name();
		std::string get_country();

		std::tuple<int, int> get_coordinates();	
};
