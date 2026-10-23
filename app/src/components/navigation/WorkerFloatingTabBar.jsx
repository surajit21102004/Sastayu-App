import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { BrandColors } from '@/constants/theme';

export const WorkerFloatingTabBar = ({ activeTab, onTabSelect, onQuickAction }) => {
  const tabs = [
    { id: 'home', label: 'Home', icon: '🏠' },
    { id: 'bookings', label: 'Bookings', icon: '📅' },
    { id: 'earnings', label: 'Earnings', icon: '👛' },
    { id: 'profile', label: 'Profile', icon: '👤' },
  ];

  return (
    <View style={styles.floatingContainer} pointerEvents="box-none">
      <View style={styles.islandRow}>
        {/* Apple iOS Floating Glass Capsule for Worker */}
        <View style={styles.mainGlassCapsule}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <Pressable
                key={tab.id}
                onPress={() => onTabSelect(tab.id)}
                style={({ pressed }) => [
                  styles.tabPill,
                  isActive && styles.tabPillActive,
                  pressed && styles.tabPressed,
                ]}>
                <Text style={[styles.tabIcon, isActive && styles.tabIconActive]}>
                  {tab.icon}
                </Text>
                <Text
                  style={[
                    styles.tabLabel,
                    isActive && styles.tabLabelActive,
                  ]}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Floating Quick Action Button */}
        <Pressable
          onPress={onQuickAction || (() => onTabSelect('home'))}
          style={({ pressed }) => [
            styles.actionCircleButton,
            pressed && styles.actionCirclePressed,
          ]}>
          <Text style={styles.actionIconText}>⚡</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  floatingContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 24 : 16,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  islandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 12,
  },
  mainGlassCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 36,
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.95)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 10,
    gap: 2,
  },
  tabPill: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 24,
    minWidth: 62,
    backgroundColor: 'transparent',
  },
  tabPillActive: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    shadowColor: '#1E40AF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  tabIcon: {
    fontSize: 17,
    opacity: 0.65,
    marginBottom: 2,
  },
  tabIconActive: {
    opacity: 1,
    transform: [{ scale: 1.08 }],
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    letterSpacing: -0.1,
  },
  tabLabelActive: {
    color: BrandColors.primaryBlue,
    fontWeight: '800',
  },
  actionCircleButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FBBF24',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F59E0B',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  actionCirclePressed: {
    opacity: 0.75,
    transform: [{ scale: 0.94 }],
  },
  actionIconText: {
    fontSize: 18,
    color: '#0F172A',
    fontWeight: 'bold',
  },
  tabPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.96 }],
  },
});
