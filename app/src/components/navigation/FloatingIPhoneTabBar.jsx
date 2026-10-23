import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { BrandColors } from '@/constants/theme';

export const FloatingIPhoneTabBar = ({ activeTab, onTabSelect, onSearchPress }) => {
  const tabs = [
    { id: 'home', label: 'Today', icon: '🏠' },
    { id: 'bookings', label: 'Bookings', icon: '📅' },
    { id: 'profile', label: 'Profile', icon: '👤' },
  ];

  return (
    <View style={styles.floatingContainer} pointerEvents="box-none">
      <View style={styles.islandRow}>
        {/* Apple iOS 18 Style Main Glass Pill Capsule (Image 5) */}
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

        {/* Apple iOS 18 Style Floating Circular Search Button (Image 5) */}
        <Pressable
          onPress={onSearchPress || (() => onTabSelect('home'))}
          style={({ pressed }) => [
            styles.searchCircleButton,
            pressed && styles.searchCirclePressed,
          ]}>
          <Text style={styles.searchIconText}>🔍</Text>
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
    gap: 10,
    paddingHorizontal: 16,
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
    gap: 4,
  },
  tabPill: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 26,
    minWidth: 70,
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
    fontSize: 18,
    opacity: 0.65,
    marginBottom: 2,
  },
  tabIconActive: {
    opacity: 1,
    transform: [{ scale: 1.08 }],
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    letterSpacing: -0.1,
  },
  tabLabelActive: {
    color: BrandColors.primaryBlue,
    fontWeight: '800',
  },
  searchCircleButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.95)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 10,
  },
  searchCirclePressed: {
    opacity: 0.75,
    transform: [{ scale: 0.94 }],
    backgroundColor: '#EFF6FF',
  },
  searchIconText: {
    fontSize: 18,
  },
  tabPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.96 }],
  },
});
