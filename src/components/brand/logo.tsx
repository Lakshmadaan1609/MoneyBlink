import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { Palette, Spacing } from '@/theme';

/**
 * The BlinkMoney bolt, redrawn as a vector so it stays crisp at any size and can be
 * recoloured or animated. Matches the mark printed on the Future You hoodie.
 */
function BoltBase({ size = 32 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Defs>
        <LinearGradient id="boltFill" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor="#b6f58a" />
          <Stop offset="55%" stopColor={Palette.brand} />
          <Stop offset="100%" stopColor="#3fbf6a" />
        </LinearGradient>
      </Defs>
      <Path d="M38 4 L14 34 L28 34 L24 60 L50 28 L34 28 Z" fill="url(#boltFill)" />
    </Svg>
  );
}

export const Bolt = memo(BoltBase);

type LogoProps = {
  size?: number;
  /** Hides the wordmark, leaving just the mark. */
  markOnly?: boolean;
};

/** Full lockup: bolt plus the two-tone "BlinkMoney" wordmark. */
function LogoBase({ size = 28, markOnly }: LogoProps) {
  return (
    <View style={styles.row}>
      <Bolt size={size} />
      {markOnly ? null : (
        <ThemedText type="subtitle" style={{ fontSize: size * 0.72 }}>
          Blink
          <ThemedText type="subtitle" themeColor="brand" style={{ fontSize: size * 0.72 }}>
            Money
          </ThemedText>
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
});

export const Logo = memo(LogoBase);
