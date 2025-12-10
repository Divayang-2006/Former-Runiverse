import React from 'react';
import { View, StatusBar, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context'; //
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';

interface ScreenWrapperProps {
  children: React.ReactNode;
  bg?: string;
  unsafe?: boolean; // If true, content goes behind status bar (good for maps)
}

export const ScreenWrapper = ({
  children,
  bg = 'bg-slate-950',
  unsafe = false,
}: ScreenWrapperProps) => {
  const insets = useSafeAreaInsets();

  // Base padding logic to prevent overlaps
  const containerStyle = {
    paddingTop: unsafe ? 0 : insets.top*0.1,
    paddingBottom: unsafe ? 0 : insets.bottom,
    paddingLeft: insets.left,
    paddingRight: insets.right,
  };

  return (
    <View className={`flex-1 ${bg}`} style={containerStyle}>
      <ExpoStatusBar style="light" />
      {children}
    </View>
  );
};
