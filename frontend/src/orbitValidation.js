export const EARTH_RADIUS_KM = 6371
export const MIN_PERIAPSIS_ALTITUDE_KM = 150

export function getPeriapsisAltitude(altitude, eccentricity) {
	const a = EARTH_RADIUS_KM + altitude
	return a * (1 - eccentricity) - EARTH_RADIUS_KM
}
