import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function ThemedText({
  style,
  themeColor = 'text',
  type = 'default',
  ...rest
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const color = Colors[colorScheme][themeColor];

  return (
    <Text
      style={[
        { color },
        type === 'default' ? styles.default : undefined,
        type === 'title' ? styles.title : undefined,
        type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
        type === 'subtitle' ? styles.subtitle : undefined,
        type === 'link' ? styles.link : undefined,
        type === 'linkPrimary' ? styles.linkPrimary : undefined,
        type === 'code' ? styles.code : undefined,
        type === 'small' ? styles.small : undefined,
        type === 'smallBold' ? styles.smallBold : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontSize: 16,
    lineHeight: 24,
  },
  defaultSemiBold: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  link: {
    lineHeight: 30,
    fontSize: 16,
    color: '#0a7ea4',
  },
  linkPrimary: {
    lineHeight: 30,
    fontSize: 16,
    color: '#1E40AF',
    fontWeight: '700',
  },
  code: {
    fontFamily: 'monospace',
    fontSize: 12,
    lineHeight: 16,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#EFF6FF',
    color: '#1E40AF',
  },
  small: {
    fontSize: 14,
    lineHeight: 20,
  },
  smallBold: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 'bold',
  },
});
