import { HashMap } from './Utils';

export interface Location {
  lat: number,
  lng: number
}

export const regions: HashMap<Location> = {
  south_america: { lat: -18.4797729, lng: -59.7095867 },
  north_america: { lat: 49.350299, lng: -98.574217 },
  europe: { lat: 55.619943, lng: 33.650381 },
  asia: { lat: 53.950716, lng: 101.198955 },
  africa: { lat: 10.824344, lng: 18.581768 },
  oceania: { lat: -25.901887, lng: 133.394243 },
};

class UserLocation {
  public getDistance = (point1: Location, point2: Location): number => {
    const normalized = {} as Location;
    normalized.lat = point2.lat - point1.lat;
    normalized.lng = point2.lng - point1.lng;
    return Math.sqrt(normalized.lat ** 2 + normalized.lng ** 2);
  }

  public getNearestRegion(point: Location): string {
    const distances = {} as HashMap<number>;
    Object.keys(regions).forEach((region) => {
      distances[region] = this.getDistance(point, regions[region]);
    });
    const minDistance = Math.min(...Object.values<number>(distances));
    const index = Object.values<number>(distances).indexOf(minDistance);
    return Object.keys(distances)[index];
  }
}

export default new UserLocation();
