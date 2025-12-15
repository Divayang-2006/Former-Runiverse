import React from 'react';
import { Tabs } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { Award, BarChart3, Home, MapPinned, User } from "lucide-react-native";

export default function TabLayout() {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  return (
    <Tabs
      initialRouteName="index" 
      screenOptions={{
        tabBarActiveTintColor: isDarkMode ? '#00C853' : '#166534', // Green color
        tabBarInactiveTintColor: isDarkMode ? '#A9A9A9' : '#6B7280',
        tabBarStyle: {
          backgroundColor: isDarkMode ? '#161622' : '#FFFFFF',
          borderTopWidth: 0,
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Home color={color} size={size ?? 24} strokeWidth={2.2} />
          ),
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: 'Leaders',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <BarChart3 color={color} size={size ?? 24} strokeWidth={2.2} />
          ),
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Run',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <MapPinned color={color} size={size ?? 24} strokeWidth={2.2} />
          ),
        }}
      />
      <Tabs.Screen
        name="challenges"
        options={{
          title: 'Challenges',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Award color={color} size={size ?? 24} strokeWidth={2.2} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <User color={color} size={size ?? 24} strokeWidth={2.2} />
          ),
        }}
      />
    </Tabs>
  );
}