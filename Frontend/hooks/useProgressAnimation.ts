import { useEffect, useRef } from "react";
import { Animated } from "react-native";

/**
 * Smoothly animates progress changes for bars or loaders.
 * @param value - current progress (0–100)
 * @returns animatedValue (use with style: { width: animatedValue.interpolate(...) })
 */
export const useProgressAnimation = (value: number) => {
  const animatedValue = useRef(new Animated.Value(value)).current;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: value,
      duration: 700,
      useNativeDriver: false,
    }).start();
  }, [value]);

  return animatedValue;
};
