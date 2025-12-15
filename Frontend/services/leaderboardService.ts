import { Group } from "@/store/types";
import { api } from "./api";
import { authService } from "./AuthService";

export const mockGroups: Group[] = [
    { id: 'group-1', name: 'Diamond City Striders', color: '#6A5ACD', memberCount: 12 },
    { id: 'group-2', name: 'Tapi River Runners', color: '#DC143C', memberCount: 8 },
    { id: 'group-3', name: 'Surat Silk Sprinters', color: '#3CB371', memberCount: 15 },
];

export const mockLeaderboard = [
    { rank: 1, avatarUrl: 'https://i.pravatar.cc/150?u=user-2', name: 'RunnerPro', distance: 42195, trend: 'up', groupId: 'group-3' },
    { rank: 2, avatarUrl: 'https://i.pravatar.cc/150?u=user-3', name: 'SpeedyGonzales', distance: 38500, trend: 'down', groupId: 'group-2' },
    { rank: 3, avatarUrl: 'https://i.pravatar.cc/150?u=user-1', name: 'PlayerOne', distance: 35200, trend: 'up', groupId: 'group-1' },
    { rank: 4, avatarUrl: 'https://i.pravatar.cc/150?u=user-4', name: 'TrailBlazer', distance: 31000, trend: 'stable', groupId: 'group-3' },
    { rank: 5, avatarUrl: 'https://i.pravatar.cc/150?u=user-5', name: 'PaceMaker', distance: 29800, trend: 'down', groupId: 'group-1' },
];

export interface LeaderboardEntry {
    rank: number;
    userId: string;
    username: string;
    avatarUrl: string | null;
    city: string | null;
    steps: number;
    distance: number;
    totalArea: number;
    territoryCount: number;
    lifetimeSteps: number;
    lifetimeDistance: number;
}

type LeaderboardApiPayload = {
    rank?: number;
    userId?: string;
    _id?: string;
    username: string;
    avatar?: string | null;
    avatarUrl?: string | null;
    city?: string | null;
    steps?: number;
    distance?: number;
    lifetimeSteps?: number;
    lifetimeDistance?: number;
    totalArea?: number;
    territoryCount?: number;
};

type LeaderboardApiResponse = {
    success: boolean;
    data: LeaderboardApiPayload[];
};

const normalizeEntry = (entry: LeaderboardApiPayload, fallbackRank: number): LeaderboardEntry => ({
    rank: entry.rank ?? fallbackRank,
    userId: entry.userId ?? entry._id ?? String(fallbackRank),
    username: entry.username,
    avatarUrl: entry.avatarUrl ?? entry.avatar ?? null,
    city: entry.city ?? null,
    steps: entry.steps ?? 0,
    distance: entry.distance ?? 0,
    lifetimeSteps: entry.lifetimeSteps ?? 0,
    lifetimeDistance: entry.lifetimeDistance ?? 0,
    totalArea: entry.totalArea ?? 0,
    territoryCount: entry.territoryCount ?? 0,
});

export const leaderboardService = {
    async fetchCityLeaderboard(city: string): Promise<LeaderboardEntry[]> {
        const token = authService.getToken() || undefined;
        const encodedCity = encodeURIComponent(city.trim());
        const response = await api.get<LeaderboardApiResponse | LeaderboardApiResponse["data"]>(
            `/api/leaderboard/city?city=${encodedCity}`,
            token
        );

        const dataArray: LeaderboardApiResponse["data"] = Array.isArray(response)
            ? response
            : response?.data ?? [];

        return dataArray.map((entry, index) => normalizeEntry(entry, index + 1));
    },

    async fetchGlobalLeaderboard(): Promise<LeaderboardEntry[]> {
        const token = authService.getToken() || undefined;
        const response = await api.get<LeaderboardApiResponse | LeaderboardApiResponse["data"]>(
            `/api/leaderboard`,
            token
        );

        const dataArray: LeaderboardApiResponse["data"] = Array.isArray(response)
            ? response
            : response?.data ?? [];

        return dataArray.map((entry, index) => normalizeEntry(entry, index + 1));
    },
};