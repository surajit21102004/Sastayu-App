import React from 'react';
import { View } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function ThemedView({
  style,
  type = 'background',
  ...otherProps
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const backgroundColor = Colors[colorScheme][type];

  return <View style={[{ backgroundColor }, style]} {...otherProps} />;
}
