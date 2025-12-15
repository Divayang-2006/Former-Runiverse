import { api } from "./api";
import { authService } from "./AuthService";
import { polygonAreaMeters2, pathLengthMeters } from "@/utils/loopDetection";

export interface TerritoryFeature {
  type: "Feature";
  geometry: {
    type: "Polygon";
    coordinates: [Array<[number, number]>];
  };
  properties: {
    id?: string;
    name?: string;
    owner?: any;
    area?: number | null;
    length?: number | null;
    claimedOn?: string | Date | null;
    localId?: string;
  };
}

export interface ClaimTerritoryInput {
  name?: string;
  coordinates: [number, number][];
  area?: number;
  length?: number;
}

type ApiListResponse = { success: boolean; data: any[] } | any[];
type ApiSingleResponse = { success: boolean; data: any } | any;

const ensureClosedRing = (ring: [number, number][]): [number, number][] => {
  if (!ring.length) {
    return ring;
  }
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] === last[0] && first[1] === last[1]) {
    return ring;
  }
  return [...ring, first];
};

const stripClosingVertex = (ring: [number, number][]): [number, number][] => {
  if (ring.length < 2) {
    return ring;
  }
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] === last[0] && first[1] === last[1]) {
    return ring.slice(0, ring.length - 1);
  }
  return ring;
};

const territoryToFeature = (territory: any): TerritoryFeature => {
  const polygon = Array.isArray(territory?.location?.coordinates)
    ? territory.location.coordinates[0] ?? []
    : [];
  const closed = ensureClosedRing(polygon as [number, number][]);
  const workingRing = stripClosingVertex(closed);
  const area = typeof territory?.metrics?.area === "number"
    ? territory.metrics.area
    : polygonAreaMeters2(workingRing as [number, number][]);
  const length = typeof territory?.metrics?.length === "number"
    ? territory.metrics.length
    : pathLengthMeters(workingRing as [number, number][]);

  return {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [closed],
    },
    properties: {
      id: territory?._id ?? territory?.id,
      name: territory?.name ?? undefined,
      owner: territory?.owner ?? undefined,
      area,
      length,
      claimedOn: territory?.claimedOn ?? null,
    },
  };
};

const unwrapListResponse = (response: ApiListResponse): any[] => {
  if (Array.isArray(response)) {
    return response;
  }
  if (response && Array.isArray(response.data)) {
    return response.data;
  }
  return [];
};

const unwrapSingleResponse = (response: ApiSingleResponse): any => {
  if (response && typeof response === "object" && "data" in response) {
    return response.data;
  }
  return response;
};

export const territoryService = {
  async fetchTerritories(): Promise<TerritoryFeature[]> {
    const raw = await api.get<ApiListResponse>("/api/territories");
    return unwrapListResponse(raw).map(territoryToFeature);
  },

  async claimTerritory(input: ClaimTerritoryInput): Promise<TerritoryFeature> {
    await authService.hydrate();
    const token = authService.getToken() || undefined;
    const payload = {
      name: input.name,
      coordinates: [ensureClosedRing(input.coordinates)],
      area: typeof input.area === "number" ? input.area : undefined,
      length: typeof input.length === "number" ? input.length : undefined,
    };
    const response = await api.post<ApiSingleResponse>("/api/territories/claim", payload, token);
    return territoryToFeature(unwrapSingleResponse(response));
  },
};

export default territoryService;
