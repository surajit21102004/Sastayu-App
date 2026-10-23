import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { BrandColors } from '@/constants/theme';
import { Badge } from '@/components/ui/Badge';

const getCategoryEmoji = (id) => {
  switch (id) {
    case 'ac-repair':
      return '❄️';
    case 'plumber':
    case 'plumbing':
      return '🔧';
    case 'electrician':
    case 'electrical':
      return '⚡';
    case 'cleaning':
      return '✨';
    case 'appliance':
    case 'appliances':
      return '🔲';
    case 'carpenter':
    case 'carpentry':
      return '🔨';
    case 'painter':
    case 'painting':
      return '🖌️';
    case 'pest-control':
      return '🪲';
    default:
      return '🛠️';
  }
};

export const CategoryCard = ({
  category,
  isSelected = false,
  onPress,
}) => {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        isSelected && styles.selectedCard,
        pressed && styles.pressed,
      ]}>
      {category.badge && (
        <View style={styles.badgeWrapper}>
          <Badge label={category.badge} variant={isSelected ? 'yellow' : 'light'} />
        </View>
      )}

      <View
        style={[
          styles.iconContainer,
          isSelected ? styles.selectedIconContainer : styles.unselectedIconContainer,
        ]}>
        <Text style={styles.emoji}>{getCategoryEmoji(category.id)}</Text>
      </View>

      <Text
        style={[styles.name, isSelected && styles.selectedName]}
        numberOfLines={2}>
        {category.name}
      </Text>

      <Text style={styles.solutionsText}>
        {category.solutionsCount}+ options
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 104,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    position: 'relative',
    marginRight: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  selectedCard: {
    borderColor: BrandColors.primaryBlue,
    backgroundColor: '#EFF6FF',
  },
  badgeWrapper: {
    position: 'absolute',
    top: -6,
    right: 4,
    zIndex: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  unselectedIconContainer: {
    backgroundColor: '#F8FAFC',
  },
  selectedIconContainer: {
    backgroundColor: BrandColors.accentYellow,
  },
  emoji: {
    fontSize: 22,
  },
  name: {
    fontSize: 12,
    fontWeight: '600',
    color: BrandColors.navyText,
    textAlign: 'center',
    marginBottom: 4,
    lineHeight: 15,
  },
  selectedName: {
    color: BrandColors.primaryBlue,
    fontWeight: '700',
  },
  solutionsText: {
    fontSize: 10,
    color: BrandColors.mutedText,
    fontWeight: '500',
  },
  pressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.9,
  },
});
