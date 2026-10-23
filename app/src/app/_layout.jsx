import React from 'react';
import { DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AuthProvider } from '@/context/AuthContext';
import { Slot } from 'expo-router';

SplashScreen.preventAutoHideAsync();

// Custom light theme enforcing Sastayu palette even if OS is in Dark Mode
const SastayuLightTheme = {
  ...DefaultTheme,
  dark: false,
  colors: {
    ...DefaultTheme.colors,
    primary: '#1E40AF',
    background: '#F8FAFC',
    card: '#FFFFFF',
    text: '#0F172A',
    border: '#E2E8F0',
    notification: '#FBBF24',
  },
};

export default function RootLayout() {
  return (
    <ThemeProvider value={SastayuLightTheme}>
      <StatusBar barStyle="light-content" backgroundColor="#1E40AF" translucent={false} />
      <AuthProvider>
        <AnimatedSplashOverlay />
        <Slot />
      </AuthProvider>
    </ThemeProvider>
  );
}
