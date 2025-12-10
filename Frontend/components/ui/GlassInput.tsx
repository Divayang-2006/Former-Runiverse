import React from 'react';
import { TextInput, TextInputProps, View, Text } from 'react-native';

interface GlassInputProps extends TextInputProps {
  label?: string;
  icon?: React.ReactNode; // For Ionicons or Lucide icons
}

export const GlassInput = ({ label, icon, ...props }: GlassInputProps) => {
  return (
    <View className="mb-4">
      {label && <Text className="text-slate-400 mb-2 text-sm font-medium ml-1">{label}</Text>}
      <View className="flex-row items-center bg-slate-800/80 border border-slate-700 rounded-xl px-4 h-14 focus:border-emerald-500">
        {icon && <View className="mr-3 opacity-70">{icon}</View>}
        <TextInput
          placeholderTextColor="#64748b"
          className="flex-1 text-white text-base"
          {...props}
        />
      </View>
    </View>
  );
};
