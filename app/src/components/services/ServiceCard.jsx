import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { BrandColors } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

export const ServiceCard = ({
  service,
  onPress,
  onBook,
}) => {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.headerRow}>
        <View style={styles.titleInfo}>
          <Text style={styles.categoryBadge}>{service.categoryName?.toUpperCase()}</Text>
          <Text style={styles.title} numberOfLines={2}>
            {service.title}
          </Text>
        </View>

        {service.isPopular && (
          <Badge label="Bestseller" variant="yellow" />
        )}
      </View>

      <Text style={styles.shortDesc} numberOfLines={2}>
        {service.shortDesc}
      </Text>

      <View style={styles.metricsRow}>
        <View style={styles.ratingBox}>
          <Text style={styles.starIcon}>★</Text>
          <Text style={styles.ratingText}>{service.rating}</Text>
          <Text style={styles.reviewsCount}>({service.reviewsCount})</Text>
        </View>

        <View style={styles.dividerDot} />
        <Text style={styles.durationText}>⏱ {service.durationMinutes} mins</Text>

        <View style={styles.dividerDot} />
        <Text style={styles.warrantyText}>🛡 {service.warrantyDays}D Warranty</Text>
      </View>

      <View style={styles.footerRow}>
        <View style={styles.priceContainer}>
          <View style={styles.priceRow}>
            <Text style={styles.priceCurrency}>₹</Text>
            <Text style={styles.priceAmount}>{service.price}</Text>
            {service.originalPrice && (
              <Text style={styles.originalPrice}>₹{service.originalPrice}</Text>
            )}
          </View>
          <Text style={styles.taxLabel}>Standard visiting included</Text>
        </View>

        <Button
          title="Book Now"
          onPress={onBook}
          variant="primary"
          size="sm"
          style={styles.bookButton}
        />
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  pressed: {
    opacity: 0.95,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  titleInfo: {
    flex: 1,
    marginRight: 8,
  },
  categoryBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: BrandColors.primaryBlue,
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: BrandColors.navyText,
    lineHeight: 22,
  },
  shortDesc: {
    fontSize: 13,
    color: BrandColors.mutedText,
    lineHeight: 18,
    marginBottom: 12,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  ratingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  starIcon: {
    color: BrandColors.accentYellow,
    fontSize: 13,
    fontWeight: 'bold',
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '700',
    color: BrandColors.navyText,
  },
  reviewsCount: {
    fontSize: 11,
    color: BrandColors.mutedText,
  },
  dividerDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#CBD5E1',
    marginHorizontal: 8,
  },
  durationText: {
    fontSize: 12,
    color: BrandColors.mutedText,
    fontWeight: '500',
  },
  warrantyText: {
    fontSize: 12,
    color: BrandColors.primaryBlue,
    fontWeight: '600',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  priceContainer: {
    justifyContent: 'center',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  priceCurrency: {
    fontSize: 14,
    fontWeight: '700',
    color: BrandColors.navyText,
  },
  priceAmount: {
    fontSize: 20,
    fontWeight: '800',
    color: BrandColors.navyText,
  },
  originalPrice: {
    fontSize: 13,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
    marginLeft: 4,
  },
  taxLabel: {
    fontSize: 10,
    color: BrandColors.mutedText,
    marginTop: 1,
  },
  bookButton: {
    paddingHorizontal: 16,
  },
});
