import { Challenge, Badge } from "@/store/types";

export const mockChallenges: Challenge[] = [
    { id: 'c1', title: 'Morning 5K', description: 'Walk 5km in one session', goal: 5000, currentProgress: 2500, type: 'distance', isCompleted: false },
    { id: 'c2', title: 'Daily Steps', description: 'Reach 7,500 steps today', goal: 7500, currentProgress: 6000, type: 'steps', isCompleted: false },
    { id: 'c3', title: 'Weekly Marathon', description: 'Cover 42km this week', goal: 42000, currentProgress: 31000, type: 'distance', isCompleted: false },
    { id: 'c4', title: 'The Long Haul', description: 'A completed challenge', goal: 10000, currentProgress: 10000, type: 'steps', isCompleted: true },
];

export const mockBadges: Badge[] = [
    { id: 'b1', name: 'First Steps', description: 'Completed your first walk.', earnedOn: new Date().toISOString(), icon: 'footprints' },
    { id: 'b2', name: '5K Finisher', description: 'Completed a 5km walk.', earnedOn: null, icon: 'medal' },
    { id: 'b3', name: '7-Day Streak', description: 'Walked every day for a week.', earnedOn: new Date().toISOString(), icon: 'flame' },
    { id: 'b4', name: 'Territory Tycoon', description: 'Claimed 10 new tiles.', earnedOn: null, icon: 'map' },
];