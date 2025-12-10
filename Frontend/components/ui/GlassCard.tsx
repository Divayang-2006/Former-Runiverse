import React from 'react';
import { View, Text, Pressable, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur'; //
import Animated, { FadeInDown, Layout } from 'react-native-reanimated'; //

interface GlassCardProps {
  children: React.ReactNode;
  title?: string; // Optional header
  subtitle?: string; // Optional sub-text (great for stats)
  variant?: 'default' | 'featured' | 'alert'; // Variants for coloring
  onPress?: () => void;
  className?: string;
  delay?: number; // Animation delay
  headerRight?: React.ReactNode; // Optional action slot
}

export const GlassCard = ({
  children,
  title,
  subtitle,
  variant = 'default',
  onPress,
  className = '',
  delay = 0,
  headerRight,
}: GlassCardProps) => {
  // Variant Styles
  const bgColors = {
    default: 'bg-slate-900/60',
    featured: 'bg-indigo-900/60', // Good for "Joinable Challenges"
    alert: 'bg-red-900/40',
  };

  const borderColors = {
    default: 'border-slate-700/50',
    featured: 'border-indigo-500/50',
    alert: 'border-red-500/50',
  };

  const Content = (
    <BlurView intensity={20} tint="dark" className="flex-1 p-4">
      {(title || subtitle) && (
        <View className="mb-3 flex-row items-center">
          <View className="flex-1 pr-3">
            {title && <Text className="text-slate-200 font-bold text-base">{title}</Text>}
            {subtitle && (
              <Text className="text-emerald-400 font-bold text-lg mt-0.5">{subtitle}</Text>
            )}
          </View>
          {headerRight ? <View className="ml-auto flex-row items-center">{headerRight}</View> : null}
        </View>
      )}
      <View>{children}</View>
    </BlurView>
  );

  return (
    <Animated.View
      entering={FadeInDown.delay(delay * 100).springify()}
      layout={Layout.springify()}
      className={`overflow-hidden rounded-2xl border mb-4 ${bgColors[variant]} ${borderColors[variant]} ${className}`}
    >
      {onPress ? (
        <Pressable android_ripple={{ color: 'rgba(255,255,255,0.1)' }} onPress={onPress}>
          {Content}
        </Pressable>
      ) : (
        Content
      )}
    </Animated.View>
  );
};
