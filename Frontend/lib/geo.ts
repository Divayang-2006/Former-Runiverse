// // Haversine formula to calculate distance between two lat/lng points
// export function haversineDistance(
//   coords1: { latitude: number; longitude: number },
//   coords2: { latitude: number; longitude: number }
// ): number {
//   const R = 6371e3; // Earth's radius in meters
//   const lat1 = coords1.latitude * Math.PI / 180;
//   const lat2 = coords2.latitude * Math.PI / 180;
//   const deltaLat = (coords2.latitude - coords1.latitude) * Math.PI / 180;
//   const deltaLon = (coords2.longitude - coords1.longitude) * Math.PI / 180;

//   const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
//             Math.cos(lat1) * Math.cos(lat2) *
//             Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
//   const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

//   return R * c; // in meters
// }