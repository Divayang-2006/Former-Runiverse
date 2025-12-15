import React from 'react';
import { View, TextInput, TextInputProps } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// By extending `TextInputProps`, we can accept all the standard props
// for a `TextInput` component, including `keyboardType` and `secureTextEntry`.
interface CustomInputProps extends TextInputProps {
  iconName: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
}

export default function CustomInput({
  iconName,
  ...rest // Use the 'rest' operator to gather all other props
}: CustomInputProps) {
  return (
    <View className="flex-row items-center bg-input-bg rounded-lg p-3 my-2 border-2 border-transparent focus-within:border-primary-green">
      <MaterialCommunityIcons
        name={iconName}
        size={22}
        color="#8E8E93" // text-secondary
        style={{ marginRight: 10 }}
      />
      <TextInput
        className="flex-1 text-text-primary text-base"
        placeholderTextColor="#8E8E93" // text-secondary
        {...rest} // Pass all other props down to the underlying TextInput
      />
    </View>
  );
}