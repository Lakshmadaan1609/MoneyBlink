import { memo, type ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { Palette, Radius, Spacing } from '@/theme';

type CardProps = {
  children: ReactNode;
  /** `accent` outlines the card in brand green for the one thing that matters most. */
  variant?: 'default' | 'accent' | 'flat' | 'danger';
  style?: ViewStyle;
  padded?: boolean;
};

function CardBase({ children, variant = 'default', style, padded = true }: CardProps) {
  return (
    <View style={[styles.base, padded && styles.padded, styles[variant], style]}>{children}</View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  padded: { padding: Spacing.four },
  default: {
    backgroundColor: Palette.bgCard,
    borderColor: Palette.border,
  },
  accent: {
    backgroundColor: Palette.bgCard,
    borderColor: Palette.brand,
  },
  flat: {
    backgroundColor: Palette.bgChip,
    borderColor: 'transparent',
  },
  danger: {
    backgroundColor: Palette.bgCard,
    borderColor: Palette.error,
  },
});

export const Card = memo(CardBase);
