import React from 'react';
import { View, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useTheme } from '../../context/ThemeContext';
import { LayoutDashboard, Map, Trophy, BarChart2, User } from "lucide-react-native";

export default function TabLayout() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  // Floating dock colors
  const activeTint = '#10B981'; // emerald-500
  const inactiveTint = isDark ? '#94A3B8' : '#64748B'; // slate-400/500

  return (
    <Tabs
      initialRouteName="index" 
      screenOptions={{
        tabBarActiveTintColor: activeTint,
        tabBarInactiveTintColor: inactiveTint,
        tabBarShowLabel: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 45 + insets.bottom,
          paddingBottom: insets.bottom,
          borderRadius: 0,
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarBackground: () => (
          <BlurView
            intensity={isDark ? 80 : 100}
            tint={isDark ? 'dark' : 'light'}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: isDark ? 'rgba(2, 6, 23, 0.7)' : 'rgba(255, 255, 255, 0.7)',
              borderTopWidth: 1,
              borderTopColor: isDark ? 'rgba(71, 85, 105, 0.3)' : 'rgba(226, 232, 240, 0.8)',
              overflow: 'hidden',
            }}
          />
        ),
        tabBarItemStyle: {
          paddingTop: 7,
        },
        headerShown: false,
        tabBarHideOnKeyboard: true,
        sceneStyle: {
          paddingBottom: 0,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused, color, size }: { focused: boolean; color: string; size: number }) => (
            <View style={{ 
              alignItems: 'center', 
              justifyContent: 'center',
              width: 48,
              height: 48,
            }}>
              <View style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: focused ? (isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)') : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <LayoutDashboard 
                  color={color} 
                  size={22} 
                  strokeWidth={focused ? 2.5 : 2} 
                  fill={focused ? color : 'none'}
                />
              </View>
              {focused && (
                <View style={{
                  width: 4,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: activeTint,
                  marginTop: 2,
                  shadowColor: activeTint,
                  shadowOpacity: 0.6,
                  shadowRadius: 4,
                  shadowOffset: { width: 0, height: 0 },
                }} />
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: 'Leaders',
          tabBarIcon: ({ focused, color, size }: { focused: boolean; color: string; size: number }) => (
            <View style={{ 
              alignItems: 'center', 
              justifyContent: 'center',
              width: 48,
              height: 48,
            }}>
              <View style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: focused ? (isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)') : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <BarChart2 
                  color={color} 
                  size={22} 
                  strokeWidth={focused ? 2.5 : 2} 
                  fill={focused ? color : 'none'}
                />
              </View>
              {focused && (
                <View style={{
                  width: 4,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: activeTint,
                  marginTop: 2,
                  shadowColor: activeTint,
                  shadowOpacity: 0.6,
                  shadowRadius: 4,
                  shadowOffset: { width: 0, height: 0 },
                }} />
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
          tabBarIcon: ({ focused, color, size }: { focused: boolean; color: string; size: number }) => (
            <View style={{ 
              alignItems: 'center', 
              justifyContent: 'center',
              width: 52,
              height: 52,
              marginTop: -10,
            }}>
              <View style={{
                width: 52,
                height: 52,
                borderRadius: 26,
                backgroundColor: focused ? activeTint : (isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.15)'),
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 3,
                borderColor: isDark ? 'rgba(2, 6, 23, 0.7)' : 'rgba(255, 255, 255, 0.7)',
                shadowColor: activeTint,
                shadowOpacity: focused ? 0.5 : 0.3,
                shadowRadius: 16,
                shadowOffset: { width: 0, height: 4 },
                elevation: 8,
              }}>
                <Map 
                  color={focused ? '#FFFFFF' : color} 
                  size={26} 
                  strokeWidth={2.5} 
                  fill={focused ? '#FFFFFF' : 'none'}
                />
              </View>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="challenges"
        options={{
          title: 'Challenges',
          tabBarIcon: ({ focused, color, size }: { focused: boolean; color: string; size: number }) => (
            <View style={{ 
              alignItems: 'center', 
              justifyContent: 'center',
              width: 48,
              height: 48,
            }}>
              <View style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: focused ? (isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)') : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Trophy 
                  color={color} 
                  size={22} 
                  strokeWidth={focused ? 2.5 : 2} 
                  fill={focused ? color : 'none'}
                />
              </View>
              {focused && (
                <View style={{
                  width: 4,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: activeTint,
                  marginTop: 2,
                  shadowColor: activeTint,
                  shadowOpacity: 0.6,
                  shadowRadius: 4,
                  shadowOffset: { width: 0, height: 0 },
                }} />
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused, color, size }: { focused: boolean; color: string; size: number }) => (
            <View style={{ 
              alignItems: 'center', 
              justifyContent: 'center',
              width: 48,
              height: 48,
            }}>
              <View style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: focused ? (isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)') : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <User 
                  color={color} 
                  size={22} 
                  strokeWidth={focused ? 2.5 : 2} 
                  fill={focused ? color : 'none'}
                />
              </View>
              {focused && (
                <View style={{
                  width: 4,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: activeTint,
                  marginTop: 2,
                  shadowColor: activeTint,
                  shadowOpacity: 0.6,
                  shadowRadius: 4,
                  shadowOffset: { width: 0, height: 0 },
                }} />
              )}
            </View>
          ),
        }}
      />
    </Tabs>
  );
}