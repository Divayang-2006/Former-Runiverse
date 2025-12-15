import React, { useState } from 'react';
import { TextInput, TextInputProps } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, interpolateColor } from 'react-native-reanimated';
import { useTheme } from '../context/ThemeContext';

// By extending `TextInputProps`, we can accept all the standard props
// for a `TextInput` component, including `keyboardType` and `secureTextEntry`.
interface CustomInputProps extends TextInputProps {
  iconName: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
}

export default function CustomInput({
  iconName,
  style,
  ...rest // Use the 'rest' operator to gather all other props
}: CustomInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const focusProgress = useSharedValue(0);
  const { colors, isDark } = useTheme();

  const placeholderColor = isDark ? colors.text.tertiary : colors.text.secondary;
  const baseBorderColor = isDark ? colors.border.medium : colors.border.light;
  const activeBorderColor = colors.status.success;
  const backgroundColor = isDark ? colors.background.elevated : colors.background.tertiary;
  const iconIdleColor = isDark ? colors.text.tertiary : '#8E8E93';

  const containerStyle = useAnimatedStyle(() => {
    const borderColor = interpolateColor(
      focusProgress.value,
      [0, 1],
      [baseBorderColor, activeBorderColor]
    );

    return {
      borderColor,
      transform: [{ scale: withTiming(isFocused ? 1.01 : 1, { duration: 200 }) }],
    };
  }, [baseBorderColor, activeBorderColor, isFocused]);

  const handleFocus = () => {
    setIsFocused(true);
    focusProgress.value = withTiming(1, { duration: 200 });
  };

  const handleBlur = () => {
    setIsFocused(false);
    focusProgress.value = withTiming(0, { duration: 200 });
  };

  return (
    <Animated.View
      style={[containerStyle, { backgroundColor, borderWidth: 2 }]}
      className="flex-row items-center rounded-xl p-4 my-2 shadow-sm"
    >
      <MaterialCommunityIcons
        name={iconName}
        size={22}
        color={isFocused ? activeBorderColor : iconIdleColor}
        style={{ marginRight: 12 }}
      />
      <TextInput
        className="flex-1 text-base"
        style={[{ color: colors.text.primary }, style]}
        placeholderTextColor={placeholderColor}
        selectionColor={activeBorderColor}
        onFocus={handleFocus}
        onBlur={handleBlur}
        {...rest} // Pass all other props down to the underlying TextInput
      />
    </Animated.View>
  );
}